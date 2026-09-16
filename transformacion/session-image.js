(function(root){
  'use strict';
  async function download(session,{unit='kg'}={}){
    if(!session)throw Error('No se encontró esta sesión.');
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.width=1080;canvas.height=1600;
    const format=n=>Number(n||0).toLocaleString('es-PA',{maximumFractionDigits:1}),mass=n=>format(FitnessWellness.fromKg(n,unit));
    const done=session.exercises.map(e=>({...e,sets:e.sets.filter(s=>s.completed)})).filter(e=>e.sets.length);
    const sets=done.flatMap(e=>e.sets),volume=done.filter(e=>e.type==='strength').flatMap(e=>e.sets).reduce((n,s)=>n+(Number(s.weightKg)||0)*(Number(s.reps)||0),0);
    const muscles=[...new Set(done.flatMap(e=>String(e.muscles||'').split(',').map(s=>s.trim())).filter(Boolean))].join(', ');
    const lines=[];const add=(text,size=28,color='#e7efff')=>{ctx.font=`${size>=36?'bold ':''}${size}px Arial`;const words=String(text).split(/\s+/);let line='';for(const word of words){if(line&&ctx.measureText(line+' '+word).width>924){lines.push({text:line,size,color});line=word;}else line+=(line?' ':'')+word;}if(line)lines.push({text:line,size,color});};
    add('SESIÓN COMPLETADA',24,'#ff7784');add(session.routineName,52);add(session.date,26,'#9db6d8');add(' ',24);
    add(mass(volume)+' '+unit+' · tonelaje total',46,'#76b4ff');
    add(format(Math.max(0,(session.finishedAt-session.startedAt)/60000))+' min · '+sets.length+' series · '+done.length+' ejercicios',30);
    add('Músculos: '+(muscles||'Sin especificar'),28);add(' ',24);
    for(const e of done){add(e.name,36,'#76b4ff');add(e.sets.map(s=>e.type==='strength'?mass(s.weightKg)+' '+unit+' × '+s.reps+' ('+(s.type||'N')+')':format(s.durationSeconds)+' s'+(s.side?' · '+s.side:'')).join('   /   '));add('Descansos: '+e.sets.map(s=>format(s.actualRestSeconds??s.restSeconds)+' s').join(' / '),24,'#a9b9ce');}
    if(session.notes){add('Notas',32,'#ff7784');add(session.notes,26);}
    add('Descansos medidos cuando están disponibles; en otro caso, configurados.',22,'#a9b9ce');add('TNC FITNES · Un entrenamiento a la vez.',24,'#a9b9ce');
    canvas.height=Math.max(950,260+lines.reduce((n,l)=>n+l.size*1.55,0));
    ctx.fillStyle='#0a101b';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#15385f';ctx.fillRect(0,0,12,canvas.height);ctx.fillStyle='#ec283c';ctx.fillRect(12,0,7,canvas.height);
    const logo=new Image();await new Promise((resolve,reject)=>{logo.onload=resolve;logo.onerror=()=>reject(Error('No se pudo cargar el logo para la imagen.'));logo.src=new URL('tnc-logo.png',document.baseURI).href;});
    ctx.fillStyle='#fff';ctx.fillRect(78,44,300,150);ctx.drawImage(logo,78,44,300,150);ctx.font='bold 38px Arial';ctx.fillStyle='#fff';ctx.fillText('TNC FITNES',425,132);
    ctx.textBaseline='top';let y=235;for(const line of lines){ctx.font=`${line.size>=36?'bold ':''}${line.size}px Arial`;ctx.fillStyle=line.color;ctx.fillText(line.text,78,y);y+=line.size*1.55;}
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('No se pudo crear la imagen.');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='TNC-FITNES-sesion-'+session.date+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  root.FitnessSessionImage={download};
})(globalThis);
