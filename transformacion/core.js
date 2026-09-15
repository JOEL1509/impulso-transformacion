/* Pure fitness calculations. Dates are local YYYY-MM-DD strings; storage/UI are external.
 * profile: age, sex ('male'/'female'), heightCm, initialWeightKg, activityFactor,
 *   goal ('fat_loss'/'maintain'), calorieTarget?, proteinPerKg?, fatPerKg?, programStart?,
 *   dietStart?, lastDeload?, lastDietBreak?, deloadWeeks?, dietBreakWeeks?.
 * weights: [{date, weightKg}]; checkins: [{date, calories: boolean, training: boolean}].
 * sessions: [{id,date,startedAt,finishedAt,status:'completed',routineName,deload?,
 *   exercises:[{id,name,type:'strength'|'isometric'|'cardio',muscles:[],loadMultiplier?:1,
 *     sets:[{completed:true,type:'N'|'W'|'D'|'S',weightKg,reps,rpe?,rir?,durationSeconds?,restSeconds?}]}]}].
 * All outputs are new objects. No calculation changes a target, routine, or user data.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FitnessCore = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DAY = 86400000;
  const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  const number = (value, fallback = 0) => finite(value) ? Number(value) : fallback;
  const positive = value => finite(value) && Number(value) > 0;
  const rounded = (value, digits = 2) => Math.round((value + Number.EPSILON) * 10 ** digits) / 10 ** digits;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const array = value => Array.isArray(value) ? value : [];
  const yes = value => value === true || value === 1 || ['yes', 'si', 'sí', 'true'].includes(String(value).toLowerCase());
  const text = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  function dayKey(value) {
    if (arguments.length === 0) value = new Date();
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const stamp = Date.parse(value + 'T12:00:00Z');
      return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === value ? value : null;
    }
    if (value === null || value === '' || value === undefined) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  const ordinal = value => { const key = dayKey(value); return key ? Date.parse(key + 'T12:00:00Z') / DAY : NaN; };
  const offset = (value, days) => Number.isFinite(ordinal(value)) ? new Date((ordinal(value) + days) * DAY).toISOString().slice(0, 10) : null;
  const dateOf = value => dayKey(value && (value.date || value.day || value.finishedAt || value.startedAt));
  const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const lossGoal = profile => ['fat_loss', 'loss', 'perder_grasa', 'perdida_grasa', 'perdida de grasa'].includes(text(profile.goal));

  function weightRecords(weights, asOf) {
    const end = dayKey(asOf);
    const records = new Map();
    array(weights).forEach(entry => {
      const date = dateOf(entry);
      const weightKg = number(entry.weightKg ?? entry.weight, NaN);
      if (date && end && date <= end && weightKg > 0 && weightKg <= 600) records.set(date, { date, weightKg });
    });
    return [...records.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  function rollingWeight(weights, asOf = new Date()) {
    const to = dayKey(asOf), from = offset(to, -6);
    const records = weightRecords(weights, to).filter(entry => entry.date >= from);
    const average = mean(records.map(entry => entry.weightKg));
    return { average: average === null ? null : rounded(average, 3), averageKg: average === null ? null : rounded(average, 3), count: records.length, days: 7, from, to, records };
  }

  function calories(profile = {}, weight) {
    const age = number(profile.age, NaN);
    const height = number(profile.heightCm ?? profile.height, NaN);
    const kg = number(weight ?? profile.averageWeightKg ?? profile.initialWeightKg ?? profile.weightKg ?? profile.weight, NaN);
    const sex = text(profile.sex);
    const coefficient = ['male', 'm', 'masculino', 'hombre'].includes(sex) ? 5 : ['female', 'f', 'femenino', 'mujer'].includes(sex) ? -161 : null;
    const activity = number(profile.activityFactor ?? profile.activity, 1.375);
    if (!(age >= 18 && age <= 100 && height >= 100 && height <= 250 && kg >= 30 && kg <= 400 && activity >= 1 && activity <= 2.5) || coefficient === null) {
      return { valid: false, reason: 'Completa los datos válidos de un perfil adulto para calcular esta estimación.' };
    }
    const ree = 10 * kg + 6.25 * height - 5 * age + coefficient;
    const tdee = Math.round(ree * activity);
    const deficit = clamp(number(profile.deficitPercent, 15), 0, 25) / 100;
    const target = Math.round(positive(profile.calorieTarget) ? Number(profile.calorieTarget) : tdee * (lossGoal(profile) ? 1 - deficit : 1));
    const proteinGrams = Math.round(kg * clamp(number(profile.proteinPerKg, 1.8), 0.8, 2.4));
    const fatGrams = Math.round(kg * clamp(number(profile.fatPerKg, 0.8), 0.4, 1.5));
    const remainder = target - proteinGrams * 4 - fatGrams * 9;
    return { valid: true, estimated: true, weightKg: kg, ree: rounded(ree), bmr: rounded(ree), activityFactor: activity, tdee, target, targetCalories: target, proteinGrams, fatGrams, carbsGrams: remainder >= 0 ? Math.round(remainder / 4) : null, macrosValid: remainder >= 0, reason: remainder >= 0 ? 'Estimación Mifflin–St Jeor; el objetivo se aplica cuando tú lo confirmes.' : 'El objetivo no alcanza para los macros seleccionados; revisa su configuración.' };
  }

  const completed = set => set && (yes(set.completed) || yes(set.done));
  const setType = set => String(set.type || set.kind || 'N').toUpperCase();
  const exerciseType = exercise => ['cardio', 'isometric', 'isometrico'].includes(text(exercise.type)) ? text(exercise.type) : 'strength';
  const setsOf = exercise => array(exercise.sets).filter(completed);
  const normalSets = exercise => setsOf(exercise).filter(set => ['N', 'NORMAL', 'WORK', 'WORKING'].includes(setType(set)));
  const weightOf = set => Math.max(0, number(set.weightKg ?? set.weight ?? set.load));
  const repsOf = set => Math.max(0, Math.floor(number(set.reps)));
  function isSessionComplete(session) {
    return Boolean(session && (['completed', 'finished', 'completado'].includes(text(session.status)) || yes(session.completed) || (session.finishedAt && !['active', 'cancelled', 'canceled'].includes(text(session.status)))));
  }
  function validSets(exercise) {
    return setsOf(exercise).filter(set => exerciseType(exercise) === 'strength' ? repsOf(set) > 0 : number(set.durationSeconds ?? set.seconds) > 0);
  }
  const exercisesOf = session => array(session.exercises);
  function epley(set) {
    const reps = repsOf(set), kg = weightOf(set);
    if (!(kg > 0 && reps >= 1 && reps <= 10)) return null;
    return reps === 1 ? kg : kg * (1 + reps / 30);
  }

  function sessionMetrics(session = {}) {
    let totalVolumeKg = 0, workingVolumeKg = 0, totalSets = 0, workingSets = 0, totalReps = 0;
    let cardioSeconds = 0, isometricSeconds = 0, tutSeconds = 0, restSeconds = 0, restCount = 0;
    const muscles = new Set(), exerciseSummaries = [];
    exercisesOf(session).forEach(exercise => {
      const sets = validSets(exercise);
      if (!sets.length) return;
      const kind = exerciseType(exercise);
      const multiplier = positive(exercise.loadMultiplier) ? Number(exercise.loadMultiplier) : 1;
      let volume = 0, bestEstimated1RM = null;
      sets.forEach(set => {
        totalSets++;
        const isWarmup = ['W', 'WARMUP'].includes(setType(set));
        if (!isWarmup) workingSets++;
        if (kind === 'strength') {
          const reps = repsOf(set), load = weightOf(set) * multiplier * reps;
          volume += load; totalVolumeKg += load; totalReps += reps;
          if (!isWarmup) workingVolumeKg += load;
          if (!isWarmup && !['D', 'DROP', 'DROPSET'].includes(setType(set))) {
            const estimate = epley(set);
            if (estimate !== null) bestEstimated1RM = Math.max(bestEstimated1RM || 0, estimate);
          }
          tutSeconds += Math.max(0, number(set.tutSeconds ?? set.durationSeconds));
        } else if (kind === 'cardio') cardioSeconds += Math.max(0, number(set.durationSeconds ?? set.seconds));
        else { const seconds = Math.max(0, number(set.durationSeconds ?? set.seconds)); isometricSeconds += seconds; tutSeconds += seconds; }
        if (finite(set.restSeconds) && Number(set.restSeconds) >= 0) { restSeconds += Number(set.restSeconds); restCount++; }
      });
      (Array.isArray(exercise.muscles) ? exercise.muscles : String(exercise.muscles || exercise.muscle || '').split(',')).map(item => String(item).trim()).filter(Boolean).forEach(item => muscles.add(item));
      exerciseSummaries.push({ id: exercise.id, name: exercise.name || '', type: kind, sets: sets.length, volumeKg: rounded(volume), estimated1RM: bestEstimated1RM === null ? null : rounded(bestEstimated1RM) });
    });
    const start = new Date(session.startedAt).getTime(), finish = new Date(session.finishedAt).getTime();
    const durationSeconds = Number.isFinite(start) && Number.isFinite(finish) && finish >= start ? Math.round((finish - start) / 1000) : Math.max(0, number(session.durationSeconds));
    return { routineName: session.routineName || session.name || 'Entrenamiento', date: dateOf(session), durationSeconds, totalVolumeKg: rounded(totalVolumeKg), workingVolumeKg: rounded(workingVolumeKg), totalSets, workingSets, totalReps, exercisesCompleted: exerciseSummaries.length, muscles: [...muscles], cardioSeconds, isometricSeconds, tutSeconds, restSeconds: rounded(restSeconds), averageRestSeconds: restCount ? rounded(restSeconds / restCount) : null, exerciseSummaries };
  }

  function progression(exercise = {}, sessions = []) {
    const kind = exerciseType(exercise);
    const result = { action: 'maintain', applied: false, suggestedWeightKg: null, suggestedReps: [], reason: '', sessionsUsed: 0 };
    if (kind !== 'strength') return { ...result, action: 'duration', reason: 'Progresa mediante la duración o distancia de este ejercicio; no se aplica aumento automático de carga.' };
    const min = Math.max(1, Math.floor(number(exercise.repMin ?? exercise.minReps, 8)));
    const max = Math.max(min, Math.floor(number(exercise.repMax ?? exercise.maxReps, 12)));
    const targetSets = Math.max(1, Math.floor(number(exercise.setsTarget ?? exercise.targetSets ?? (typeof exercise.sets === 'number' ? exercise.sets : undefined), 3)));
    const targetRpe = clamp(number(exercise.targetRpe, 8), 5, 10);
    const increment = positive(exercise.incrementKg) ? Number(exercise.incrementKg) : 2.5;
    const history = array(sessions).filter(session => isSessionComplete(session) && !session.deload).map(session => ({
      date: dateOf(session), exercise: exercisesOf(session).find(item => exercise.id ? item.id === exercise.id : item.name === exercise.name)
    })).filter(item => item.date && item.exercise && exerciseType(item.exercise) === 'strength').sort((a, b) => b.date.localeCompare(a.date));
    const unique = history.filter((item, index) => history.findIndex(other => other.date === item.date) === index).slice(0, 2);
    result.sessionsUsed = unique.length;
    if (!unique.length) return { ...result, action: 'collect_data', reason: 'Completa una sesión para recibir una propuesta basada en tu registro.' };
    const latest = normalSets(unique[0].exercise).filter(set => repsOf(set) > 0).slice(0, targetSets);
    if (latest.length < targetSets) return { ...result, action: 'collect_data', reason: 'Completa las series normales previstas para evaluar la progresión.' };
    const load = weightOf(latest[0]);
    if (!latest.every(set => weightOf(set) === load)) return { ...result, action: 'review_loads', reason: 'Las series usan cargas distintas; ajusta cada serie por separado.' };
    result.suggestedWeightKg = load;
    result.suggestedReps = latest.map(set => Math.max(min, Math.min(max, repsOf(set) + 1)));
    const highEffort = latest.some(set => (finite(set.rpe) && number(set.rpe) > targetRpe) || (finite(set.rir) && number(set.rir) < 10 - targetRpe));
    if (highEffort) return { ...result, suggestedReps: latest.map(repsOf), reason: 'Mantén la carga y revisa tu esfuerzo antes de aumentar.' };
    const reachesTop = sets => sets.length === targetSets && sets.every(set => repsOf(set) >= max && weightOf(set) === load);
    const comfortable = sets => sets.every(set => finite(set.rpe) ? number(set.rpe) <= targetRpe : finite(set.rir) && number(set.rir) >= 10 - targetRpe);
    if (!reachesTop(latest)) return { ...result, action: 'increase_reps', reason: `Mantén la carga e intenta subir repeticiones dentro del rango ${min}–${max}.` };
    const previous = unique[1] ? normalSets(unique[1].exercise).filter(set => repsOf(set) > 0).slice(0, targetSets) : [];
    if (reachesTop(previous) && comfortable(latest) && comfortable(previous)) {
      return { ...result, action: 'increase_weight', suggestedWeightKg: rounded(load + increment), suggestedReps: latest.map(() => min), reason: 'Alcanzaste el máximo del rango en dos sesiones con esfuerzo adecuado. Puedes probar el siguiente incremento disponible.' };
    }
    if (!comfortable(latest)) return { ...result, action: 'confirm_effort', reason: 'Registra RPE o RIR para confirmar el esfuerzo antes de sugerir más carga.' };
    return { ...result, reason: 'Repite el máximo del rango con esta carga en otra sesión antes de subirla.' };
  }

  function recoveryReview(sessions, asOf) {
    const end = dayKey(asOf), start = offset(end, -27), byExercise = new Map();
    array(sessions).filter(session => isSessionComplete(session) && !session.deload && dateOf(session) >= start && dateOf(session) <= end).forEach(session => {
      exercisesOf(session).forEach(exercise => {
        if (exerciseType(exercise) !== 'strength') return;
        const scores = normalSets(exercise).map(epley).filter(value => value !== null);
        if (!scores.length) return;
        const key = exercise.id || exercise.name;
        if (!key) return;
        if (!byExercise.has(key)) byExercise.set(key, { name: exercise.name || key, records: new Map() });
        const records = byExercise.get(key).records, date = dateOf(session);
        records.set(date, Math.max(records.get(date) || 0, ...scores));
      });
    });
    const stalled = [];
    byExercise.forEach(group => {
      const records = [...group.records].sort((a, b) => a[0].localeCompare(b[0]));
      if (records.length < 3 || ordinal(records[records.length - 1][0]) - ordinal(records[0][0]) < 14) return;
      const first = records[0][1];
      if (records.slice(1).every(record => record[1] <= first * 1.01)) stalled.push(group.name);
    });
    return { suggested: stalled.length > 0, exercises: stalled, reason: stalled.length ? 'La fuerza registrada no mejora durante al menos dos semanas. Revisa descanso, esfuerzo y recuperación; puedes adelantar una descarga.' : 'Sin señal suficiente de estancamiento de fuerza.' };
  }

  function decision(state = {}, asOf = new Date()) {
    const end = dayKey(asOf), profile = state.profile || {};
    const base = { action: 'insufficient_data', applied: false, suggestedCalories: null, deltaCalories: 0, reason: '', trend: null, recovery: recoveryReview(state.sessions, end) };
    if (!end) return { ...base, reason: 'La fecha de evaluación no es válida.' };
    const records = weightRecords(state.weights, end).filter(record => record.date >= offset(end, -27));
    if (records.length < 8 || ordinal(records[records.length - 1]?.date) - ordinal(records[0]?.date) < 14) {
      return { ...base, reason: 'Necesitas al menos 14 días reales entre el primer y último pesaje y varios registros cada semana.' };
    }
    const firstDay = records[0].date, lastDay = records[records.length - 1].date;
    if (ordinal(end) - ordinal(lastDay) > 3) return { ...base, reason: 'Actualiza los pesajes recientes antes de evaluar la tendencia.' };
    const first = records.filter(record => record.date <= offset(firstDay, 6));
    const last = records.filter(record => record.date >= offset(lastDay, -6));
    const maxGap = Math.max(...records.slice(1).map((record, index) => ordinal(record.date) - ordinal(records[index].date)));
    if (first.length < 4 || last.length < 4 || maxGap > 7) return { ...base, reason: 'Faltan pesajes distribuidos: registra al menos cuatro días por semana y evita huecos de más de siete días.' };
    const firstAverage = mean(first.map(record => record.weightKg)), lastAverage = mean(last.map(record => record.weightKg));
    const elapsedWeeks = (mean(last.map(record => ordinal(record.date))) - mean(first.map(record => ordinal(record.date)))) / 7;
    const lossPercent = (firstAverage - lastAverage) / firstAverage * 100 / elapsedWeeks;
    const coverageDays = ordinal(lastDay) - ordinal(firstDay);
    const fullWeeks = Math.min(4, Math.floor((coverageDays + 1) / 7));
    const checks = array(state.checkins || state.checkIns).filter(check => dateOf(check) <= end);
    let goodAdherence = true;
    for (let week = 0; week < fullWeeks; week++) {
      const weekEnd = offset(lastDay, -week * 7), weekStart = offset(weekEnd, -6);
      const check = checks.filter(item => dateOf(item) >= weekStart && dateOf(item) <= weekEnd).sort((a, b) => dateOf(b).localeCompare(dateOf(a)))[0];
      if (!check || !yes(check.calories ?? check.calorieAdherence) || !yes(check.training ?? check.trainingAdherence)) goodAdherence = false;
    }
    base.trend = { from: firstDay, to: lastDay, coverageDays, count: records.length, firstAverage: rounded(firstAverage, 3), lastAverage: rounded(lastAverage, 3), elapsedWeeks: rounded(elapsedWeeks, 3), lossPercentPerWeek: rounded(lossPercent, 4), goodAdherence };
    const adjustment = dayKey(state.lastAdjustmentAt || profile.lastAdjustmentAt);
    if (adjustment && ordinal(end) - ordinal(adjustment) < 14) return { ...base, action: 'cooldown', reason: 'Espera 14 días después del último ajuste para volver a evaluar el objetivo.' };
    if (!lossGoal(profile)) return { ...base, action: base.recovery.suggested ? 'review_recovery' : 'maintain', reason: base.recovery.suggested ? base.recovery.reason : 'Tu objetivo es mantener; no se aplica una reducción por falta de pérdida de peso.' };
    if (profile.dietPhase === 'break') return { ...base, action: 'maintain', reason: 'Estás en una pausa de dieta; conserva el mantenimiento planificado.' };
    const calculation = calories(profile, lastAverage);
    if (!calculation.valid) return { ...base, action: 'review_profile', reason: calculation.reason };
    const threshold = clamp(number(profile.slowLossThreshold, 0.35), 0.1, 0.9);
    const adjustmentSize = clamp(number(profile.calorieAdjustment, 150), 50, 300);
    if (lossPercent > 1) return { ...base, action: 'increase_calories', suggestedCalories: calculation.target + adjustmentSize, deltaCalories: adjustmentSize, reason: 'La tendencia supera el 1 % de pérdida semanal. Puedes revisar una pequeña subida de calorías.' };
    if (base.recovery.suggested) return { ...base, action: 'review_recovery', reason: base.recovery.reason };
    if (lossPercent < threshold && !goodAdherence) return { ...base, action: 'review_adherence', reason: 'Revisa o completa la adherencia de estas semanas antes de reducir calorías.' };
    if (lossPercent < threshold) {
      const target = calculation.target - adjustmentSize;
      if (target < Math.max(1200, number(profile.minimumCalories, 1200))) return { ...base, action: 'review_nutrition', reason: 'El ajuste quedaría por debajo del límite conservador de la app. Revisa el objetivo de alimentación de forma individual.' };
      return { ...base, action: 'decrease_calories', suggestedCalories: target, deltaCalories: -adjustmentSize, reason: `La tendencia está por debajo del ${String(threshold).replace('.', ',')} % semanal con buena adherencia. Puedes revisar una pequeña reducción.` };
    }
    return { ...base, action: 'maintain', reason: 'La tendencia está dentro del rango configurado. Mantén el objetivo y continúa registrando.' };
  }

  function streak(sessions = [], restDays = [], asOf = new Date()) {
    const end = dayKey(asOf);
    const workouts = new Set(array(sessions).filter(session => isSessionComplete(session) && exercisesOf(session).some(exercise => validSets(exercise).length)).map(dateOf).filter(date => date && end && date <= end));
    const rests = new Set(array(restDays).map(item => dayKey(typeof item === 'object' && item ? item.date || item.day : item)).filter(date => date && end && date <= end && !workouts.has(date)));
    const activeDates = new Set([...workouts, ...rests]);
    let cursor = activeDates.has(end) ? end : offset(end, -1), continuityDays = 0, streakTrainingDays = 0, streakRestDays = 0;
    while (cursor && activeDates.has(cursor)) {
      continuityDays++;
      if (workouts.has(cursor)) streakTrainingDays++; else streakRestDays++;
      cursor = offset(cursor, -1);
    }
    if (!streakTrainingDays) { continuityDays = 0; streakRestDays = 0; }
    return { streak: continuityDays, continuityDays, streakTrainingDays, streakRestDays, trainingDays: workouts.size, totalTrainingDays: workouts.size, restDays: rests.size, trainedToday: workouts.has(end), restingToday: rests.has(end), workoutDates: [...workouts].sort(), restDates: [...rests].sort() };
  }

  function schedule(profile = {}, asOf = new Date()) {
    const end = dayKey(asOf);
    const deloadWeeks = clamp(Math.round(number(profile.deloadWeeks, 6)), 5, 6);
    const dietBreakWeeks = clamp(Math.round(number(profile.dietBreakWeeks, 9)), 8, 10);
    const make = (start, intervalWeeks) => {
      const date = offset(start, intervalWeeks * 7);
      return date ? { date, intervalWeeks, due: date <= end, daysUntil: ordinal(date) - ordinal(end), applied: false } : null;
    };
    return { deload: make(profile.lastDeload || profile.programStart, deloadWeeks), dietBreak: lossGoal(profile) ? make(profile.lastDietBreak || profile.dietStart || profile.programStart, dietBreakWeeks) : null };
  }

  function portion(food = {}, grams) {
    if (!finite(grams) || Number(grams) < 0) return { valid: false, reason: 'Introduce una porción en gramos igual o mayor que cero.' };
    const per = food.per100g || food;
    const kcal = number(per.calories ?? per.kcal ?? per.caloriesPer100g, NaN);
    const protein = number(per.protein ?? per.proteinGrams ?? per.proteinPer100g, NaN);
    const carbs = number(per.carbs ?? per.carbsGrams ?? per.carbsPer100g, 0);
    const fat = number(per.fat ?? per.fatGrams ?? per.fatPer100g, 0);
    if (![kcal, protein, carbs, fat].every(value => Number.isFinite(value) && value >= 0)) return { valid: false, reason: 'Completa los valores nutricionales por 100 g del alimento.' };
    const factor = Number(grams) / 100;
    return { valid: true, name: food.name || '', grams: Number(grams), calories: rounded(kcal * factor), proteinGrams: rounded(protein * factor), carbsGrams: rounded(carbs * factor), fatGrams: rounded(fat * factor), cost: finite(food.pricePerKg) && Number(food.pricePerKg) >= 0 ? rounded(Number(food.pricePerKg) * Number(grams) / 1000) : null, currency: food.currency || '' };
  }

  function supplementDays(supplement = {}, asOf = new Date()) {
    const end = dayKey(asOf), stockDate = dayKey(supplement.stockDate);
    const consumed = array(supplement.consumptions).filter(item => dateOf(item) && dateOf(item) <= end && (!stockDate || dateOf(item) >= stockDate)).reduce((sum, item) => sum + Math.max(0, number(item.grams)), 0);
    const remainingGrams = Math.max(0, finite(supplement.remainingGrams) ? Number(supplement.remainingGrams) : number(supplement.totalGrams) - consumed);
    const dailyGrams = Math.max(0, number(supplement.dailyGrams ?? supplement.doseGrams));
    if (!dailyGrams) return { remainingGrams: rounded(remainingGrams), dailyGrams, daysRemaining: null, fullDoses: null, depletionDate: null, replenishmentDate: null, lowStock: false, reason: 'Configura tu consumo diario para estimar la duración.' };
    const days = remainingGrams / dailyGrams;
    return { remainingGrams: rounded(remainingGrams), dailyGrams, daysRemaining: rounded(days, 1), fullDoses: Math.floor(days), depletionDate: offset(end, Math.max(0, Math.ceil(days) - 1)), replenishmentDate: offset(end, Math.floor(days)), lowStock: days <= number(supplement.warningDays, 7), reason: 'Estimación según existencias y consumo configurado; no descuenta dosis que no registraste.' };
  }

  return Object.freeze({ dayKey, rollingWeight, calories, decision, progression, sessionMetrics, streak, schedule, portion, supplementDays });
}));
