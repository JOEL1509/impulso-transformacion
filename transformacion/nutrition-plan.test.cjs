const {test}=require('node:test'),assert=require('node:assert/strict');
const N=require('./nutrition.js'),P=require('./workout-plan.js'),Catalog=require('./food-catalog.js'),Store=require('./store.js');
const today='2026-09-14';
test('146 foods have sourced nutrient values; catalog merges preserve existing IDs and edits',()=>{
 assert.equal(Catalog.foods.length,146);assert.equal(new Set(Catalog.foods.map(f=>f.category)).size,13);
 assert.ok(Catalog.foods.every(f=>['kcal','protein','carbs','fat'].every(k=>Number.isFinite(f[k])&&f[k]>=0)&&f.sourceUrl.includes(f.id.slice(5))));
 const input=[{id:'legacy-oats',name:'Avena',kcal:400},{id:'custom',name:'Mi bebida',kcal:80}],copy=structuredClone(input);
 const merged=Catalog.merge(input);assert.deepEqual(input,copy);assert.equal(merged[0].id,'legacy-oats');assert.equal(merged[0].kcal,400);assert.equal(merged.filter(f=>f.name==='Avena').length,1);assert.deepEqual(Catalog.merge(merged),merged);
});
test('planned load includes zero, fractional load, no load for cardio, latest same-day actual fallback',()=>{
 const e={id:'press',type:'strength',sets:3,plannedWeightKg:42.5};assert.equal(P.initialWeight(e),42.5);assert.equal(P.initialWeight({...e,plannedWeightKg:0}),0);assert.equal(P.initialWeight({...e,type:'cardio'}),'');assert.throws(()=>P.initialWeight({...e,plannedWeightKg:-1}));
 const session=(finishedAt,weightKg)=>({date:today,finishedAt,status:'completed',exercises:[{id:'press',sets:[{type:'N',completed:true,reps:10,weightKg}]}]});
 assert.equal(P.initialWeight({...e,plannedWeightKg:null},[session(100,20),session(200,30)]),30);
 assert.equal(P.initialWeight({...e,plannedWeightKg:null},[{...session(300,50),deload:true},session(100,20)]),20);
 assert.equal(P.plannedSets(e,[],{deload:true}).length,2);assert.equal(P.plannedSets(e)[0].weightKg,42.5);
});
test('quantity snapshots and historical edits retain original macros, names and units',()=>{
 const food={id:'milk',name:'Mi leche',unit:'ml',kcal:50,protein:3,carbs:4,fat:2,cost:.1};
 const [original]=N.snapshot([food],[{foodId:'milk',grams:250}]);assert.equal(original.kcal,125);
 const changed={...food,unit:'g',kcal:100,name:'Otra etiqueta'};
 const [edited]=N.snapshot([changed],[{foodId:'milk',grams:500,snapshot:original}]);assert.equal(edited.kcal,250);assert.equal(edited.name,'Mi leche');assert.equal(edited.unit,'ml');assert.equal(original.kcal,125);
 assert.equal(N.snapshot([changed],[{foodId:'milk',grams:250}])[0].kcal,250);
 assert.throws(()=>N.snapshot([food],[{foodId:'milk',grams:0}]));
});
test('portion solver saves actual rounded quantities and repeated calculation upserts one entry',()=>{
 const oats=Catalog.foods.find(f=>f.name==='Avena'),chicken=Catalog.foods.find(f=>f.name==='Pechuga de pollo cocida');
 const items=N.snapshot(Catalog.foods,N.solve(oats,chicken,500,30)),t=N.totals(items);assert.ok(Math.abs(t.kcal-500)<.5);assert.ok(Math.abs(t.protein-30)<.1);
 const entry={id:'one',date:today,items,...t};assert.equal(N.upsert(N.upsert([],entry),{...entry,kcal:600}).length,1);assert.throws(()=>N.solve(oats,oats,500,30));assert.throws(()=>N.solve(oats,chicken,1,400));
});
test('deficit requires complete day and historical targets stay frozen after recalculation',()=>{
 const state={meals:[{id:'one',date:today,kcal:1800,protein:120}],targets:{calories:2000,tdee:2500}};
 const d=N.captureDay(state,today,today);assert.equal(N.daySummary(state,today).estimatedDeficit,null);d.complete=true;
 assert.equal(N.daySummary(state,today).estimatedDeficit,700);state.targets={calories:2200,tdee:2700};N.captureDay(state,today,today);assert.equal(d.tdee,2500);
 const past=N.captureDay(state,'2026-09-10',today);assert.equal(past.target,null);past.complete=true;assert.equal(N.daySummary(state,past.date).estimatedDeficit,null);
});
test('invalid dates and malformed diary imports fail before saving',()=>{
 assert.equal(N.validDate('2026-02-31'),false);assert.equal(N.validDate('2024-02-29'),true);assert.throws(()=>N.upsert([],{id:'bad',date:'2026-02-31'}));assert.throws(()=>N.captureDay({},'2027-01-01',today));
 const state=Store.createState();assert.deepEqual(Store.validate(state).nutritionDays,[]);state.nutritionDays=[{date:'2026-02-31',complete:true,target:1800,tdee:2400}];assert.throws(()=>Store.validate(state));
});
