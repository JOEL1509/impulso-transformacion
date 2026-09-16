/* FitnessIO: csvDatasets(state) -> {nombre:csv}; downloadCSV(state) -> datasets.
 * exportBackup(state) -> Promise<backup>; importBackup(File|string|object) -> Promise<state>.
 * Restaurar valida primero, copia medios con IDs nuevos y devuelve el estado: guardar con FitnessStore.save.
 * reportHTML(state) -> HTML autónomo; printReport(state) abre «Imprimir / guardar PDF».
 * calendarICS(reminders,date?) -> ICS; downloadCalendar(...) descarga sin suscribir.
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FitnessIO = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  const arr = value => Array.isArray(value) ? value : [];
  const text = value => value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  function csvCell(value) {
    let val = text(value).replace(/\u0000/g, '');
    if (/^[\s\uFEFF]*[=+\-@]/.test(val)) val = "'" + val;
    return '"' + val.replace(/"/g, '""') + '"';
  }
  function makeCSV(headers, rows) { return '\uFEFF' + [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'; }
  const byDate = records => arr(records).slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  const numeric = value => typeof value === 'number' && Number.isFinite(value) ? value : 0;
  function nutritionDayRows(state) {
    const meals = arr(state.meals), days = arr(state.nutritionDays);
    const dates = [...new Set([...meals.map(m => m.date), ...days.map(d => d.date)])].sort();
    return dates.map(date => {
      const saved = days.find(d => d.date === date), entries = meals.filter(m => m.date === date);
      const sum = key => entries.reduce((total, entry) => total + numeric(entry[key]), 0);
      const target = typeof saved?.target === 'number' && Number.isFinite(saved.target) ? saved.target : '';
      const tdee = typeof saved?.tdee === 'number' && Number.isFinite(saved.tdee) ? saved.tdee : '';
      const balance = saved?.complete && tdee !== '' ? tdee - sum('kcal') : null;
      return [date, !!saved?.complete, sum('kcal'), sum('protein'), sum('carbs'), sum('fat'), target, tdee, balance === null ? '' : Math.max(0, balance), balance === null ? '' : Math.max(0, -balance)];
    });
  }
  function csvDatasets(state) {
    const data = {};
    const add = (name, headers, rows) => { data[name + '.csv'] = makeCSV(headers, rows); };
    add('perfil_y_configuracion', ['seccion', 'campo', 'valor'], ['profile', 'config', 'targets', 'reminders'].flatMap(k => Object.entries(state[k] || {}).map(([f, v]) => [k, f, v])));
    add('agua', ['id', 'fecha', 'mililitros', 'litros'], arr(state.waterLogs).map(w => [w.id,w.date,w.ml,w.ml/1000]));
    add('peso', ['fecha', 'peso_kg', 'notas'], arr(state.weights).map(w => [w.date, w.weightKg, w.notes]));
    add('medidas', ['fecha', 'cintura_cm', 'pecho_cm', 'cadera_cm', 'brazo_cm', 'muslo_cm', 'notas'], arr(state.measurements).map(m => [m.date, m.waist, m.chest, m.hip, m.arm, m.thigh, m.notes]));
    add('chequeos', ['fecha', 'calorias_cumplidas', 'entrenamiento_cumplido', 'notas'], arr(state.checkins).map(c => [c.date, c.calories, c.training, c.notes]));
    add('sesiones', ['id', 'fecha', 'rutina', 'estado', 'inicio', 'fin', 'series_hechas', 'tonelaje_kg', 'isometricos_seg', 'cardio_seg', 'notas'], arr(state.sessions).map(s => {
      const sets = arr(s.exercises).flatMap(e => arr(e.sets).filter(set => set.completed).map(set => ({ ...set, exerciseType: e.type })));
      return [s.id, s.date, s.routineName, s.status, s.startedAt, s.finishedAt, sets.length, sets.filter(x => !x.exerciseType || x.exerciseType === 'strength').reduce((n, x) => n + (+x.weightKg || 0) * (+x.reps || 0), 0), sets.filter(x => x.exerciseType === 'isometric').reduce((n, x) => n + (+x.durationSeconds || 0), 0), sets.filter(x => x.exerciseType === 'cardio').reduce((n, x) => n + (+x.durationSeconds || 0), 0), s.notes];
    }));
    add('series', ['sesion_id', 'fecha', 'rutina', 'ejercicio_id', 'ejercicio', 'musculos', 'modalidad', 'serie', 'tipo_N_W_D_S', 'hecha', 'kg', 'repeticiones', 'RPE', 'RIR', 'duracion_seg', 'descanso_seg', 'TUT_seg', 'lado', 'grupo_biserie', 'notas'], arr(state.sessions).flatMap(s => arr(s.exercises).flatMap(e => arr(e.sets).map((set, i) => [s.id, s.date, s.routineName, e.id, e.name, e.muscles, e.type, i + 1, set.type, set.completed, set.weightKg, set.reps, set.rpe, set.rir, set.durationSeconds, set.restSeconds, set.tutSeconds, set.side, set.supersetGroup, set.notes]))));
    add('rutinas', ['rutina_id', 'nombre', 'dias_1_lun_7_dom', 'ejercicio_id', 'ejercicio', 'musculos', 'modalidad', 'series', 'reps_min', 'reps_max', 'descanso_seg', 'archivo_id', 'video_url', 'notas', 'carga_planificada_kg', 'incremento_carga_kg'], arr(state.routines).flatMap(r => arr(r.exercises).length ? r.exercises.map(e => [r.id, r.name, r.days, e.id, e.name, e.muscles, e.type, e.sets, e.repMin, e.repMax, e.restSeconds, e.mediaId, e.videoUrl, e.notes, e.plannedWeightKg, e.incrementKg]) : [[r.id, r.name, r.days]]));
    add('descansos', ['fecha', 'notas'], arr(state.restDays).map(d => typeof d === 'string' ? [d, ''] : [d.date, d.notes]));
    add('fotos', ['id', 'fecha', 'archivo_id', 'vista', 'notas'], arr(state.photos).map(p => [p.id, p.date, p.mediaId, p.view, p.notes]));
    add('alimentos', ['id', 'nombre', 'kcal_por_100', 'proteina_g_por_100', 'carbohidratos_g_por_100', 'grasa_g_por_100', 'costo_por_100', 'unidad', 'marca', 'codigo_barras', 'categoria', 'fuente', 'fuente_url'], arr(state.foods).map(f => [f.id, f.name, f.kcal, f.protein, f.carbs, f.fat, f.cost, f.unit || 'g', f.brand, f.barcode, f.category, f.source, f.sourceUrl]));
    add('recetas', ['id', 'nombre', 'alimento_id', 'cantidad', 'preparacion', 'unidad'], arr(state.recipes).flatMap(r => arr(r.items).length ? r.items.map(i => [r.id, r.name, i.foodId, i.grams, r.instructions || r.notes, i.unit || arr(state.foods).find(f => f.id === i.foodId)?.unit || 'g']) : [[r.id, r.name, '', '', r.instructions || r.notes]]));
    const daysByDate = new Map(nutritionDayRows(state).map(row => [row[0], row]));
    add('comidas', ['id', 'fecha', 'momento', 'nombre', 'kcal', 'proteina_g', 'carbohidratos_g', 'grasa_g', 'costo', 'origen', 'ingredientes', 'objetivo_diario_kcal_guardado', 'TDEE_diario_kcal_guardado', 'dia_completo', 'deficit_diario_estimado_kcal', 'superavit_diario_estimado_kcal'], byDate(state.meals).map(m => {
      const day = daysByDate.get(m.date);
      const ingredients = arr(m.items).map(i => text(i.grams) + ' ' + (i.unit || 'g') + ' de ' + text(i.name)).join('; ');
      return [m.id, m.date, m.mealType, m.name, m.kcal, m.protein, m.carbs, m.fat, m.cost, m.source, ingredients, day[6], day[7], day[1], day[8], day[9]];
    }));
    add('ingredientes_comidas', ['comida_id', 'fecha', 'comida', 'alimento_id', 'alimento', 'cantidad', 'unidad', 'kcal', 'proteina_g', 'carbohidratos_g', 'grasa_g', 'costo'], byDate(state.meals).flatMap(m => arr(m.items).map(i => [m.id, m.date, m.name, i.foodId, i.name, i.grams, i.unit || 'g', i.kcal, i.protein, i.carbs, i.fat, i.cost])));
    add('dias_nutricion', ['fecha', 'dia_completo', 'kcal_registradas', 'proteina_g', 'carbohidratos_g', 'grasa_g', 'objetivo_kcal_guardado', 'TDEE_kcal_guardado', 'deficit_kcal_estimado', 'superavit_kcal_estimado'], nutritionDayRows(state));
    add('suplementos', ['id', 'nombre', 'gramos_restantes', 'gramos_diarios'], arr(state.supplements).map(s => [s.id, s.name, s.remainingGrams, s.dailyGrams]));
    add('consumo_suplementos', ['suplemento_id', 'nombre', 'fecha', 'gramos'], arr(state.supplements).flatMap(s => arr(s.logs).map(l => [s.id, s.name, l.date, l.grams])));
    // Preserva asimismo campos presentes y futuros que no caben en las tablas resumidas.
    add('datos_completos', ['seccion', 'registro_json'], Object.entries(state).flatMap(([key, value]) => Array.isArray(value) ? value.map(row => [key, row]) : [[key, value]]));
    return data;
  }
  function download(content, filename, mime) {
    if (!root.document) throw new Error('La descarga requiere abrir la aplicación en un navegador.');
    const blob = content instanceof root.Blob ? content : new root.Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = root.URL.createObjectURL(blob);
    const a = root.document.createElement('a'); a.href = url; a.download = filename; a.style.display = 'none';
    root.document.body.appendChild(a); a.click(); a.remove();
    root.setTimeout(() => root.URL.revokeObjectURL(url), 60000);
    return filename;
  }
  function dateTag() { return new Date().toISOString().slice(0, 10); }
  // Un solo CSV completo evita el bloqueo del navegador a descargas múltiples.
  function downloadCSV(state) {
    const datasets = csvDatasets(state);
    const rows = Object.entries(state).flatMap(([section, value]) => Array.isArray(value) ? value.map((record, i) => [section, i + 1, record]) : [[section, 1, value]]);
    download(makeCSV(['seccion', 'registro', 'datos_json'], rows), 'impulso-historial-completo-' + dateTag() + '.csv', 'text/csv;charset=utf-8');
    return datasets;
  }
  function bytesToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 16384) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 16384));
    return root.btoa(binary);
  }
  function base64ToBytes(value) {
    if (typeof value !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new Error('La copia contiene un archivo multimedia dañado.');
    const bin = root.atob(value);
    const result = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) result[i] = bin.charCodeAt(i);
    return result;
  }
  function storeAPI() {
    if (!root.FitnessStore) throw new Error('No se ha cargado el gestor de datos de la aplicación.');
    return root.FitnessStore;
  }
  async function createBackup(state) {
    const store = storeAPI();
    const valid = store.validate(state);
    const media = await store.listMedia();
    const total = media.reduce((sum, m) => sum + m.size, 0);
    if (total > 250 * 1024 * 1024) throw new Error('La copia contiene más de 250 MB de fotos y vídeos. Reduce su tamaño para exportarla en este dispositivo.');
    const files = [];
    for (const m of media) files.push({ id: m.id, name: m.name, type: m.type, size: m.size, base64: bytesToBase64(new Uint8Array(await m.blob.arrayBuffer())) });
    return { format: 'impulso-transformacion', version: 1, exportedAt: new Date().toISOString(), state: valid, media: files };
  }
  async function exportBackup(state) {
    const backup = await createBackup(state);
    download(JSON.stringify(backup), 'impulso-copia-completa-' + dateTag() + '.json', 'application/json');
    return backup;
  }
  async function importBackup(source) {
    const store = storeAPI();
    let backup = source;
    if (source && typeof source.text === 'function') {
      if (source.size > 350 * 1024 * 1024) throw new Error('La copia es demasiado grande para este dispositivo.');
      backup = await source.text();
    }
    if (typeof backup === 'string') {
      try { backup = JSON.parse(backup); } catch (_) { throw new Error('El archivo no es una copia JSON válida.'); }
    }
    if (!backup || backup.format !== 'impulso-transformacion' || backup.version !== 1 || !Array.isArray(backup.media)) throw new Error('Selecciona una copia completa exportada desde Impulso.');
    let state = store.validate(backup.state);
    const files = [], seen = new Set();
    let bytes = 0;
    for (const m of backup.media) {
      if (!m || typeof m.id !== 'string' || !m.id || m.id.length > 250 || seen.has(m.id)) throw new Error('La copia contiene identificadores multimedia no válidos.');
      seen.add(m.id);
      if (typeof m.base64 !== 'string' || m.base64.length > Math.ceil(store.MAX_MEDIA_BYTES * 4 / 3) + 4) throw new Error('Un archivo multimedia supera los 50 MB.');
      const content = base64ToBytes(m.base64); bytes += content.length;
      if (bytes > 250 * 1024 * 1024) throw new Error('La copia multimedia supera los 250 MB.');
      if (m.size !== content.length) throw new Error('El tamaño de un archivo de la copia no coincide.');
      const blob = new root.Blob([content], { type: m.type }); store.validateMedia(blob);
      files.push({ originalId: m.id, blob, name: m.name });
    }
    const mapping = new Map(), added = [];
    try {
      for (const file of files) {
        const newId = await store.putMedia(file.blob, undefined, { name: file.name });
        added.push(newId); mapping.set(file.originalId, newId);
      }
      const replace = value => typeof value === 'string' ? (mapping.get(value) || value) : Array.isArray(value) ? value.map(replace) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replace(v)])) : value;
      state = store.validate(replace(state));
      return state;
    } catch (error) {
      const cleanup = await Promise.allSettled(added.map(mediaId => store.deleteMedia(mediaId)));
      if (cleanup.some(r => r.status === 'rejected')) error.message += ' Algunos archivos temporales no pudieron limpiarse; el historial anterior sigue intacto.';
      throw error;
    }
  }
  function escapeHTML(value) { return text(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function table(headers, rows) {
    return '<table><thead><tr>' + headers.map(h => '<th>' + escapeHTML(h) + '</th>').join('') + '</tr></thead><tbody>' + (rows.length ? rows.map(row => '<tr>' + row.map(cell => '<td>' + escapeHTML(cell) + '</td>').join('') + '</tr>').join('') : '<tr><td colspan="' + headers.length + '">Sin registros.</td></tr>') + '</tbody></table>';
  }
  function reportHTML(state) {
    const section = (title, headers, rows) => '<section><h2>' + escapeHTML(title) + '</h2>' + table(headers, rows) + '</section>';
    const rounded = value => typeof value === 'number' ? Math.round(value * 100) / 100 : value;
    const nutritionHTML = section('Diario de alimentación', ['Fecha', 'Momento y comida', 'Alimentos y cantidades', 'kcal', 'Proteína g', 'Carbohidratos g', 'Grasa g'], byDate(state.meals).map(m => [m.date, [m.mealType, m.name].filter(Boolean).join(' · '), arr(m.items).map(i => rounded(i.grams) + ' ' + (i.unit || 'g') + ' de ' + text(i.name)).join('; '), rounded(m.kcal), rounded(m.protein), rounded(m.carbs), rounded(m.fat)])) + section('Balance diario de alimentación', ['Fecha', 'Día completo', 'kcal registradas', 'Proteína g', 'Carbohidratos g', 'Grasa g', 'Objetivo kcal', 'TDEE kcal', 'Déficit estimado kcal', 'Superávit estimado kcal'], nutritionDayRows(state).map(row => row.map((value, i) => i === 1 ? (value ? 'Sí' : 'No') : rounded(value)))) + '<p>El balance se muestra solo en días marcados como completos y con TDEE guardado. Usa los objetivos históricos de cada fecha; no representa una medición del gasto real. Los días sin objetivo histórico permanecen en blanco.</p>';
    const sessions = arr(state.sessions);
    const sessionHTML = sessions.map(s => '<article><h3>' + escapeHTML(s.date) + ' · ' + escapeHTML(s.routineName) + '</h3><p>' + escapeHTML(s.startedAt || '') + ' — ' + escapeHTML(s.finishedAt || '') + '</p>' + arr(s.exercises).map(e => '<h4>' + escapeHTML(e.name) + ' · ' + escapeHTML(e.muscles) + '</h4>' + table(['Serie', 'Tipo', 'Hecha', 'kg', 'Reps', 'RPE', 'RIR', 'Tiempo s', 'Descanso s', 'TUT s'], arr(e.sets).map((set, i) => [i + 1, set.type, set.completed ? 'Sí' : 'No', set.weightKg, set.reps, set.rpe, set.rir, set.durationSeconds, set.restSeconds, set.tutSeconds]))).join('') + '</article>').join('');
    const fullData = Object.entries(state).map(([key, value]) => '<details open><summary>' + escapeHTML(key) + '</summary><pre>' + escapeHTML(JSON.stringify(value, null, 2)) + '</pre></details>').join('');
    return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TNC FITNES · Historial completo</title><style>body{font:14px system-ui,sans-serif;color:#15232d;margin:32px;line-height:1.5}h1{font-size:30px}h2{margin-top:28px;border-bottom:2px solid #c7d5de;padding-bottom:6px}table{width:100%;border-collapse:collapse;font-size:11px;table-layout:auto}th,td{border:1px solid #ccd5dc;padding:6px;text-align:left;overflow-wrap:anywhere}th{background:#eef3f6}tr{break-inside:avoid}thead{display:table-header-group}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:10px monospace}button{padding:12px 20px;font:inherit;cursor:pointer}h3,h4{break-after:avoid}a{color:inherit}@page{size:A4;margin:12mm}@media print{body{margin:0}.print-actions{display:none}details{display:block}pre{font-size:9px}}</style></head><body><div class="print-actions"><button type="button" onclick="window.print()">Imprimir / guardar PDF</button><p>En el diálogo de impresión, elige guardar como PDF. Este informe contiene tu historial privado.</p></div><h1>Impulso · Historial completo</h1><p>Exportado: ' + escapeHTML(new Date().toLocaleString('es-PA')) + '</p>' + section('Perfil y objetivos', ['Campo', 'Valor'], Object.entries(state.profile || {}).concat(Object.entries(state.targets || {}))) + section('Peso diario', ['Fecha', 'Peso kg', 'Notas'], arr(state.weights).map(w => [w.date, w.weightKg, w.notes])) + section('Medidas', ['Fecha', 'Cintura', 'Pecho', 'Cadera', 'Brazo', 'Muslo'], arr(state.measurements).map(m => [m.date, m.waist, m.chest, m.hip, m.arm, m.thigh])) + section('Chequeos semanales', ['Fecha', 'Calorías', 'Entrenamiento', 'Notas'], arr(state.checkins).map(c => [c.date, c.calories === true ? 'Sí' : c.calories === false ? 'No' : '', c.training === true ? 'Sí' : c.training === false ? 'No' : '', c.notes])) + nutritionHTML + '<section><h2>Entrenamientos y todas sus series</h2>' + (sessionHTML || '<p>Sin sesiones.</p>') + '</section>' + section('Días de descanso', ['Fecha', 'Notas'], arr(state.restDays).map(d => typeof d === 'string' ? [d, ''] : [d.date, d.notes])) + '<section><h2>Archivo completo de datos</h2><p>Incluye rutinas, alimentos, recetas, suplementos, preferencias, fotos (referencias) y todos los campos del historial. Para conservar los archivos de imagen y vídeo, exporta también la copia JSON completa.</p>' + fullData + '</section></body></html>';
  }
  function printReport(state) {
    const tab = root.open('', '_blank');
    if (!tab) throw new Error('Permite abrir la ventana de impresión y vuelve a intentarlo.');
    tab.opener = null;
    tab.document.open(); tab.document.write(reportHTML(state)); tab.document.close();
    return tab;
  }
  const ICS_DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
  function icsEscape(value) { return text(value).replace(/\\/g, '\\\\').replace(/\r?\n|\r/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\u0000/g, ''); }
  function foldLine(line) {
    let result = '', segment = '', length = 0;
    for (const char of line) {
      const size = new TextEncoder().encode(char).length;
      if (length + size > 73) { result += segment + '\r\n '; segment = ''; length = 1; }
      segment += char; length += size;
    }
    return result + segment;
  }
  function localStamp(date, time) {
    const match = /^(\d{2}):(\d{2})$/.exec(time || '');
    if (!match || +match[1] > 23 || +match[2] > 59) throw new Error('La hora del recordatorio no es válida.');
    const p = n => String(n).padStart(2, '0');
    return date.getFullYear() + p(date.getMonth() + 1) + p(date.getDate()) + 'T' + match[1] + match[2] + '00';
  }
  function calendarICS(reminders, startDate) {
    const settings = reminders || {};
    const start = startDate instanceof Date ? new Date(startDate) : startDate ? new Date(String(startDate) + 'T12:00:00') : new Date();
    if (Number.isNaN(start.getTime())) throw new Error('La fecha de inicio del calendario no es válida.');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const tag = localStamp(start, '00:00').slice(0, 8);
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Impulso//Recordatorios personales//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Impulso'];
    function event(key, summary, time, rule, weekdays) {
      const first = new Date(start);
      if (weekdays && weekdays.length) while (!weekdays.includes((first.getDay() + 6) % 7 + 1)) first.setDate(first.getDate() + 1);
      lines.push('BEGIN:VEVENT', 'UID:impulso-' + key + '-' + tag + '@local', 'DTSTAMP:' + stamp, 'DTSTART:' + localStamp(first, time), 'DURATION:PT10M', 'RRULE:' + rule, 'SUMMARY:' + icsEscape(summary), 'DESCRIPTION:' + icsEscape('Abre Impulso para registrar tus datos. Recordatorio personal configurable.'), 'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(summary), 'END:VALARM', 'END:VEVENT');
    }
    if (settings.weighEnabled !== false) event('peso', 'Registrar mi peso', settings.weighTime || '07:00', 'FREQ=DAILY');
    const days = [...new Set(arr(settings.trainingDays).map(Number))].filter(n => Number.isInteger(n) && n >= 1 && n <= 7).sort();
    if (settings.trainingEnabled !== false && days.length) event('entrenamiento', 'Día de entrenamiento', settings.trainingTime || '18:00', 'FREQ=WEEKLY;BYDAY=' + days.map(d => ICS_DAYS[d - 1]).join(','), days);
    const weeklyDay = Number(settings.checkinDay || 7);
    if (!Number.isInteger(weeklyDay) || weeklyDay < 1 || weeklyDay > 7) throw new Error('El día del chequeo debe estar entre lunes y domingo.');
    if (settings.checkinEnabled !== false) event('chequeo', 'Hacer mi chequeo semanal', settings.checkinTime || '09:00', 'FREQ=WEEKLY;BYDAY=' + ICS_DAYS[weeklyDay - 1], [weeklyDay]);
    lines.push('END:VCALENDAR');
    return lines.map(foldLine).join('\r\n') + '\r\n';
  }
  function downloadCalendar(settings, startDate) {
    const content = calendarICS(settings, startDate);
    download(content, 'impulso-recordatorios.ics', 'text/calendar;charset=utf-8');
    return content;
  }
  return { csvCell, makeCSV, csvDatasets, downloadCSV, download, createBackup, exportBackup, importBackup, escapeHTML, reportHTML, printReport, icsEscape, foldLine, calendarICS, downloadCalendar };
});
