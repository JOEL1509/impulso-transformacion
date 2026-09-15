const {chromium}=require('C:/Users/barri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'America/Panama'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
await page.goto('http://127.0.0.1:8089/transformacion/');
await page.getByRole('button',{name:'Perfil',exact:true}).click();for(const [key,value] of Object.entries({age:'30',heightCm:'180',initialWeightKg:'80'}))await page.locator(`[name=${key}]`).fill(value);await page.getByRole('button',{name:'Guardar perfil',exact:true}).click();await page.getByRole('button',{name:'Recalcular TDEE',exact:true}).click();await page.getByRole('button',{name:'Aplicar este objetivo',exact:true}).click();
await page.getByRole('button',{name:'Hoy',exact:true}).click();await page.getByRole('button',{name:'Iniciar descarga',exact:true}).click();await page.getByRole('button',{name:'Programar período',exact:true}).click();assert.match(await page.locator('#view').innerText(),/Descarga activa/);
await page.getByRole('button',{name:'Empezar entrenamiento',exact:true}).click();assert.equal(await page.locator('.exercise').first().locator('.set-row:not(.set-head)').count(),2);
await page.locator('.exercise').first().locator('[data-set=type]').first().selectOption('S');await page.locator('[data-set=supersetGroup]').fill('A');
await page.locator('.exercise').first().locator('[data-set=weightKg]').first().fill('10');await page.locator('.exercise').first().locator('[data-set=reps]').first().fill('10');await page.locator('.exercise').first().getByRole('button',{name:/^Completar .* serie 1$/}).click();
await page.screenshot({path:'transformacion/qa-workout-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.getByRole('button',{name:'Terminar y guardar',exact:true}).click();await page.getByRole('button',{name:'Cerrar',exact:true}).click();await page.getByRole('button',{name:'Hoy',exact:true}).click();
await page.getByRole('button',{name:'Planificar pausa',exact:true}).click();await page.getByRole('button',{name:'Programar período',exact:true}).click();assert.match(await page.locator('#view').innerText(),/Pausa activa/);await page.getByRole('button',{name:'Retomar objetivo anterior',exact:true}).click();
await page.getByRole('button',{name:'Registrar descanso',exact:true}).click();const yesterday=await page.evaluate(()=>{const d=new Date();d.setDate(d.getDate()-1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;});await page.locator('#rest-form [name=date]').fill(yesterday);await page.getByRole('button',{name:'Guardar descanso',exact:true}).click();assert.match(await page.locator('.hero').innerText(),/🔥 2/);
await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.context().setOffline(true);await page.reload();await page.getByRole('button',{name:'Entrenar',exact:true}).click();assert.ok(await page.getByRole('button',{name:'Crear rutina',exact:true}).count());await page.context().setOffline(false);
assert.equal(errors.length,0,errors.join('\n'));console.log('PASS: descarga reduce series, biseries, pausa de dieta, regreso al objetivo, descanso protege racha y recarga sin conexión.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
