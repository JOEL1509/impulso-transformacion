const routines = [
  { id: 'base', level: '01 · PRINCIPIANTE', name: 'Cuerpo completo', days: '3 días por semana', duration: '45–55 min', description: 'La mejor base para empezar: practica los movimientos principales y fortalece todo el cuerpo.', tags: ['Pierna', 'Pecho', 'Espalda'], exercises: [
    {name:'Sentadilla con mancuerna', primary:'Cuádriceps y glúteos', secondary:'Core, pantorrillas', target:'3 × 8–12', rest:90, technique:['Sujeta una mancuerna frente al pecho y mantén el torso alto.','Baja llevando la cadera atrás y las rodillas en la dirección de los pies.','Empuja el suelo para subir; no redondees la espalda.'], benefit:'Baja de forma controlada durante 2–3 segundos. Llega a una profundidad cómoda sin perder la postura.'},
    {name:'Press de pecho con mancuernas', primary:'Pecho', secondary:'Tríceps, hombros anteriores', target:'3 × 8–12', rest:90, technique:['Acuéstate con los pies firmes en el suelo.','Baja las mancuernas al costado del pecho con control.','Empuja arriba sin bloquear los codos con fuerza.'], benefit:'Mantén los omóplatos juntos y abajo para que el pecho trabaje con estabilidad.'},
    {name:'Remo con mancuerna', primary:'Espalda', secondary:'Bíceps, hombro posterior', target:'3 × 10–12', rest:75, technique:['Apoya una mano y rodilla en el banco; espalda larga y estable.','Lleva el codo hacia la cadera, no hacia el techo.','Baja lento hasta estirar el brazo sin girar el torso.'], benefit:'Piensa en llevar el codo atrás, no en tirar con la mano.'},
    {name:'Peso muerto rumano', primary:'Isquiotibiales y glúteos', secondary:'Espalda baja, antebrazos', target:'3 × 8–10', rest:90, technique:['Rodillas suaves y mancuernas cerca de las piernas.','Lleva la cadera atrás mientras mantienes la espalda neutra.','Sube apretando glúteos, sin inclinarte hacia atrás.'], benefit:'La carga debe sentirse en la parte posterior del muslo, no en la espalda baja.'}
  ]},
  { id: 'upper', level: '02 · PRINCIPIANTE', name: 'Tren superior', days: '2 días por semana', duration: '40–50 min', description: 'Construye fuerza en pecho, espalda, hombros y brazos con movimientos fáciles de aprender.', tags: ['Pecho', 'Espalda', 'Brazos'], exercises: [
    {name:'Jalón al pecho', primary:'Espalda', secondary:'Bíceps, hombro posterior', target:'3 × 8–12', rest:90, technique:['Agarra la barra un poco más abierto que los hombros.','Lleva los codos hacia abajo y atrás.','No uses impulso ni tires detrás de la nuca.'], benefit:'Pausa un instante con la barra cerca de la parte alta del pecho.'},
    {name:'Press de hombros', primary:'Hombros', secondary:'Tríceps, core', target:'3 × 8–12', rest:90, technique:['Aprieta abdomen y glúteos sentado o de pie.','Empuja las mancuernas sobre los hombros.','No arquees la espalda al terminar.'], benefit:'Escoge un peso que puedas subir sin compensar con la zona lumbar.'},
    {name:'Curl de bíceps', primary:'Bíceps', secondary:'Antebrazos', target:'2 × 10–15', rest:60, technique:['Mantén los codos cerca del costado.','Sube sin balancear el cuerpo.','Baja lento hasta extender casi por completo.'], benefit:'Controlar la bajada es tan importante como levantar el peso.'}
  ]},
  { id: 'lower', level: '03 · PRINCIPIANTE', name: 'Piernas y glúteos', days: '2 días por semana', duration: '40–50 min', description: 'Una sesión centrada en fuerza, estabilidad y control de la parte inferior del cuerpo.', tags: ['Glúteos', 'Piernas', 'Core'], exercises: [
    {name:'Prensa de piernas', primary:'Cuádriceps y glúteos', secondary:'Isquiotibiales, pantorrillas', target:'3 × 10–15', rest:90, technique:['Apoya toda la espalda y los pies en la plataforma.','Baja hasta donde la pelvis no se despegue del respaldo.','Empuja sin bloquear las rodillas.'], benefit:'Mantén las rodillas alineadas con los pies durante todo el recorrido.'},
    {name:'Hip thrust', primary:'Glúteos', secondary:'Isquiotibiales, core', target:'3 × 8–12', rest:90, technique:['Apoya la espalda alta en un banco estable.','Empuja con los talones y eleva la cadera.','Termina con costillas abajo y glúteos apretados.'], benefit:'No necesitas subir mucho: prioriza una pelvis neutra al final.'},
    {name:'Plancha', primary:'Core', secondary:'Hombros, glúteos', target:'3 × 20–40 s', rest:45, technique:['Forma una línea recta de cabeza a talones.','Aprieta abdomen y glúteos.','Respira sin dejar que caiga la cadera.'], benefit:'Detén la serie cuando no puedas sostener la postura, aunque queden segundos.'}
  ]}
];
const exerciseLibrary = [
  {name:'Press inclinado con mancuernas',primary:'Pecho',secondary:'Tríceps, hombros anteriores'},
  {name:'Aperturas con mancuernas',primary:'Pecho',secondary:'Hombros anteriores'},
  {name:'Remo sentado en polea',primary:'Espalda',secondary:'Bíceps, hombro posterior'},
  {name:'Dominadas asistidas',primary:'Espalda',secondary:'Bíceps, core'},
  {name:'Elevaciones laterales',primary:'Hombros',secondary:'Trapecio'},
  {name:'Extensión de tríceps en polea',primary:'Tríceps',secondary:'Hombros'},
  {name:'Curl martillo',primary:'Bíceps',secondary:'Antebrazos'},
  {name:'Zancadas',primary:'Cuádriceps y glúteos',secondary:'Core, isquiotibiales'},
  {name:'Curl femoral',primary:'Isquiotibiales',secondary:'Pantorrillas'},
  {name:'Elevación de pantorrillas',primary:'Pantorrillas',secondary:'Pies y tobillos'}
].map(e=>({...e,target:'3 × 8–12',rest:90,technique:['Mantén la postura estable y evita usar impulso.','Controla tanto la subida como la bajada.','Detén la serie si la técnica se pierde.'],benefit:'Usa un peso que puedas controlar y progresa gradualmente.'}));

let state = {
  sessions: [], current: 'base', customRoutines: [], routineEdits: {}, theme: 'dark', user: null,
  ...JSON.parse(localStorage.getItem('impulsoState') || '{}')
};
const $ = s => document.querySelector(s);
const save = () => localStorage.setItem('impulsoState', JSON.stringify(state));
const allRoutines = () => [...routines.map(r=>state.routineEdits?.[r.id] || r), ...(state.customRoutines || []).map(r=>state.routineEdits?.[r.id] || r)];
const routine = id => allRoutines().find(r => r.id === id) || routines[0];
const today = () => new Date().toLocaleDateString('es-PA', {day:'numeric', month:'short'});
const dayKey = (date = new Date()) => new Date(date).toISOString().slice(0, 10);
function applyTheme(){
  document.documentElement.dataset.theme = state.theme || 'dark';
  document.querySelector('meta[name="theme-color"]').content = state.theme === 'light' ? '#f1f5ff' : '#081527';
}
function trainingStats(){
  const days = [...new Set(state.sessions.map(s => s.day || ''))].filter(Boolean).sort();
  if(!days.length) return { training: 0, rest: 0, total: 0, days: [] };
  const start = new Date(`${days[0]}T12:00:00`);
  const end = new Date(`${dayKey()}T12:00:00`);
  const total = Math.max(1, Math.floor((end - start) / 86400000) + 1);
  return { training: days.length, rest: Math.max(0, total - days.length), total, days };
}

function navigate(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.go===id));
  if(id==='entrenar') renderWorkout(); if(id==='progreso') renderProgress(); if(id==='inicio') renderHome(); if(id==='perfil') renderProfile();
  window.scrollTo({top:0,behavior:'smooth'});
}
function lastSessions(){return state.sessions.slice(-7)}
function renderHome(){
  const r=routine(state.current), stats=trainingStats();
  $('#streak-number').textContent=stats.training;
  $('#streak-message').textContent=stats.training ? `${stats.rest} día${stats.rest===1?'':'s'} de descanso desde que empezaste.` : 'Elige una rutina para empezar.';
  $('#next-workout').innerHTML=`<span class="card-kicker">RECOMENDADA PARA HOY</span><h3>${r.name}</h3><p>${r.description}</p><div class="tags"><span class="tag">${r.days}</span><span class="tag">${r.duration}</span><span class="tag">${r.exercises.length} ejercicios</span></div><button class="primary-button" data-start="${r.id}">Comenzar sesión</button>`;
  const total=state.sessions.length, volume=state.sessions.reduce((a,s)=>a+s.volume,0);
  $('#mini-progress').innerHTML=`<div><strong>${stats.training}</strong><small>días de entrenamiento</small></div><div><strong>${stats.rest}</strong><small>días de descanso</small></div><div><strong>${total}</strong><small>sesiones completadas</small></div><div><strong>${volume.toLocaleString()}</strong><small>lb de volumen registrado</small></div>`;
}
function renderRoutines(){
  $('#routine-list').innerHTML=`<button class="create-routine" data-create-routine>+ Crear mi propia rutina</button>${allRoutines().map(r=>`<article class="routine-card"><span class="routine-number">${r.level}</span><h2>${r.name}</h2><p>${r.description}</p><div class="routine-meta">${r.days} · ${r.duration}</div><div class="tags">${r.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div><button data-select="${r.id}">Elegir esta rutina →</button></article>`).join('')}`;
}
function suggestions(exercise){
  const prior=state.sessions.flatMap(s=>s.exercises||[]).filter(e=>e.name===exercise.name).at(-1);
  if(!prior) return 'Empieza con un peso que te permita terminar cada serie con 2–3 repeticiones posibles en reserva.';
  const top=Math.max(...prior.sets.map(s=>+s.reps||0)); const weight=Math.max(...prior.sets.map(s=>+s.weight||0));
  if(top>=12) return `La última vez lograste ${top} repeticiones con ${weight} lb. Si la técnica fue buena, prueba subir 2.5–5 lb y vuelve a 8–10 repeticiones.`;
  return `La última vez lograste ${top} repeticiones con ${weight} lb. Mantén el peso e intenta sumar 1 repetición en una serie.`;
}
function renderWorkout(){
  const r=routine(state.current);
  $('#entrenar').innerHTML=`<div class="workout-head"><button class="back-button" data-go="rutinas">← Cambiar rutina</button><p class="eyebrow">${today().toUpperCase()} · ${r.duration.toUpperCase()}</p><h1>${r.name}</h1><p>Registra lo que haces. Te orientaremos para tu próxima sesión.</p></div><div class="exercise-list">${r.exercises.map((e,i)=>exerciseCard(r,e,i)).join('')}</div><button class="primary-button finish-button" id="finish-workout">Terminar y guardar sesión</button>`;
}
function exerciseCard(r,e,i){
  const mode=e.setMode || 'fixed', min=e.setMin || 3, max=e.setMax || 5, fixed=e.sets || 3, restUnit=e.restUnit || 's';
  const planned=mode==='range' ? max : fixed, restValue=restUnit==='min' ? e.rest/60 : e.rest;
  const target=mode==='range' ? `${min}–${max} × 8–12` : `${fixed} × 8–12`;
  return `<details class="exercise-card" ${i===0?'open':''} data-exercise-index="${i}" data-rest-unit="${restUnit}"><summary><span class="exercise-index">${i+1}</span><div class="exercise-info"><h2>${e.name}</h2><p>${target} · Descanso ${restValue} ${restUnit==='min'?'min':'s'}</p></div><span class="chevron">⌄</span></summary><div class="sets"><div class="tip">💡 ${suggestions(e)}</div><div class="series-settings"><label>Series<select data-series-mode data-exercise="${i}"><option value="fixed" ${mode==='fixed'?'selected':''}>Fijas</option><option value="range" ${mode==='range'?'selected':''}>Rango</option></select></label>${mode==='range'?`<label>Mín.<input data-set-min data-exercise="${i}" type="number" min="1" value="${min}"></label><label>Máx.<input data-set-max data-exercise="${i}" type="number" min="${min}" value="${max}"></label>`:`<label>Cantidad<input data-set-fixed data-exercise="${i}" type="number" min="1" value="${fixed}"></label>`}<label>Descanso<select data-rest-unit data-exercise="${i}"><option value="s" ${restUnit==='s'?'selected':''}>Segundos</option><option value="min" ${restUnit==='min'?'selected':''}>Minutos</option></select></label></div>${mode==='range'?`<p class="range-note">Rango activo: realiza entre ${min} y ${max} series según tu energía y técnica.</p>`:''}<div class="set-grid header"><span></span><span>LB</span><span>REPS</span><span class="rest-heading">${restUnit==='min'?'MIN.':'SEG.'}</span></div>${Array.from({length:planned},(_,n)=>`<div class="set-grid"><span class="set-number">${n+1}</span><input aria-label="Peso serie ${n+1}" data-field="weight" type="number" min="0" placeholder="0"><input aria-label="Repeticiones serie ${n+1}" data-field="reps" type="number" min="0" placeholder="0"><input aria-label="Descanso serie ${n+1}" data-field="rest" type="number" min="0" step="${restUnit==='min'?'0.25':'5'}" value="${restValue}"></div>`).join('')}<div class="exercise-actions"><button class="text-button" data-info="${r.id}|${i}">Ver técnica</button><button class="text-button" data-replace-exercise="${i}">Reemplazar</button><button class="text-button" data-add-exercise="${i}">+ Agregar ejercicio</button><button class="text-button add-set">+ Añadir serie</button></div></div></details>`
}
function renderProgress(){
  const sessions=state.sessions, recent=sessions.slice(-5).reverse();
  if(!sessions.length){$('#progress-content').innerHTML='<div class="empty-state"><strong>Aún no hay sesiones.</strong><p>Completa tu primer entrenamiento y aquí verás tu evolución.</p><button class="primary-button" data-go="rutinas">Ver rutinas</button></div>';return}
  const volume=sessions.reduce((a,s)=>a+s.volume,0), exercises=new Set(sessions.flatMap(s=>s.exercises.map(e=>e.name))).size, stats=trainingStats();
  $('#progress-content').innerHTML=`<div class="stat-grid"><div class="stat"><strong>${stats.training}</strong><small>días de entrenamiento</small></div><div class="stat"><strong>${stats.rest}</strong><small>días de descanso</small></div><div class="stat"><strong>${sessions.length}</strong><small>sesiones completadas</small></div><div class="stat"><strong>${volume.toLocaleString()}</strong><small>lb de volumen total</small></div><div class="stat"><strong>${exercises}</strong><small>ejercicios practicados</small></div><div class="stat"><strong>${stats.total}</strong><small>días de seguimiento</small></div></div><section class="progress-card"><h2>Últimas sesiones</h2>${recent.map(s=>`<div class="progress-row"><span>${s.routine}</span><span>${s.date}</span></div>`).join('')}</section><article class="workout-card"><span class="card-kicker">REGLA DE PROGRESIÓN</span><h3>Doble progresión</h3><p>Primero sube repeticiones dentro del rango indicado. Cuando alcances el máximo en todas las series con buena técnica, aumenta 2.5–5 lb y vuelve al extremo bajo del rango.</p></article>`;
}
function renderProfile(){
  const user = state.user || { name: 'Tony', photo: '' };
  const initials = (user.name || 'T').trim().charAt(0).toUpperCase();
  const photo = user.photo ? `<img class="profile-photo" src="${user.photo}" alt="Foto de perfil">` : `<div class="profile-photo">${initials}</div>`;
  $('#perfil').innerHTML=`<div class="profile-head">${photo}<div><h1>${user.name || 'Tu perfil'}</h1><p>Tu espacio de entrenamiento</p><p class="tony-line">Tony es un serio</p></div></div>
  <section class="setting-card"><h2>${state.user ? 'Editar perfil' : 'Crea tu perfil local'}</h2><p>${state.user ? 'Actualiza tu nombre o foto cuando quieras.' : 'Crea tu perfil en este dispositivo. La sincronización con una base de datos vendrá después.'}</p><form class="profile-form" id="profile-form" novalidate><label>Nombre<input name="name" autocomplete="name" maxlength="30" value="${state.user?.name || ''}" placeholder="Escribe tu nombre"></label><label>Contraseña ${state.user ? '(deja vacío para conservarla)' : ''}<input name="password" type="password" autocomplete="new-password" placeholder="Mínimo 4 caracteres"></label><label class="file-label">Cambiar foto de perfil<input name="photo" type="file" accept="image/*"></label><p id="profile-feedback" class="profile-feedback" aria-live="polite"></p><button class="primary-button" type="submit">${state.user ? 'Guardar cambios' : 'Registrarme'}</button></form></section>
  <section class="setting-card"><h2>Apariencia</h2><p>Elige cómo quieres ver Impulso.</p><div class="theme-options"><button data-theme="dark" class="${state.theme==='dark'?'selected':''}">🌙 Oscuro</button><button data-theme="light" class="${state.theme==='light'?'selected':''}">☀️ Claro</button></div></section>`;
}
function showRoutineCreator(){
  $('#routine-dialog-content').innerHTML=`<span class="dialog-label">RUTINA PERSONALIZADA</span><h2 class="dialog-title">Crea tu rutina</h2><p class="dialog-section">Agrega los ejercicios separados por comas. Luego podrás registrar cada serie como en cualquier rutina.</p><form class="profile-form" id="routine-form"><label>Nombre de la rutina<input name="name" required maxlength="36" placeholder="Ej. Pecho, espalda y bíceps"></label><label>Músculos principales<input name="muscles" required placeholder="Pecho, espalda, bíceps"></label><label>Días por semana<input name="days" type="number" min="1" max="7" value="3" required></label><label>Duración aproximada<input name="duration" required value="45 min"></label><label>Ejercicios<input name="exercises" required placeholder="Press banca, remo, curl bíceps"></label><button class="primary-button" type="submit">Guardar rutina</button></form>`;
  $('#routine-dialog').showModal();
}
function editableRoutine(id){
  if(!state.routineEdits[id]) state.routineEdits[id]=JSON.parse(JSON.stringify(routine(id)));
  return state.routineEdits[id];
}
function updateExercise(index,changes){
  const r=editableRoutine(state.current); Object.assign(r.exercises[index],changes); save(); renderWorkout();
}
function showExercisePicker(action,index){
  $('#routine-dialog-content').innerHTML=`<span class="dialog-label">EDITAR RUTINA</span><h2 class="dialog-title">${action==='replace'?'Reemplaza':'Agrega'} un ejercicio</h2><p class="dialog-section">Elige uno de la biblioteca. Mantendrá los ajustes que podrás editar después.</p><div class="routine-list">${exerciseLibrary.map((e,n)=>`<article class="routine-card"><span class="routine-number">${e.primary.toUpperCase()}</span><h2>${e.name}</h2><p>También: ${e.secondary}</p><button data-pick-exercise="${n}" data-picker-action="${action}" data-picker-index="${index}">${action==='replace'?'Usar este ejercicio':'Agregar aquí'}</button></article>`).join('')}</div>`;
  $('#routine-dialog').showModal();
}
function applyPickedExercise(libraryIndex,action,index){
  const r=editableRoutine(state.current), selected=JSON.parse(JSON.stringify(exerciseLibrary[libraryIndex]));
  if(action==='replace') r.exercises[index]=selected; else r.exercises.splice(index+1,0,selected);
  save();$('#routine-dialog').close();renderWorkout();
}
function toDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)})}
async function saveProfile(form){
  const data = new FormData(form), name=data.get('name').trim(), password=data.get('password');
  const feedback=$('#profile-feedback');
  if(!name){feedback.textContent='Escribe tu nombre para guardar el perfil.';return}
  if(!state.user && password.length<4){feedback.textContent='La contraseña debe tener al menos 4 caracteres.';return}
  let photo=state.user?.photo||''; const file=data.get('photo');
  if(file?.size){if(file.size>1024*1024){feedback.textContent='Elige una foto de 1 MB o menos para guardarla en este dispositivo.';return}photo=await toDataUrl(file)}
  const passwordHash=password ? await hashPassword(password) : state.user?.passwordHash || '';
  try{state.user={name,photo,passwordHash};save();renderProfile();$('.avatar').textContent=name.charAt(0).toUpperCase();}catch(error){feedback.textContent='No se pudo guardar el perfil. Prueba con una foto más pequeña.'}
}
async function hashPassword(password){
  const bytes=new TextEncoder().encode(password);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function saveCustomRoutine(form){
  const data=new FormData(form), names=data.get('exercises').split(',').map(x=>x.trim()).filter(Boolean), muscles=data.get('muscles').trim();
  const exercises=names.map(name=>({name,primary:muscles,secondary:'Músculos estabilizadores',target:'3 × 8–12',rest:90,technique:['Mantén una postura estable y controlada.','Usa un recorrido cómodo, sin dolor.','Controla la bajada antes de repetir.'],benefit:'Prioriza una técnica limpia y registra el peso para progresar poco a poco.'}));
  state.customRoutines.push({id:`custom-${Date.now()}`,level:'TU RUTINA',name:data.get('name').trim(),days:`${data.get('days')} días por semana`,duration:data.get('duration').trim(),description:`Rutina personalizada para ${muscles}.`,tags:muscles.split(',').map(x=>x.trim()).slice(0,3),exercises});save();$('#routine-dialog').close();renderRoutines();
}
function shareText(session){
  const currentRoutine=routine(session.routineId || state.current);
  const muscles=[...new Set(session.exercises.map(e=>currentRoutine.exercises.find(x=>x.name===e.name)?.primary || 'Entrenamiento'))].join(', ');
  const stats=trainingStats();
  return `Mi entreno en Impulso 💪\n${session.routine}\nMúsculos: ${muscles}\nVolumen: ${session.volume.toLocaleString()} lb\nDía ${stats.training} de entrenamiento · ${session.date}`;
}
function renderSharePreview(session, photo=''){
  const stats=trainingStats(), currentRoutine=routine(session.routineId || state.current); const muscles=[...new Set(session.exercises.map(e=>currentRoutine.exercises.find(x=>x.name===e.name)?.primary || 'Entrenamiento'))].join(' · ');
  return `<div class="share-preview">${photo?`<img class="share-photo" src="${photo}" alt="Foto del entrenamiento">`:''}<span class="dialog-label" style="color:#b8d1ff">IMPULSO · SESIÓN COMPLETADA</span><h2>${session.routine}</h2><p>${muscles}</p><strong>${session.volume.toLocaleString()} lb</strong><p>${session.date} · Día ${stats.training} entrenando</p></div>`;
}
function showShare(session){
  $('#share-dialog-content').innerHTML=`<span class="dialog-label">COMPARTE TU LOGRO</span><h2 class="dialog-title">Entreno guardado</h2><div id="share-preview">${renderSharePreview(session)}</div><label class="file-label">Añadir foto de tu galería<input id="share-photo-input" type="file" accept="image/*"></label><button class="text-button" data-system-photo>Usar arte de Impulso</button><button class="primary-button" data-share-session="${state.sessions.indexOf(session)}">Compartir entrenamiento</button><button class="text-button" data-close-share>Ahora no</button>`;
  $('#share-dialog').showModal();
}
function systemWorkoutImage(){
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420" viewBox="0 0 800 420"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#1261ba"/><stop offset="1" stop-color="#ec4054"/></linearGradient></defs><rect width="800" height="420" fill="url(#g)"/><circle cx="620" cy="120" r="90" fill="#ffffff22"/><path d="M110 290h80m-40-40v80m70-120h150m-150 80h150" stroke="#fff" stroke-width="20" stroke-linecap="round"/><text x="60" y="85" fill="#fff" font-family="sans-serif" font-size="32" font-weight="bold">IMPULSO</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
function makeShareCard(session,imageSrc){
  return new Promise(resolve=>{const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1080;const ctx=canvas.getContext('2d');const gradient=ctx.createLinearGradient(0,0,1080,1080);gradient.addColorStop(0,'#103e80');gradient.addColorStop(1,'#c62f50');ctx.fillStyle=gradient;ctx.fillRect(0,0,1080,1080);const draw=()=>{ctx.fillStyle='#ffffff';ctx.font='700 34px sans-serif';ctx.fillText('IMPULSO · SESIÓN COMPLETADA',72,95);ctx.font='bold 77px Georgia';ctx.fillText(session.routine.slice(0,25),72,650);ctx.font='36px sans-serif';ctx.fillStyle='#d9e8ff';ctx.fillText(`${session.volume.toLocaleString()} lb de volumen`,72,730);ctx.fillText(`${session.date} · Día ${trainingStats().training} entrenando`,72,790);canvas.toBlob(blob=>resolve(new File([blob],'mi-entreno-impulso.png',{type:'image/png'})),'image/png')};if(imageSrc){const img=new Image();img.onload=()=>{ctx.drawImage(img,72,145,936,430);draw()};img.onerror=draw;img.src=imageSrc}else draw()})
}
async function shareSession(index){
  const session=state.sessions[index], text=shareText(session), image=$('#share-preview img'), file=await makeShareCard(session,image?.src);
  try{if(navigator.share){const data={title:'Mi entreno en Impulso',text,url:location.href};if(navigator.canShare?.({files:[file]}))data.files=[file];await navigator.share(data);}else{await navigator.clipboard.writeText(text);alert('Resumen copiado. Puedes pegarlo en tu red social o mensaje.')}}catch(error){if(error.name!=='AbortError') alert('No se pudo abrir el menú para compartir.');}
}
function showExerciseInfo(rid,index){const e=routine(rid).exercises[index];$('#dialog-content').innerHTML=`<span class="dialog-label">${e.primary.toUpperCase()}</span><h2 class="dialog-title">${e.name}</h2><section class="dialog-section"><h3>También trabaja</h3><p>${e.secondary}</p></section><section class="dialog-section"><h3>Técnica</h3><ul>${e.technique.map(t=>`<li>${t}</li>`).join('')}</ul></section><section class="dialog-section"><h3>Para aprovecharlo más</h3><p>${e.benefit}</p></section>`;$('#exercise-dialog').showModal()}
function finishWorkout(){
  const r=routine(state.current), cards=[...document.querySelectorAll('.exercise-card')];
  const ex=cards.map((card,i)=>({name:r.exercises[i].name,sets:[...card.querySelectorAll('.set-grid:not(.header)')].map(row=>({weight:row.querySelector('[data-field="weight"]').value,reps:row.querySelector('[data-field="reps"]').value,rest:(+row.querySelector('[data-field="rest"]').value||0)*(card.dataset.restUnit==='min'?60:1)})).filter(s=>s.weight||s.reps)})).filter(e=>e.sets.length);
  if(!ex.length){alert('Registra al menos una serie para guardar tu sesión.');return}
  const volume=ex.reduce((sum,e)=>sum+e.sets.reduce((n,s)=>n+(+s.weight||0)*(+s.reps||0),0),0);
  const session={date:today(),day:dayKey(),routineId:r.id,routine:r.name,exercises:ex,volume}; state.sessions.push(session); save(); showShare(session);
}
document.addEventListener('click',e=>{
  const go=e.target.closest('[data-go]');if(go){navigate(go.dataset.go);return}
  const start=e.target.closest('[data-start]');if(start){state.current=start.dataset.start;save();navigate('entrenar');return}
  const select=e.target.closest('[data-select]');if(select){state.current=select.dataset.select;save();navigate('entrenar');return}
  const info=e.target.closest('[data-info]');if(info){const [id,i]=info.dataset.info.split('|');showExerciseInfo(id,+i);return}
  if(e.target.classList.contains('close-dialog')){e.target.closest('dialog').close();return}
  const create=e.target.closest('[data-create-routine]');if(create){showRoutineCreator();return}
  const theme=e.target.closest('[data-theme]');if(theme){state.theme=theme.dataset.theme;save();applyTheme();renderProfile();return}
  const share=e.target.closest('[data-share-session]');if(share){shareSession(+share.dataset.shareSession);return}
  const replace=e.target.closest('[data-replace-exercise]');if(replace){showExercisePicker('replace',+replace.dataset.replaceExercise);return}
  const addExercise=e.target.closest('[data-add-exercise]');if(addExercise){showExercisePicker('add',+addExercise.dataset.addExercise);return}
  const picked=e.target.closest('[data-pick-exercise]');if(picked){applyPickedExercise(+picked.dataset.pickExercise,picked.dataset.pickerAction,+picked.dataset.pickerIndex);return}
  if(e.target.closest('[data-close-share]')){$('#share-dialog').close();return}
  if(e.target.closest('[data-system-photo]')){const session=state.sessions.at(-1);$('#share-preview').innerHTML=renderSharePreview(session,systemWorkoutImage());return}
  if(e.target.classList.contains('add-set')){const grid=e.target.closest('.sets'),card=e.target.closest('.exercise-card');const count=grid.querySelectorAll('.set-grid:not(.header)').length+1;const rest=grid.querySelector('[data-field="rest"]').value;const row=document.createElement('div');row.className='set-grid';row.innerHTML=`<span class="set-number">${count}</span><input aria-label="Peso serie ${count}" data-field="weight" type="number" min="0" placeholder="0"><input aria-label="Repeticiones serie ${count}" data-field="reps" type="number" min="0" placeholder="0"><input aria-label="Descanso serie ${count}" data-field="rest" type="number" min="0" step="${card.dataset.restUnit==='min'?'0.25':'5'}" value="${rest}">`;grid.insertBefore(row,grid.querySelector('.exercise-actions'));return}
  if(e.target.id==='finish-workout')finishWorkout();
});
document.addEventListener('submit',async e=>{
  if(e.target.id==='profile-form'){e.preventDefault();await saveProfile(e.target);return}
  if(e.target.id==='routine-form'){e.preventDefault();saveCustomRoutine(e.target);return}
});
document.addEventListener('change',async e=>{
  if(e.target.matches('[data-series-mode]')){const mode=e.target.value;updateExercise(+e.target.dataset.exercise,mode==='range'?{setMode:'range',setMin:3,setMax:5}:{setMode:'fixed',sets:3});return}
  if(e.target.matches('[data-set-fixed]')){updateExercise(+e.target.dataset.exercise,{setMode:'fixed',sets:Math.max(1,+e.target.value||1)});return}
  if(e.target.matches('[data-set-min]')){const r=routine(state.current),index=+e.target.dataset.exercise;updateExercise(index,{setMode:'range',setMin:Math.max(1,+e.target.value||1),setMax:Math.max(+e.target.value||1,r.exercises[index].setMax||5)});return}
  if(e.target.matches('[data-set-max]')){const r=routine(state.current),index=+e.target.dataset.exercise;updateExercise(index,{setMode:'range',setMax:Math.max(r.exercises[index].setMin||1,+e.target.value||1)});return}
  if(e.target.matches('[data-rest-unit]')){updateExercise(+e.target.dataset.exercise,{restUnit:e.target.value});return}
  if(e.target.id==='share-photo-input' && e.target.files[0]){
    const session=state.sessions.find(s=>s===state.sessions.at(-1));
    $('#share-preview').innerHTML=renderSharePreview(session,await toDataUrl(e.target.files[0]));
  }
});
applyTheme();renderHome();renderRoutines();
