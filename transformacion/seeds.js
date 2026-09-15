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


window.FitnessSeeds = {routines, exerciseLibrary};
