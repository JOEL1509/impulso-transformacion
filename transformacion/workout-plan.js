(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FitnessWorkoutPlan=api;})(globalThis,()=>{
  'use strict';
  function initialWeight(exercise,sessions=[]){
    if(exercise.type && exercise.type!=='strength')return '';
    const planned=exercise.plannedWeightKg;
    if(planned!==undefined&&planned!==null&&planned!==''){
      if(typeof planned!=='number'||!Number.isFinite(planned)||planned<0||planned>1000)throw Error('La carga planificada debe estar entre 0 y 1000 kg.');
      return planned;
    }
    const stamp=s=>Number(s.finishedAt||s.startedAt)||Date.parse(s.finishedAt||s.startedAt)||0;
    const history=sessions.filter(s=>s.status==='completed'&&!s.deload).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))||stamp(b)-stamp(a));
    for(const session of history){
      const previous=(session.exercises||[]).find(e=>exercise.id?e.id===exercise.id:e.name===exercise.name);
      const set=previous?.sets?.find(s=>s.completed&&(s.type||'N')==='N'&&s.reps>0&&typeof s.weightKg==='number'&&s.weightKg>=0);
      if(set)return set.weightKg;
    }
    return '';
  }
  function plannedSets(exercise,sessions=[],{deload=false}={}){
    const count=Math.max(1,Math.min(20,Number(exercise.sets)||3));
    const weightKg=initialWeight(exercise,sessions);
    return Array.from({length:deload?Math.ceil(count/2):count},()=>({weightKg,reps:''}));
  }
  return {initialWeight,plannedSets};
});
