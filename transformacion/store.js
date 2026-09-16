/* Datos privados del dispositivo. No sustituye la autenticación del servidor.
 * init(namespace) -> API; load/save/validate -> estado; save lanza si no se guarda.
 * putMedia(Blob,id?,metadata?) -> Promise<string>; getMedia(id) -> Promise<Blob|null>.
 * listMedia() -> Promise<{id,name,type,size,createdAt,blob}[]>.
 * mediaURL(id) -> Promise<string|null>; liberar con revokeURL(url).
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FitnessStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  const ARRAY_KEYS = ['weights', 'checkins', 'measurements', 'photos', 'sessions', 'restDays', 'routines', 'foods', 'recipes', 'supplements', 'meals', 'nutritionDays', 'waterLogs'];
  const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
  const MEDIA_TYPES = /^(image\/(jpeg|png|gif|webp|avif|heic|heif)|video\/(mp4|webm|ogg|quicktime))$/i;
  let namespace = 'local';
  let database;
  function init(value) {
    if (typeof value !== 'string' || !value.trim() || value.length > 300) throw new Error('El espacio de datos no es válido.');
    namespace = value.trim();
    return api;
  }
  function storageKey() { return 'impulsoTransformacion:v1:' + encodeURIComponent(namespace); }
  function createState() {
    return {
      schemaVersion: 1, profile: {}, config: { unit: 'kg' }, weights: [], checkins: [], measurements: [], photos: [],
      sessions: [], restDays: [], routines: [], foods: [], recipes: [], supplements: [], meals: [], nutritionDays: [], waterLogs: [], activeSession: null,
      targets: null, reminders: { enabled: false, weighTime: '07:00', trainingTime: '18:00', trainingDays: [1, 3, 5], checkinDay: 7, checkinTime: '09:00' }
    };
  }
  function storage() {
    try {
      if (!root.localStorage) throw new Error();
      return root.localStorage;
    } catch (_) { throw new Error('El navegador no permite acceder al almacenamiento local. Actívalo para guardar tus datos.'); }
  }
  function checkTree(value, depth) {
    if (depth > 35) throw new Error('El archivo contiene demasiados niveles de datos.');
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
    if (typeof value === 'number' && Number.isFinite(value)) return;
    if (typeof value !== 'object') throw new Error('Los datos contienen un valor que no se puede guardar.');
    for (const key of Object.keys(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('El archivo contiene una propiedad no permitida.');
      if (['id','mediaId','foodId','routineId'].includes(key) && value[key] != null && value[key] !== '' && (typeof value[key] !== 'string' || !/^[A-Za-z0-9_-]{1,250}$/.test(value[key]))) throw new Error('El archivo contiene un identificador no válido.');
      if (['plannedWeightKg','weightKg','grams','reps','repMin','repMax','rpe','rir','durationSeconds','restSeconds','tutSeconds','actualRestSeconds','incrementKg','waist','chest','hip','arm','thigh','kcal','protein','carbs','fat','cost'].includes(key) && value[key] != null && value[key] !== '' && (typeof value[key] !== 'number' || !Number.isFinite(value[key]) || value[key] < 0)) throw new Error('El archivo contiene una medida o un valor numérico no válido.');
      if(key==='plannedWeightKg'&&value[key]>1000)throw new Error('La carga planificada no puede superar 1000 kg.');
      checkTree(value[key], depth + 1);
    }
  }
  function validate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('El estado de la aplicación no es válido.');
    if (input.schemaVersion !== undefined && input.schemaVersion !== 1) throw new Error('Esta copia usa otra versión. Actualiza la aplicación antes de importarla.');
    checkTree(input, 0);
    const defaults = createState();
    const copy = JSON.parse(JSON.stringify(input));
    for (const key of ARRAY_KEYS) {
      if (copy[key] !== undefined && !Array.isArray(copy[key])) throw new Error('La colección «' + key + '» no es válida.');
      if (copy[key] && copy[key].length > 250000) throw new Error('La colección «' + key + '» es demasiado grande.');
      if (copy[key] && copy[key].some(x => !x || (typeof x !== 'object' && !(key === 'restDays' && typeof x === 'string')))) throw new Error('Hay un registro no válido en «' + key + '».');
    }
    for (const key of ['profile', 'config', 'reminders']) {
      if (copy[key] !== undefined && (!copy[key] || typeof copy[key] !== 'object' || Array.isArray(copy[key]))) throw new Error('La sección «' + key + '» no es válida.');
    }
    const out = { ...defaults, ...copy, schemaVersion: 1 };
    out.config = { ...defaults.config, ...out.config };
    out.reminders = { ...defaults.reminders, ...out.reminders };
    for (const r of out.routines) {
      if (!Array.isArray(r.exercises) || !Array.isArray(r.days) || r.days.some(d => !Number.isInteger(d) || d < 1 || d > 7)) throw new Error('Una rutina no tiene ejercicios o días válidos.');
      for (const e of r.exercises) if (!Number.isInteger(e.sets) || e.sets < 1 || e.sets > 20) throw new Error('Revisa la cantidad de series de la rutina.');
    }
    for (const s of [...out.sessions, ...(out.activeSession ? [out.activeSession] : [])]) {
      if (!Array.isArray(s.exercises) || s.exercises.some(e => !Array.isArray(e.sets))) throw new Error('Una sesión contiene series no válidas.');
    }
    if (out.recipes.some(r => !Array.isArray(r.items))) throw new Error('Una receta no contiene ingredientes válidos.');
    if (out.weights.some(w => !/^\d{4}-\d{2}-\d{2}$/.test(w.date) || !Number.isFinite(w.weightKg) || w.weightKg <= 0)) throw new Error('Hay un peso o fecha no válidos.');
    const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
    if(out.meals.some(m=>!validDate(m.date)||!m.id||(m.items!==undefined&&!Array.isArray(m.items))))throw new Error('Una comida contiene una fecha o ingredientes no válidos.');
    if(out.nutritionDays.some(d=>!validDate(d.date)||typeof d.complete!=='boolean'||['target','tdee'].some(k=>d[k]!=null&&(!Number.isFinite(d[k])||d[k]<=0))))throw new Error('Un día del diario tiene un objetivo o fecha no válidos.');
    if(out.waterLogs.some(w=>!validDate(w.date)||!w.id||!Number.isFinite(w.ml)||w.ml<=0||w.ml>5000))throw new Error('Hay un registro de agua no válido.');
    return out;
  }
  function save(state) {
    const valid = validate(state);
    const serialized = JSON.stringify(valid);
    try { storage().setItem(storageKey(), serialized); }
    catch (error) {
      if (/quota/i.test(error.name || '') || error.code === 22 || error.code === 1014) throw new Error('No queda espacio para guardar. Exporta una copia y libera espacio del navegador; el último guardado se conserva.');
      throw new Error('No se pudo guardar en este navegador. Los cambios actuales todavía no están guardados. ' + error.message);
    }
    return valid;
  }
  const kg = lb => Math.round((Number(lb) || 0) * 0.45359237 * 1000) / 1000;
  function migrateLegacy(old) {
    if (!old || typeof old !== 'object' || Array.isArray(old)) throw new Error('Los datos anteriores de Impulso no son válidos. No se han modificado.');
    const out = createState();
    if (old.user && typeof old.user === 'object') out.profile = { name: String(old.user.name || ''), photo: typeof old.user.photo === 'string' ? old.user.photo : '' };
    out.config.theme = old.theme === 'light' ? 'light' : 'dark';
    out.config.activeRoutineId = old.current || '';
    const routineMap = new Map();
    for (const r of (Array.isArray(old.customRoutines) ? old.customRoutines : [])) if (r && r.id) routineMap.set(r.id, r);
    for (const r of Object.values(old.routineEdits || {})) if (r && r.id) routineMap.set(r.id, r);
    out.routines = Array.from(routineMap.values()).map(r => ({
      id: String(r.id), name: String(r.name || 'Rutina importada'), days: Array.isArray(r.days) ? r.days : [], description: r.description || '',
      exercises: (Array.isArray(r.exercises) ? r.exercises : []).map((e, index) => {
        const range = String(e.target || '').match(/(?:×|x)\s*(\d+)\s*[–-]\s*(\d+)/);
        return { id: e.id || String(r.id) + '-legacy-' + index, name: e.name || 'Ejercicio', muscles: [e.primary, e.secondary].filter(Boolean).join(', '), type: /plancha|isom[eé]trico/i.test(e.name || '') ? 'isometric' : 'strength', sets: Number(e.sets || e.setMax) || 3, repMin: range ? +range[1] : 8, repMax: range ? +range[2] : 12, restSeconds: Number(e.rest) || 90, notes: [e.benefit, ...(Array.isArray(e.technique) ? e.technique : [])].filter(Boolean).join('\n') };
      })
    }));
    out.sessions = (Array.isArray(old.sessions) ? old.sessions : []).filter(s => s && typeof s === 'object').map((s, si) => ({
      id: s.id || 'legacy-session-' + si, date: s.day || s.date || '', routineId: s.routineId || '', routineName: s.routine || 'Sesión importada', status: 'completed',
      startedAt: s.startedAt || null, finishedAt: s.finishedAt || null, imported: true, originalUnit: 'lb',
      exercises: (Array.isArray(s.exercises) ? s.exercises : []).map((e, ei) => ({
        id: e.id || 'legacy-exercise-' + si + '-' + ei, name: e.name || 'Ejercicio', muscles: e.muscles || e.primary || '', type: 'strength',
        sets: (Array.isArray(e.sets) ? e.sets : []).map((set, i) => ({ id: 'legacy-set-' + si + '-' + ei + '-' + i, completed: true, type: 'N', weightKg: kg(set.weight), reps: Number(set.reps) || 0, restSeconds: Number(set.rest) || 0, rpe: null, rir: null, durationSeconds: 0, tutSeconds: 0 }))
      }))
    }));
    out.migration = { source: 'impulsoState', date: new Date().toISOString(), originalPreserved: true, loadsConvertedFrom: 'lb' };
    return validate(out);
  }
  function load() {
    const raw = storage().getItem(storageKey());
    if (raw !== null) {
      let parsed;
      try { parsed = JSON.parse(raw); } catch (_) { throw new Error('No se pudo leer el último guardado. No lo hemos borrado ni reemplazado. Restaura una copia de seguridad para recuperarlo.'); }
      return validate(parsed);
    }
    // Nunca trasladar datos locales a otro usuario o cuenta de APEX automáticamente.
    if (namespace === 'local') {
      const legacy = storage().getItem('impulsoState');
      if (legacy) {
        let parsed;
        try { parsed = JSON.parse(legacy); } catch (_) { throw new Error('No se pudieron leer los datos anteriores de Impulso. Siguen intactos; no se ha creado un guardado que los oculte.'); }
        return save(migrateLegacy(parsed));
      }
    }
    return createState();
  }
  function id() { return root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID() : 'media-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2); }
  function openDB() {
    if (database) return database;
    database = new Promise((resolve, reject) => {
      if (!root.indexedDB) return reject(new Error('Este navegador no permite guardar fotos o vídeos localmente.'));
      const request = root.indexedDB.open('impulso-transformacion-media', 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore('media', { keyPath: 'key' });
        store.createIndex('namespace', 'namespace', { unique: false });
      };
      request.onsuccess = () => { const db = request.result; db.onversionchange = () => { db.close(); database = null; }; resolve(db); };
      request.onerror = () => { database = null; reject(new Error('No se pudo abrir el archivo local de fotos y vídeos.')); };
      request.onblocked = () => { database = null; reject(new Error('Cierra las otras pestañas de Impulso para actualizar el archivo multimedia.')); };
    });
    return database;
  }
  async function mediaTransaction(mode, operation) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('media', mode);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onabort = tx.onerror = () => reject(new Error('No se pudo ' + (mode === 'readonly' ? 'leer' : 'guardar') + ' el archivo. Revisa el espacio disponible y vuelve a intentarlo.'));
      try {
        const request = operation(tx.objectStore('media'));
        request.onsuccess = () => { result = request.result; };
      } catch (error) { tx.abort(); reject(error); }
    });
  }
  function validateMedia(blob) {
    if (!blob || typeof blob.arrayBuffer !== 'function' || typeof blob.size !== 'number') throw new Error('Selecciona una foto o un vídeo válido.');
    if (!MEDIA_TYPES.test(blob.type || '')) throw new Error('Formato no compatible. Usa JPG, PNG, GIF, WebP, AVIF, HEIC, MP4, WebM o MOV.');
    if (!blob.size || blob.size > MAX_MEDIA_BYTES) throw new Error('El archivo debe tener contenido y pesar como máximo 50 MB.');
    return blob;
  }
  async function putMedia(blob, requestedId, metadata) {
    validateMedia(blob);
    const mediaId = requestedId || id();
    if (typeof mediaId !== 'string' || mediaId.length > 250 || !mediaId) throw new Error('El identificador del archivo no es válido.');
    const scope = namespace;
    await mediaTransaction('readwrite', store => store.put({ key: scope + '\u0000' + mediaId, namespace: scope, id: mediaId, blob, name: (metadata && metadata.name) || blob.name || 'archivo', type: blob.type, size: blob.size, createdAt: new Date().toISOString() }));
    return mediaId;
  }
  async function getMedia(mediaId) {
    const scope = namespace;
    const row = await mediaTransaction('readonly', store => store.get(scope + '\u0000' + mediaId));
    return row ? row.blob : null;
  }
  async function deleteMedia(mediaId) {
    const scope = namespace;
    await mediaTransaction('readwrite', store => store.delete(scope + '\u0000' + mediaId));
    return true;
  }
  async function listMedia() {
    const scope = namespace;
    const rows = await mediaTransaction('readonly', store => store.index('namespace').getAll(scope));
    return rows.map(({ id, name, type, size, createdAt, blob }) => ({ id, name, type, size, createdAt, blob }));
  }
  async function mediaURL(mediaId) { const blob = await getMedia(mediaId); return blob ? root.URL.createObjectURL(blob) : null; }
  function revokeURL(url) { if (url) root.URL.revokeObjectURL(url); }
  const api = { init, createState, load, save, validate, migrateLegacy, storageKey, putMedia, getMedia, deleteMedia, listMedia, mediaURL, revokeURL, validateMedia, MAX_MEDIA_BYTES };
  return api;
});
