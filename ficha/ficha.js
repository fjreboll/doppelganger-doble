/* Doppelgänger · Ficha (propuesta v0.2) — datos sintéticos y lógica. Sin red ni almacenamiento. */

const DOORS=[
 {id:1,name:"Padrón vía agregador",acc:"Libre, sin identificarse",note:"Padrón electoral publicado por Servel (2013 y 2020) y reutilizado por sitios como nombrerutyfirma. Entrega nombre, sexo, domicilio electoral, comuna y mesa."},
 {id:2,name:"Registro Civil",acc:"Libre, basta el RUN y un correo",note:"Certificados de nacimiento y matrimonio en línea. Agregan fecha y lugar de nacimiento, nombres de los padres y cónyuge."},
 {id:3,name:"SII terceros",acc:"Libre",note:"Situación tributaria de terceros: inicio de actividades y giros. Pendiente de verificación manual de campos."},
 {id:4,name:"Prestadores de Salud",acc:"Libre",note:"Registro Nacional de Prestadores Individuales: título, institución y año, buscable por RUT o nombre."},
 {id:5,name:"Mercado Público y Empresas",acc:"Libre",note:"Órdenes de compra a personas naturales y participación en sociedades."},
 {id:6,name:"Poder Judicial",acc:"Libre en parte, por nombre",note:"Causas buscables por nombre. Es la puerta de los homónimos: el agregador pega causas por coincidencia de nombre."},
 {id:7,name:"Deudores de alimentos",acc:"Cerrada: ClaveÚnica y solo partes",note:"El Registro Nacional de Deudores de Pensiones de Alimentos exige ClaveÚnica y solo lo consultan las partes, tribunales y órganos obligados. No entra a la ficha.",closed:true}
];
const CODE={"Santiago":"13101","La Pintana":"13112","Las Condes":"13114","Puente Alto":"13201"};
const NSE_COMUNA={"Vitacura":4,"Las Condes":4,"Lo Barnechea":4,"Providencia":4,"Ñuñoa":3,"La Reina":3,"Santiago":2,"Macul":2,"La Florida":2,"Maipú":2,"Peñalolén":2,"San Miguel":2,"Estación Central":2,"Independencia":2,"Recoleta":1,"Quilicura":1,"Puente Alto":1,"La Granja":1,"San Bernardo":1,"Pudahuel":1,"Renca":1,"El Bosque":1,"Lo Espejo":0,"Cerro Navia":0,"La Pintana":0};
const NSE_LBL=["bajo","medio-bajo","medio","medio-alto","alto"];
const CAL=[[1945,3.0],[1950,4.1],[1958,6.0],[1966,7.0],[1972,8.4],[1980,10.4],[1985,12.5],[1990,16.5],[1995,19.0],[2000,20.4]];
function edadPorRut(m){for(let i=1;i<CAL.length;i++){const[a,x]=CAL[i-1],[b,y]=CAL[i];if(m<=y)return Math.round(a+(m-x)/(y-x)*(b-a));}return 2000;}
function fmtRut(n,dvBad){const s=String(n).replace(/\B(?=(\d{3})+(?!\d))/g,".");return "SINT-"+s+"-"+dvBad;}

const P=[
 {nombre:"Camila Andrea Soto Pérez",sexo:"Femenino",nac:1991,lugar:"Puente Alto",rut:17612408,dv:"Q",padres:"Juan Soto Rojas · Patricia Pérez Lagos",civil:null,
  padron:{a:2013,comuna:"Puente Alto",mz:"041-07",mesa:"112"},actual:"Santiago",mud:2019,q:4,
  sii:"Inicio de actividades 2016 · servicios de kinesiología (honorarios)",prest:"Kinesióloga · universidad sintética · 2015",mp:null,pj:null,
  hechos:[[1991,"Nace en Puente Alto"],[2013,"Vota por primera vez, en Puente Alto"],[2015,"Se titula de kinesióloga"],[2016,"Empieza a emitir boletas de honorarios"],[2019,"Se muda a Santiago centro"],[2024,"Hogar en Santiago, quintil 4 de ingreso"]]},
 {nombre:"Jorge Luis Muñoz Contreras",sexo:"Masculino",nac:1958,lugar:"San Miguel",rut:6104337,dv:"Q",padres:"Luis Muñoz Vera · Elena Contreras Díaz",civil:"Casado en 1984 con Marta Ríos Salas",
  padron:{a:2013,comuna:"La Pintana",mz:"112-03",mesa:"27"},actual:"La Pintana",mud:null,q:2,
  sii:"Inicio de actividades 1999 · almacén de barrio",prest:null,mp:null,pj:{hom:true,causa:"Causa civil de cobranza, rol sintético C-•••-2019"},
  hechos:[[1958,"Nace en San Miguel"],[1984,"Se casa"],[1991,"Llega a La Pintana"],[1999,"Abre un almacén"],[2024,"Sigue en La Pintana, quintil 2"],[2025,"Nunca ha sido parte de una causa civil"]]},
 {nombre:"Valentina Ignacia Rojas Fuentes",sexo:"Femenino",nac:1985,lugar:"Providencia",rut:11903512,dv:"Q",padres:"Ignacio Rojas Mena · Carmen Fuentes Ulloa",civil:"Casada en 2016 con Pablo Araya Vidal",
  padron:{a:2013,comuna:"Las Condes",mz:"088-12",mesa:"301"},actual:"Puente Alto",mud:2017,q:3,
  sii:null,prest:null,mp:null,pj:null,
  hechos:[[1985,"Nace en Providencia"],[2013,"Vive con sus padres en Las Condes"],[2016,"Se casa"],[2017,"Se muda a Puente Alto con su pareja"],[2024,"Profesora, quintil 3"]]},
 {nombre:"Luis Alberto González Vera",sexo:"Masculino",nac:1972,lugar:"Santiago",rut:8400921,dv:"Q",padres:"Alberto González Paz · Rosa Vera Muñoz",civil:"Casado en 1998 · divorcio subinscrito en 2012",
  padron:{a:2013,comuna:"Santiago",mz:"019-04",mesa:"88"},actual:"Santiago",mud:null,q:3,
  sii:"Inicio de actividades 2005 · obras menores de construcción",prest:null,mp:"3 órdenes de compra municipales, 2021–2023 (montos sintéticos)",pj:null,
  hechos:[[1972,"Nace en Santiago"],[1998,"Se casa"],[2005,"Inicia actividades como contratista"],[2012,"Se divorcia"],[2021,"Primeros trabajos para el municipio"],[2024,"Sigue en Santiago, quintil 3"]]},
 {nombre:"Fernanda Belén Díaz Morales",sexo:"Femenino",nac:1997,lugar:"La Pintana",rut:19402176,dv:"Q",padres:"Marco Díaz Tapia · Silvia Morales Reyes",civil:null,
  padron:{a:2020,comuna:"La Pintana",mz:"057-02",mesa:"64"},actual:"Santiago",mud:2022,q:3,
  sii:null,prest:"Enfermera · universidad sintética · 2020",mp:null,pj:null,
  hechos:[[1997,"Nace en La Pintana"],[2013,"Tiene 16 años: no está en el padrón 2013"],[2020,"Aparece en el padrón 2020, aún en La Pintana"],[2020,"Se titula de enfermera"],[2022,"Se muda a Santiago, cerca del hospital"],[2024,"Quintil 3"]]},
 {nombre:"Héctor Manuel Silva Rivas",sexo:"Masculino",nac:1949,lugar:"Valparaíso",rut:3910455,dv:"Q",padres:"Manuel Silva Toro · Ana Rivas Gallardo",civil:"Casado en 1975 · viudo desde 2018",
  padron:{a:2013,comuna:"Las Condes",mz:"102-09",mesa:"14"},actual:"Las Condes",mud:null,q:5,
  sii:null,prest:null,mp:"Socio de una sociedad limitada desde 2014 (Registro de Empresas)",pj:null,
  hechos:[[1949,"Nace en Valparaíso"],[1975,"Se casa"],[1990,"Llega a Las Condes"],[2014,"Entra como socio a una sociedad"],[2018,"Enviuda"],[2024,"Quintil 5"]]},
 {nombre:"María José Herrera Castro",sexo:"Femenino",nac:1979,lugar:"Temuco",rut:15204118,dv:"Q",padres:"José Herrera Lillo · Gladys Castro Pino",civil:"Casada en 2003 con Raúl Pino Sáez",
  padron:{a:2013,comuna:"Puente Alto",mz:"133-05",mesa:"215"},actual:"Puente Alto",mud:null,q:1,late:true,
  sii:null,prest:null,mp:null,pj:null,
  hechos:[[1979,"Nace en Temuco"],[1987,"Es inscrita en el Registro Civil a los 8 años: su RUN es de una serie posterior"],[2003,"Se casa"],[2005,"Llega a Puente Alto"],[2024,"Quintil 1"]]},
 {nombre:"Diego Andrés Fernández Ruiz",sexo:"Masculino",nac:1993,lugar:"Santiago",rut:18301744,dv:"Q",padres:"Andrés Fernández Ortiz · Lorena Ruiz Bravo",civil:null,
  padron:{a:2013,comuna:"Santiago",mz:"011-15",mesa:"140"},actual:"Las Condes",mud:2020,q:5,
  sii:null,prest:"Médico cirujano · universidad sintética · 2019",mp:null,pj:null,
  hechos:[[1993,"Nace en Santiago"],[2013,"Estudiante, arrienda en Santiago centro"],[2019,"Se titula de médico"],[2020,"Se muda a Las Condes"],[2024,"Quintil 5"]]},
 {nombre:"Rosa Elena Pizarro Núñez",sexo:"Femenino",nac:1966,lugar:"La Granja",rut:6902261,dv:"Q",padres:"Pedro Pizarro Leiva · Elena Núñez Soto",civil:"Casada en 1987",
  padron:{a:2013,comuna:"La Pintana",mz:"076-01",mesa:"52"},actual:"La Pintana",mud:null,q:1,
  sii:null,prest:null,mp:null,pj:{hom:true,causa:"Causa civil de cobranza, rol sintético C-•••-2017"},
  hechos:[[1966,"Nace en La Granja"],[1987,"Se casa"],[1993,"Llega a La Pintana"],[2024,"Quintil 1"],[2025,"Nunca ha sido parte de una causa civil"]]},
 {nombre:"Matías Ignacio Vargas Lagos",sexo:"Masculino",nac:2000,lugar:"Puente Alto",rut:20110952,dv:"Q",padres:"Ignacio Vargas Peña · Paula Lagos Mora",civil:null,
  padron:{a:2020,comuna:"Puente Alto",mz:"021-11",mesa:"190"},actual:"Puente Alto",mud:null,q:2,
  sii:null,prest:null,mp:null,pj:null,
  hechos:[[2000,"Nace en Puente Alto"],[2020,"Aparece en el padrón 2020"],[2024,"Estudiante, vive con sus padres, quintil 2"]]}
];


/* ── lógica común (misma que el prototipo v0.2) ── */
const RECT='El agregador no declara canal de rectificación. Desde el 01-12-2026, la Ley 21.719 prevé derechos de rectificación y oposición ante el responsable.';
const FORM='Dispositivo Ficha, comparando ficha y trayectoria · reconocimiento institucional: ninguno';
const FORM_T='Tú, como titular, con lo que encontraste en cada puerta · queda solo en este navegador';
const TORSO=['#5B7BD5','#C0743F','#4E9A7C','#9A5BB5','#C9A13B','#3F8FB0','#B5566A','#6E8B3D','#8C6D5A','#5A6FA0'];
const HOY=2026;
const tramoDe=nac=>{const e=HOY-nac;return e<30?'15_29':e<45?'30_44':e<65?'45_64':'65';};
const TRAMO_LBL={'15_29':'15–29 años','30_44':'30–44 años','45_64':'45–64 años','65':'65 años o más'};
const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function build(p){
  const est=p.rut?edadPorRut(p.rut/1e6):null;
  const nseInf=NSE_COMUNA[p.padron.comuna], nseReal=p.q?p.q-1:null;
  const div={dom:!!(p.padron.comuna&&p.actual&&p.padron.comuna!==p.actual),nse:nseInf!=null&&nseReal!=null&&Math.abs(nseInf-nseReal)>=2,edad:est!=null&&p.nac&&Math.abs(est-p.nac)>5,hom:!!(p.pj&&p.pj.hom)};
  const dom=CODE[p.padron.comuna]&&p.padron.mz?`Manzana ${CODE[p.padron.comuna]}-${p.padron.mz}, ${p.padron.comuna}`:(p.padron.comuna||'No aparece en el padrón');
  const rows=[{d:1,k:'Nombre',v:p.nombre}];
  if(p.sexo) rows.push({d:1,k:'Sexo',v:p.sexo});
  rows.push({d:1,k:'Domicilio',v:dom,div:div.dom});
  if(p.padron.a) rows.push({d:1,k:'Votación',v:p.padron.mesa?`Mesa ${p.padron.mesa} · padrón ${p.padron.a}`:`Padrón ${p.padron.a}`});
  if(est!=null) rows.push({d:1,k:'Edad',v:`Nacimiento hacia ${est}, por número de RUT`,inf:true,div:div.edad});
  if(nseInf!=null) rows.push({d:1,k:'Nivel socioeconómico',v:`«${NSE_LBL[nseInf]}», por comuna de ${p.padron.comuna}`,inf:true,div:div.nse});
  if(p.nac) rows.push({d:2,k:'Nacimiento',v:p.lugar?`${p.nac}, ${p.lugar}`:String(p.nac),div:div.edad});
  if(p.padres) rows.push({d:2,k:'Padres',v:p.padres});
  if(p.civil) rows.push({d:2,k:'Matrimonio',v:p.civil});
  if(p.padron.comuna) rows.push({d:2,k:'Hogar',v:p.civil&&!/viudo|divorcio/.test(p.civil)?`Convive con cónyuge en ${p.padron.comuna}`:`Hogar en ${p.padron.comuna}`,inf:true,div:div.dom});
  if(p.sii) rows.push({d:3,k:'Actividad',v:p.sii});
  if(p.prest) rows.push({d:4,k:'Título',v:p.prest});
  if(p.prest||p.sii) rows.push({d:4,k:'Ingreso probable',v:p.prest&&/Médico/.test(p.prest)?'alto, por título':p.prest?'medio-alto, por título':'medio, por giro',inf:true});
  if(p.mp) rows.push({d:5,k:'Contratos y sociedades',v:p.mp});
  if(p.pj) rows.push({d:6,k:'Causas',v:p.pj.causa,div:div.hom});
  const af=p.titular?'Tú, como titular':`${p.nombre} [sintético]`;
  const reg=[];
  if(div.dom) reg.push({t:'Domicilio congelado',d:1,r:`Domicilio electoral en ${p.padron.comuna}, según padrón ${p.padron.a||'sin año'}`,dec:'Ubicar a la persona donde ya no vive: cobranza, notificaciones, evaluación de arriendo',o:`Vive en ${p.actual}${p.mud?` desde ${p.mud}`:''}`,af:p.titular?'Tú, y quienes viven hoy en la dirección antigua':`${p.nombre} [sintético] y quienes viven hoy en la manzana antigua`});
  if(div.nse) reg.push({t:'Nivel socioeconómico por estereotipo',d:1,r:`Nivel «${NSE_LBL[nseInf]}» asignado por la comuna de ${p.padron.comuna}`,dec:'Segmentación comercial y de riesgo que asigna el promedio de la comuna',o:`Hogar en quintil ${p.q} (${NSE_LBL[nseReal]})`,af});
  if(div.edad) reg.push({t:'Edad contradictoria',d:2,r:`Nacimiento hacia ${est} por número de RUT, junto a un certificado que dice ${p.nac}`,dec:'Errores de edad en perfiles, verificaciones y ofertas',o:p.late?`Nació en ${p.nac} y fue inscrita tarde; su RUN es de una serie posterior`:`Nació en ${p.nac}; la serie del RUT no corresponde a su año`,af});
  if(div.hom) reg.push({t:'Homónimo',d:6,r:`${p.pj.causa}, asociada por coincidencia de nombre`,dec:'Antecedentes judiciales atribuidos a quien no es parte',o:'La causa es de otra persona con el mismo nombre',af:p.titular?'Tú y tu homónimo':`${p.nombre} [sintético] y su homónimo`});
  return {rows,reg,div};
}
const B=P.map(build);
let T=null,TB=null,cur=0,step=7;
const $=id=>document.getElementById(id);
const person=()=>cur==='T'?T:P[cur], built=()=>cur==='T'?TB:B[cur];
const tok=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* figura: mismas proporciones que los integrantes de Vecindario (town.js, PROP_ADULTO).
   Sólida = la persona; punteada detrás = su doble en la ficha, en rojo si diverge. */
function figura(ctx,x,y,tramo,color,ghost,gc){
  const p={legW:4,legH:10,torW:14,torH:10,armW:4,armH:9,headW:11,headH:10,hairH:5,neckH:2},r=Math.round;
  const f=(c,X,Y,W,H)=>{if(ghost){ctx.strokeStyle=gc;ctx.setLineDash([1,1]);ctx.lineWidth=1;ctx.strokeRect(r(X)+.5,r(Y)+.5,W-1,H-1);}else{ctx.fillStyle=c;ctx.fillRect(r(X),r(Y),W,H);}};
  const piel='#D9A77F',pelo=tramo==='65'?'#C9CCD6':'#3A3F4A';let yy=y;
  if(!ghost){ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(x,y+1,p.torW/2.2,1.6,0,0,7);ctx.fill();}
  f('#2B2320',x-p.legW-1,yy-2,p.legW,2);f('#2B2320',x+1,yy-2,p.legW,2);
  f('#33363F',x-p.legW-1,yy-p.legH,p.legW,p.legH-2);f('#33363F',x+1,yy-p.legH,p.legW,p.legH-2);yy-=p.legH;
  f(color,x-p.torW/2,yy-p.torH,p.torW,p.torH);
  if(!ghost){ctx.fillStyle='rgba(0,0,0,.16)';ctx.fillRect(r(x+p.torW/2-3),r(yy-p.torH),3,p.torH);}
  f(color,x-p.torW/2-p.armW,yy-p.torH+1,p.armW,p.armH-2);f(color,x+p.torW/2,yy-p.torH+1,p.armW,p.armH-2);
  if(!ghost){f(piel,x-p.torW/2-p.armW,yy-p.torH+p.armH-1,p.armW,2);f(piel,x+p.torW/2,yy-p.torH+p.armH-1,p.armW,2);
    if(tramo==='15_29'){ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(r(x-p.torW/2-p.armW-5.5),r(yy-p.torH+1),5,6);}
    else if(tramo==='65'){ctx.fillStyle='#6B5A48';ctx.fillRect(r(x+p.torW/2+p.armW+1),r(yy-p.torH+p.armH-2),1.5,p.torH+p.legH-p.armH+2);}
    else{ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(r(x-p.torW/2-p.armW-3.5),r(yy-p.torH+p.armH-3),3.5,4.5);}}
  yy-=p.torH;f(piel,x-2,yy-p.neckH,4,p.neckH);yy-=p.neckH;f(piel,x-p.headW/2,yy-p.headH,p.headW,p.headH);
  if(!ghost){ctx.fillStyle='#1B1B1F';ctx.fillRect(r(x-3),r(yy-p.headH+4),1.5,1.5);ctx.fillRect(r(x+2),r(yy-p.headH+4),1.5,1.5);}
  f(pelo,x-p.headW/2-1,yy-p.headH-p.hairH+2,p.headW+2,p.hairH);
  if(!ghost){ctx.fillStyle=pelo;ctx.fillRect(r(x-p.headW/2-1),r(yy-p.headH),2,4);ctx.fillRect(r(x+p.headW/2-1),r(yy-p.headH),2,4);}
}
function retrato(cv,p,color,diverge){
  const W=42,H=45,ctx=cv.getContext('2d');cv.width=W;cv.height=H;ctx.clearRect(0,0,W,H);
  ctx.fillStyle=tok('--md-outline-variant');ctx.fillRect(0,H-6,W,1);
  const tramo=p.nac?tramoDe(p.nac):'30_44';
  figura(ctx,15,H-7,tramo,color,true,diverge?tok('--viz-critical'):tok('--md-outline'));
  figura(ctx,25,H-7,tramo,color,false);
}

function renderStats(){
  const withDiv=B.filter(b=>b.reg.length).length,total=B.reduce((s,b)=>s+b.reg.length,0),dom=B.filter(b=>b.div.dom).length,open=DOORS.filter(d=>!d.closed).length;
  $('stats').innerHTML=[['difference',`${open} de ${DOORS.length}`,'puertas sin ClaveÚnica'],['report',`${withDiv} de 10`,'fichas con divergencia'],['my_location',`${dom} de 10`,'domicilios que ya no corresponden'],['rule',String(total),'entradas en el registro']]
    .map(([ic,v,l])=>`<span class="chip assist"><span class="material-symbols-outlined">${ic}</span><b>${v}</b>&nbsp;${l}</span>`).join('');
}
function renderPeople(){
  $('people').innerHTML=P.map((p,i)=>{const n=B[i].reg.length;return `<button class="chip" aria-pressed="${i===cur}" data-i="${i}"><span class="swatch" style="background:${TORSO[i]}"></span>FS-${String(i+1).padStart(2,'0')} · ${esc(p.nombre.split(' ')[0])}${n?` <span class="ndiv">${n}</span>`:''}</button>`}).join('')
   +`<button class="chip tit" aria-pressed="${cur==='T'}" data-i="T"><span class="material-symbols-outlined">add</span>Tu caso</button>`;
}
function renderCard(){
  const p=person(),b=built(),tit=cur==='T',code=tit?'FS-TITULAR':'FS-'+String(cur+1).padStart(2,'0'),n=b?b.reg.length:0;
  const tramo=p&&p.nac?TRAMO_LBL[tramoDe(p.nac)]:'edad no ingresada';
  if(tit&&!T){$('idcard').innerHTML=`<div class="idbody" style="grid-column:1/-1"><div class="idtop"><span class="code">FS-TITULAR</span><span class="badge pri">titular · solo en este navegador</span></div><h2 class="title-l">Tu caso</h2><p class="body-m muted">Completa el formulario de abajo con lo que encontraste al recorrer las puertas con tu propio RUT.</p></div>`;return;}
  const F=tit?[['RUT','Ingresado, no se muestra'],['Nacimiento',p.nac||'—'],['Padrón',p.padron.comuna?`${p.padron.comuna} · ${p.padron.a||'—'}`:'No aparece'],['Vive hoy',p.actual||'—'],['Quintil',p.q||'No declarado']]
    :[['RUT',fmtRut(p.rut,p.dv)],['Nacimiento',`${p.nac}, ${p.lugar}`],['Padrón',`${p.padron.comuna} · ${p.padron.a}`],['Vive hoy',p.actual],['Quintil',p.q]];
  $('idcard').innerHTML=`<div class="retrato"><canvas id="cv" role="img" aria-label="Retrato de ${esc(p.nombre)} y, punteado, su doble en la ficha"></canvas><span class="body-s muted">punteado: su doble en la ficha</span></div>
    <div class="idbody">
      <div class="idtop"><span class="code">${code}${tit?'':` · caso ${cur+1} de 10`}</span><span class="badge ${tit?'pri':'sec'}">${tit?'titular · solo en este navegador':'caso compuesto'}</span></div>
      <h2 class="title-l">${esc(p.nombre)}</h2>
      <div class="chip-set"><span class="chip assist">${esc(p.actual||p.padron.comuna||'comuna no ingresada')}</span><span class="chip assist">${tramo}</span><span class="chip assist">${n?`<span class="swatch" style="background:var(--viz-critical)"></span>${n} divergencia${n>1?'s':''}`:'sin divergencias'}</span></div>
      <dl class="kvs">${F.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      <div class="seam"><b>Costura</b> · ${tit?'datos ingresados por el titular · sin red ni almacenamiento':'RUT con prefijo SINT y DV inválido · nombre y manzana sintéticos · no es una persona real'}</div>
    </div>`;
  retrato($('cv'),p,tit?tok('--md-primary'):TORSO[cur],n>0);
}
function render(){
  $('titform').hidden=cur!=='T';renderCard();renderPeople();
  const p=person(),b=built();
  if(!b){['doors','ficha','tray','reg'].forEach(id=>$(id).innerHTML='');$('doornote').textContent='Arma tu ficha con el formulario.';$('fcount').textContent='';$('reghead').textContent='Registro de divergencias';return;}
  $('doors').innerHTML=DOORS.map(d=>d.closed?`<span class="chip assist closed" title="${d.acc}"><span class="material-symbols-outlined">do_not_disturb_on</span>${d.id} · ${d.name}</span>`:`<button class="chip" aria-pressed="${d.id<=step}" data-d="${d.id}" title="${d.acc}">${d.id} · ${d.name}</button>`).join('');
  const last=DOORS.find(d=>d.id===Math.min(Math.max(step,1),7));
  $('doornote').innerHTML=step===0?'Solo se tiene el RUT. Abre la primera puerta para empezar la ficha.':`<b>${last.name}.</b> ${last.acc}. ${last.note}`;
  $('next').disabled=step>=7;
  const vis=b.rows.filter(r=>r.d<=step);
  $('fcount').textContent=`${vis.length} campos · ${vis.filter(r=>r.div).length} divergentes`;
  $('ficha').innerHTML=vis.length?vis.map(r=>`<div class="kv ${r.inf?'inf':''} ${r.div?'div':''}"><span class="k">${r.k}</span><span class="v">${esc(r.v)}</span><span class="src">P${r.d}</span></div>`).join(''):'<p class="body-m muted">Ficha vacía. Con el RUT solo se puede empezar a preguntar.</p>';
  $('tray').innerHTML=p.hechos.map(([y,t])=>`<div class="kv"><span class="k">${esc(y)}</span><span class="v">${esc(t)}</span></div>`).join('');
  const shown=b.reg.filter(e=>e.d<=step);
  $('reghead').textContent=`Registro de divergencias · ${shown.length} entrada${shown.length===1?'':'s'}`;
  $('reg').innerHTML=shown.length?shown.map((e,i)=>`<article class="card outlined case">
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span class="label-m muted" style="font-family:var(--mono)">${cur==='T'?'FS-TITULAR':'FS-'+String(cur+1).padStart(2,'0')}-D${i+1}</span><span class="badge sec">${cur==='T'?'titular':'caso compuesto'}</span></div>
    <div class="chip-set"><span class="chip assist"><span class="swatch" style="background:var(--viz-critical)"></span>${e.t}</span><span class="chip assist">puerta ${e.d}</span></div>
    <div class="fields">
      <span class="num">1</span><div><div class="lab">Qué representó</div>${esc(e.r)}</div>
      <span class="num">2</span><div><div class="lab">Qué decisión habilita</div>${e.dec}</div>
      <span class="num">3</span><div><div class="lab">Qué ocurrió</div>${esc(e.o)}</div>
      <span class="num">4</span><div><div class="lab">Quién resultó afectado</div>${esc(e.af)}</div>
      <span class="num">5</span><div><div class="lab">Qué reparación hubo</div>${RECT}</div>
      <span class="num">6</span><div><div class="lab">Quién la formuló</div>${cur==='T'?FORM_T:FORM}</div>
    </div></article>`).join(''):`<p class="body-m muted">${step<7?'Aún no aparecen divergencias con las puertas abiertas.':'La ficha coincide con la trayectoria. Aun así expone domicilio, padres y vínculos de alguien que no pidió estar ahí.'}</p>`;
}

/* modo titular: en memoria, sin red ni almacenamiento */
$('comunas').innerHTML=Object.keys(NSE_COMUNA).sort((a,b)=>a.localeCompare(b,'es')).map(c=>`<option value="${c}">`).join('');
const num=v=>{const n=parseInt(String(v).replace(/\D/g,''),10);return Number.isFinite(n)?n:null;};
$('titform').addEventListener('submit',e=>{
  e.preventDefault();const v=id=>$(id).value.trim(),c=id=>$(id).checked;
  const raw=v('t-rut').replace(/[^\dkK]/g,''),rut=num(raw.length>8?raw.slice(0,-1):raw);
  const nac=num(v('t-nac')),pa=num(v('t-pa')),mud=num(v('t-mud')),q=num(v('t-q')),pcom=pa?v('t-pcom'):'',act=v('t-act');
  T={titular:true,nombre:v('t-nombre')||'Titular',nac,rut:rut&&rut>1e6?rut:null,padron:{a:pa,comuna:pcom},actual:act,mud,q,
    padres:c('t-padres')?'Constan en el certificado (valor no ingresado)':null,civil:c('t-matr')?'Consta matrimonio y cónyuge (valor no ingresado)':null,
    sii:c('t-sii')?'Constan inicio de actividades y giros (valor no ingresado)':null,prest:c('t-prest')?'Consta título e institución (valor no ingresado)':null,
    mp:c('t-mp')?'Constan contratos o sociedades (valor no ingresado)':null,
    pj:c('t-pj')?{hom:c('t-pjno'),causa:c('t-pjno')?'Causa asociada por nombre (detalle no ingresado)':'Causa propia (detalle no ingresado)'}:null};
  const h=[];if(nac)h.push([nac,'Naces']);if(pa)h.push([pa,`Apareces en el padrón ${pa}${pcom?`, en ${pcom}`:''}`]);if(act)h.push([mud||'hoy',`Vives en ${act}`]);if(q)h.push([HOY,`Hogar en quintil ${q}, según tu declaración`]);
  if(T.pj)h.push(['—',T.pj.hom?'Las causas encontradas por tu nombre no son tuyas':'Las causas encontradas son tuyas']);
  T.hechos=h.length?h.sort((a,b)=>(+a[0]||9999)-(+b[0]||9999)):[['—','Sin datos ingresados']];
  TB=build(T);step=7;render();
});
$('t-clear').addEventListener('click',()=>{$('titform').reset();T=null;TB=null;render();});
$('people').addEventListener('click',e=>{const t=e.target.closest('.chip');if(!t)return;cur=t.dataset.i==='T'?'T':+t.dataset.i;if(cur!=='T')step=7;render();});
$('doors').addEventListener('click',e=>{const t=e.target.closest('button.chip');if(!t)return;step=+t.dataset.d;render();});
$('next').addEventListener('click',()=>{if(step<7){step++;render();}});
$('restart').addEventListener('click',()=>{step=0;render();});
$('all').addEventListener('click',()=>{step=7;render();});
addEventListener('scroll',()=>$('appbar').classList.toggle('scrolled',scrollY>4),{passive:true});
renderStats();render();
