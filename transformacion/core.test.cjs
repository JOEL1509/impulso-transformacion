'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('./core.js');
const addDay = (date, n) => new Date(Date.parse(date + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const profile = { age: 30, sex: 'male', heightCm: 180, initialWeightKg: 80, activityFactor: 1.55, goal: 'fat_loss', calorieTarget: 2300 };
const set = (weightKg = 20, reps = 10, extra = {}) => ({ completed: true, type: 'N', weightKg, reps, rpe: 8, ...extra });
const session = (date, sets = [set()], extra = {}) => ({ id: date, date, status: 'completed', routineName: 'Torso', exercises: [{ id: 'press', name: 'Press', muscles: ['Pecho', 'Tríceps'], sets }], ...extra });
const stateFor = (lossPercent = 0.5, days = 22) => {
  const start = '2026-08-01';
  return { profile: { ...profile }, weights: Array.from({ length: days }, (_, i) => ({ date: addDay(start, i), weightKg: 80 - 80 * lossPercent / 100 * i / 7 })), checkins: Array.from({ length: 4 }, (_, i) => ({ date: addDay(start, 6 + i * 7), calories: true, training: true })), sessions: [] };
};

test('UMD exposes the same API in a browser without CommonJS', () => {
  const sandbox = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('./core.js'), 'utf8'), sandbox);
  assert.equal(typeof sandbox.FitnessCore.decision, 'function');
});
test('calendar dates reject impossible dates and preserve date-only strings', () => {
  assert.equal(core.dayKey('2026-09-14'), '2026-09-14');
  assert.equal(core.dayKey('2026-02-29'), null);
  assert.equal(core.dayKey('2024-02-29'), '2024-02-29');
  assert.equal(core.dayKey('nonsense'), null);
});
test('Mifflin formula and rounding use kg/cm and the selected coefficient', () => {
  const male = core.calories({ ...profile, goal: 'maintain', calorieTarget: null }, 80);
  assert.equal(male.ree, 1780); assert.equal(male.tdee, 2759); assert.equal(male.target, 2759);
  const female = core.calories({ ...profile, sex: 'female' }, 80);
  assert.equal(female.ree, 1614); assert.equal(female.tdee, 2502);
  assert.equal(core.calories({ ...profile, age: 17 }, 80).valid, false);
  assert.equal(core.calories({ ...profile, sex: '' }, 80).valid, false);
  assert.equal(core.calories(profile, NaN).valid, false);
});
test('recalculation uses supplied average without changing profile or calorie target', () => {
  const original = JSON.stringify(profile);
  assert.equal(core.calories(profile, 75).ree, 1730);
  assert.equal(core.calories(profile, 75).target, 2300);
  assert.equal(JSON.stringify(profile), original);
});
test('macros cannot silently return negative carbohydrate grams', () => {
  const result = core.calories({ ...profile, calorieTarget: 500 }, 80);
  assert.equal(result.macrosValid, false); assert.equal(result.carbsGrams, null);
});
test('rolling mean has exactly seven calendar days, no imputation and last same-day edit wins', () => {
  const result = core.rollingWeight([{ date: '2026-09-07', weightKg: 90 }, { date: '2026-09-08', weightKg: 80 }, { date: '2026-09-14', weightKg: 82 }, { date: '2026-09-14', weightKg: 78 }, { date: '2026-09-15', weightKg: 100 }], '2026-09-14');
  assert.equal(result.count, 2); assert.equal(result.averageKg, 79);
  assert.equal(core.rollingWeight([], '2026-09-14').averageKg, null);
});
test('one observation or less than fourteen real elapsed days cannot trigger decisions', () => {
  const one = stateFor(5, 1);
  assert.equal(core.decision(one, '2026-08-01').action, 'insufficient_data');
  const fourteenDates = stateFor(2, 14);
  assert.equal(core.decision(fourteenDates, '2026-08-14').action, 'insufficient_data');
  assert.equal(core.decision(stateFor(0.5, 15), '2026-08-15').action, 'maintain');
});
test('trend uses time between window centers, not full observation length', () => {
  const result = core.decision(stateFor(0.5, 15), '2026-08-15');
  assert.equal(result.trend.coverageDays, 14);
  assert.equal(result.trend.elapsedWeeks, 1.143);
  assert.ok(result.trend.lossPercentPerWeek > 0.5 && result.trend.lossPercentPerWeek < 0.502);
});
test('sparse, stale or separated observations do not produce targets', () => {
  const sparse = stateFor(); sparse.weights = sparse.weights.filter((_, i) => i < 7 || i === 21);
  assert.equal(core.decision(sparse, '2026-08-22').action, 'insufficient_data');
  assert.equal(core.decision(stateFor(), '2026-09-10').action, 'insufficient_data');
  const gap = stateFor(0.5, 28); gap.weights = gap.weights.filter((_, i) => i < 7 || i > 20);
  assert.equal(core.decision(gap, '2026-08-28').action, 'insufficient_data');
});
test('slow trend requires explicit positive adherence; missing is not yes', () => {
  const good = stateFor(0.2);
  const result = core.decision(good, '2026-08-22');
  assert.equal(result.action, 'decrease_calories'); assert.equal(result.suggestedCalories, 2150); assert.equal(result.applied, false);
  good.checkins = [];
  assert.equal(core.decision(good, '2026-08-22').action, 'review_adherence');
  good.checkins = stateFor().checkins.map(item => ({ ...item, training: false }));
  assert.equal(core.decision(good, '2026-08-22').action, 'review_adherence');
});
test('fast trend suggests raising, maintenance goal does not chase weight loss', () => {
  const fast = stateFor(1.2);
  assert.equal(core.decision(fast, '2026-08-22').action, 'increase_calories');
  assert.equal(core.decision(fast, '2026-08-22').suggestedCalories, 2450);
  const stable = stateFor(0); stable.profile.goal = 'maintain';
  assert.equal(core.decision(stable, '2026-08-22').action, 'maintain');
});
test('threshold boundary remains unchanged and applies strict >1 rule', () => {
  const data = stateFor(0, 15);
  data.weights.forEach((entry, i) => { entry.weightKg = i <= 6 ? 80 : 80 - 0.0035 * 80 * 8 / 7; });
  const lowBoundary = core.decision(data, '2026-08-15');
  assert.ok(Math.abs(lowBoundary.trend.lossPercentPerWeek - 0.35) < 0.00001);
  data.profile.slowLossThreshold = 0.34;
  assert.equal(core.decision(data, '2026-08-15').action, 'maintain');
});
test('accepted adjustment blocks another for fourteen days, no input mutation', () => {
  const data = stateFor(0.2, 28); data.lastAdjustmentAt = '2026-08-15';
  const before = JSON.stringify(data);
  assert.equal(core.decision(data, '2026-08-28').action, 'cooldown');
  assert.notEqual(core.decision(data, '2026-08-29').action, 'cooldown');
  assert.equal(JSON.stringify(data), before);
});
test('insufficient adult profile and a conservative lower target guard prevent reduction', () => {
  const data = stateFor(0.2); data.profile.age = 15;
  assert.equal(core.decision(data, '2026-08-22').action, 'review_profile');
  data.profile.age = 30; data.profile.calorieTarget = 1250;
  assert.equal(core.decision(data, '2026-08-22').action, 'review_nutrition');
});
test('strength recovery needs at least fourteen days of comparable completed sessions', () => {
  const data = stateFor(0.5);
  data.sessions = [session('2026-08-01'), session('2026-08-08'), session('2026-08-15')];
  assert.equal(core.decision(data, '2026-08-22').action, 'review_recovery');
  data.sessions[2].date = '2026-08-14';
  assert.equal(core.decision(data, '2026-08-22').recovery.suggested, false);
  data.sessions[2] = session('2026-08-15', [set(25)]);
  assert.equal(core.decision(data, '2026-08-22').recovery.suggested, false);
});
test('double progression needs two distinct completed days and all normal target sets', () => {
  const exercise = { id: 'press', repMin: 8, repMax: 12, targetSets: 3, incrementKg: 2.5 };
  const top = [set(20, 12), set(20, 12), set(20, 12)];
  assert.equal(core.progression(exercise, [session('2026-09-01', top)]).action, 'maintain');
  const result = core.progression(exercise, [session('2026-09-01', top), session('2026-09-08', top)]);
  assert.equal(result.action, 'increase_weight'); assert.equal(result.suggestedWeightKg, 22.5); assert.deepEqual(result.suggestedReps, [8, 8, 8]);
  assert.notEqual(core.progression(exercise, [session('2026-09-01', top), session('2026-09-01', top)]).action, 'increase_weight');
  assert.equal(core.progression(exercise, [session('2026-09-01', [set(), set(), set()])]).action, 'increase_reps');
});
test('warmups, drops, high effort and non-strength work do not qualify for more load', () => {
  const exercise = { id: 'press', targetSets: 3 };
  assert.equal(core.progression(exercise, [session('2026-09-01', [set(20, 12, { type: 'W' }), set(20, 12, { type: 'D' }), set(20, 12)])]).action, 'collect_data');
  assert.equal(core.progression(exercise, [session('2026-09-01', [set(20, 10, { rpe: 10 }), set(), set()])]).action, 'maintain');
  assert.equal(core.progression({ ...exercise, type: 'isometric' }, []).action, 'duration');
});
test('session metrics count only completed sets and separate warmup, cardio and isometric work', () => {
  const data = session('2026-09-14', [set(20, 12), set(20, 12), set(20, 12), set(10, 5, { type: 'W' }), set(80, 10, { completed: false })], { startedAt: '2026-09-14T12:00:00Z', finishedAt: '2026-09-14T12:30:00Z' });
  data.exercises.push({ id: 'walk', name: 'Caminar', type: 'cardio', sets: [{ completed: true, durationSeconds: 600 }] });
  data.exercises.push({ id: 'plank', name: 'Plancha lateral', type: 'isometric', muscles: ['Abdomen'], sets: [{ completed: true, side: 'left', durationSeconds: 30 }, { completed: true, side: 'right', durationSeconds: 30 }] });
  const result = core.sessionMetrics(data);
  assert.equal(result.totalVolumeKg, 770); assert.equal(result.workingVolumeKg, 720);
  assert.equal(result.durationSeconds, 1800); assert.equal(result.cardioSeconds, 600); assert.equal(result.isometricSeconds, 60);
  assert.equal(result.exercisesCompleted, 3); assert.equal(result.totalSets, 7); assert.equal(result.workingSets, 6);
  assert.deepEqual(result.muscles, ['Pecho', 'Tríceps', 'Abdomen']);
});
test('Epley and explicit load convention do not double unilateral loads accidentally', () => {
  const data = session('2026-09-14', [set(60, 10, { restSeconds: 60 }), set(70, 1, { restSeconds: 120 })]);
  const result = core.sessionMetrics(data);
  assert.equal(result.totalVolumeKg, 670); assert.equal(result.exerciseSummaries[0].estimated1RM, 80); assert.equal(result.averageRestSeconds, 90);
  data.exercises[0].loadMultiplier = 2;
  assert.equal(core.sessionMetrics(data).totalVolumeKg, 1340);
});
test('streak uses unique training days; rest protects continuity without training credit', () => {
  const sessions = [session('2026-09-12'), session('2026-09-12'), session('2026-09-14')];
  const result = core.streak(sessions, ['2026-09-13', '2026-09-13'], '2026-09-14');
  assert.equal(result.trainingDays, 2); assert.equal(result.continuityDays, 3); assert.equal(result.streakTrainingDays, 2);
  assert.equal(core.streak([], ['2026-09-14'], '2026-09-14').streak, 0);
  assert.equal(core.streak([session('2026-09-12')], ['2026-09-14'], '2026-09-14').streak, 0);
  assert.equal(core.streak([session('2026-09-13')], [], '2026-09-14').streak, 1);
  assert.equal(core.streak([session('2026-09-15')], [], '2026-09-14').trainingDays, 0);
});
test('empty or unfinished sessions do not count as training days', () => {
  assert.equal(core.streak([session('2026-09-14', [], {}), session('2026-09-14', [set()], { status: 'active' })], [], '2026-09-14').trainingDays, 0);
});
test('schedules show overdue plans without silently advancing them', () => {
  const config = { goal: 'fat_loss', programStart: '2026-08-01' };
  const result = core.schedule(config, '2026-09-14');
  assert.equal(result.deload.date, '2026-09-12'); assert.equal(result.deload.due, true);
  assert.equal(result.dietBreak.date, '2026-10-03'); assert.equal(result.dietBreak.applied, false);
  assert.equal(core.schedule({ ...config, goal: 'maintain' }, '2026-09-14').dietBreak, null);
  assert.equal(core.schedule({}, '2026-09-14').deload, null);
});
test('food portions retain entered calorie data and calculate cost', () => {
  const food = { name: 'Lentejas', per100g: { calories: 116, protein: 9, carbs: 20, fat: 0.4 }, pricePerKg: 2, currency: 'USD' };
  const result = core.portion(food, 250);
  assert.equal(result.calories, 290); assert.equal(result.proteinGrams, 22.5); assert.equal(result.cost, 0.5);
  assert.equal(core.portion(food, -1).valid, false); assert.equal(core.portion(food, 0).calories, 0);
});
test('supplement estimates use actual inventory, no invented daily consumption', () => {
  const data = { totalGrams: 100, dailyGrams: 5, stockDate: '2026-09-01', consumptions: [{ date: '2026-09-02', grams: 5 }, { date: '2026-09-15', grams: 5 }] };
  const result = core.supplementDays(data, '2026-09-14');
  assert.equal(result.remainingGrams, 95); assert.equal(result.fullDoses, 19); assert.equal(result.depletionDate, '2026-10-02');
  assert.equal(core.supplementDays({ remainingGrams: 0, dailyGrams: 5 }, '2026-09-14').lowStock, true);
  assert.equal(core.supplementDays({ remainingGrams: 100, dailyGrams: 0 }, '2026-09-14').daysRemaining, null);
});

