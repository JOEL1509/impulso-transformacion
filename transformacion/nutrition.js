(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FitnessNutrition=api;})(globalThis,()=>{
  'use strict';
  const keys=['kcal','protein','carbs','fat','cost'];
  const number=v=>Number(v)||0;
  function totals(items){return items.reduce((out,item)=>{for(const k of keys)out[k]+=number(item[k]);return out;},Object.fromEntries(keys.map(k=>[k,0])));}
  function validDate(date){if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;const d=new Date(date+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===date;}
  function snapshot(foods,items){if(!items.length)throw Error('Agrega al menos un alimento.');return items.map(i=>{const original=i.snapshot?.foodId===i.foodId?i.snapshot:null;const f=original||foods.find(f=>f.id===i.foodId);if(!f)throw Error('No se encontró uno de los alimentos.');const quantity=Number(i.grams);if(!Number.isFinite(quantity)||quantity<=0||quantity>10000)throw Error('Indica una cantidad entre 0,1 y 10.000.');const reference=original?original.grams:100;if(!(reference>0))throw Error('La cantidad original del registro no es válida.');const out={foodId:i.foodId,name:f.name,unit:f.unit||'g',grams:quantity};for(const k of ['estimated','sourceUrl','quantityLabel','kind'])if(f[k]!==undefined)out[k]=f[k];for(const k of keys){if(!Number.isFinite(Number(f[k]??0))||Number(f[k]??0)<0)throw Error('Revisa los datos nutricionales del alimento.');out[k]=number(f[k])*quantity/reference;}return out;});}
  function solve(a,b,kcal,protein){
    if(!a||!b||a.id===b.id)throw Error('Elige dos alimentos diferentes.');
    if(!(kcal>0)||!(protein>=0))throw Error('Revisa las metas de calorías y proteína.');
    const det=a.kcal*b.protein-b.kcal*a.protein;
    const x=(kcal*b.protein-b.kcal*protein)/det*100,y=(a.kcal*protein-kcal*a.protein)/det*100;
    if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>10000||y>10000)throw Error('Estos alimentos no pueden cubrir ambas metas con esas cantidades. Prueba otra combinación.');
    return [{foodId:a.id,grams:Math.round(x*10)/10},{foodId:b.id,grams:Math.round(y*10)/10}].filter(i=>i.grams>0);
  }
  function upsert(meals,entry){if(!entry.id||!validDate(entry.date))throw Error('El registro necesita una fecha válida.');return [...meals.filter(m=>m.id!==entry.id),entry];}
  function macroTargets(targets){return Object.fromEntries(['protein','carbs','fat'].map(k=>[k,targets?.[k]??null]));}
  function daySummary(state,date){const entries=(state.meals||[]).filter(m=>m.date===date);const sum=totals(entries);const saved=(state.nutritionDays||[]).find(d=>d.date===date);const target=saved?.target??null,tdee=saved?.tdee??null;return {...sum,date,entries,target,tdee,macroTargets:macroTargets(saved?.macroTargets),complete:!!saved?.complete,remaining:target===null?null:target-sum.kcal,estimatedDeficit:saved?.complete&&tdee!==null?tdee-sum.kcal:null};}
  function captureDay(state,date,today){
    if(!validDate(date)||date>today)throw Error('Selecciona una fecha válida de hoy o anterior.');
    state.nutritionDays||=[];
    let record=state.nutritionDays.find(d=>d.date===date);
    if(!record){record={date,target:date===today?(state.targets?.calories??null):null,tdee:date===today?(state.targets?.tdee??null):null,macroTargets:macroTargets(date===today?state.targets:null),complete:false};state.nutritionDays.push(record);}
    if(date===today&&!record.complete){record.target=state.targets?.calories??record.target;record.tdee=state.targets?.tdee??record.tdee;record.macroTargets=macroTargets(state.targets);}
    return record;
  }
  function waterSummary(state,date){const entries=(state.waterLogs||[]).filter(log=>log.date===date);const ml=entries.reduce((total,log)=>total+number(log.ml),0);return {entries,ml,liters:ml/1000,glasses:entries.length};}
  function restaurantSnapshot(components,prefix='restaurant'){if(!components.length)throw Error('Incluye al menos un componente de tu comida.');return components.filter(c=>c.included!==false&&Number(c.quantity)>0).map((c,index)=>{const quantity=Number(c.quantity);if(!Number.isFinite(quantity)||quantity>20)throw Error('Revisa las cantidades del menú (hasta 20 porciones).');const out={foodId:c.foodId||prefix+'-'+index,name:String(c.name||'Componente'),unit:'porción',grams:quantity,quantityLabel:String(c.quantityLabel||'1 porción'),kind:c.kind||'main',estimated:!!c.estimated};if(c.sourceUrl)out.sourceUrl=c.sourceUrl;for(const k of keys){const value=Number(c[k]??0);if(!Number.isFinite(value)||value<0||value>20000)throw Error('Revisa las calorías y macros de cada componente.');out[k]=value*quantity;}return out;});}
  function preserveFoodReferences(state,foodId){for(const recipe of state.recipes||[])recipe.items=recipe.items.map(item=>item.foodId===foodId&&!item.snapshot?{...item,snapshot:snapshot(state.foods,[item])[0]}:item);}
  return {totals,snapshot,solve,upsert,daySummary,captureDay,validDate,macroTargets,waterSummary,restaurantSnapshot,preserveFoodReferences};
});
