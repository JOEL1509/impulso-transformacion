(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FitnessWellness=api;})(globalThis,()=>{
  'use strict';
  const levels={sedentary:{factor:1.2,label:'Mayormente sentado, sin ejercicio habitual'},light:{factor:1.375,label:'Actividad ligera, ejercicio 1–3 días por semana'},moderate:{factor:1.55,label:'Actividad moderada, ejercicio 3–5 días por semana'},active:{factor:1.725,label:'Actividad intensa, ejercicio 6–7 días por semana'},physical:{factor:1.9,label:'Trabajo físico exigente y entrenamiento intenso'}};
  function activity(profile){return levels[profile.activityLevel]||levels.sedentary;}
  function hydration(profile){if(!(Number(profile.age)>=18)||!profile.sex)return {liters:null,basis:'Completa un perfil adulto para mostrar una referencia.'};const liters=profile.sex==='female'?1.6:2;return {liters,basis:'Referencia inicial de líquidos: '+liters.toLocaleString('es')+' L/día. Se estima un 80 % del agua total de referencia EFSA ('+(profile.sex==='female'?'2':'2,5')+' L); el resto suele venir de alimentos. No es una dosis calculable solo con el peso: calor, sudor y otras bebidas cambian la necesidad. Sigue las indicaciones de tu profesional si tienes restricción de líquidos.'};}
  const toKg=(value,unit)=>Number(value)*(unit==='lb'?0.45359237:1);
  const fromKg=(value,unit)=>Number(value)/(unit==='lb'?0.45359237:1);
  return {levels,activity,hydration,toKg,fromKg};
});
