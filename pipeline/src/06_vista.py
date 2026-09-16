"""06 · Vista de evaluación: contrainterfaz DOBLE (A) + grafo del encargo (C) + autorregistro, en un HTML autocontenido."""
import json, pandas as pd
from comun import *

con = conectar()
rd = lambda s: pd.read_sql(s, con)

res = pd.read_csv(SALIDAS / "doble_resumen_comunal.csv").fillna(0)
conf = pd.read_csv(SALIDAS / "doble_confianza_por_vigintil.csv")
cal = pd.read_csv(SALIDAS / "calibracion_poblacion.csv")
val = json.loads((SALIDAS / "validacion.json").read_text())
tip = rd("select tipologia, locus, count(*) n from divergencia group by 1,2 order by 3 desc")

casos = []
for (t, l), _ in tip.groupby(["tipologia", "locus"]):
    for r in rd(f"select * from divergencia where tipologia='{t}' and locus='{l}' order by random() limit 2").to_dict("records"):
        for k in ["representacion", "ocurrido", "afectado", "formulacion"]:
            r[k] = json.loads(r[k])
        casos.append(r)

obj = rd("select o.id, o.tipo, o.nombre, o.atributos, o.plano_evidencia, f.nombre fuente, f.url, f.via_acceso from objeto o join fuente f on f.id=o.fuente_id")
vin = rd("select v.origen source, v.destino target, v.tipo, v.fecha, v.cita, f.nombre fuente, f.url from vinculo v join fuente f on f.id=v.fuente_id")
auto = rd("select componente, que_registro, efecto, inexactitud, correccion, deteccion from autorregistro order by id")
fu = rd("select id, nombre, institucion, anio_referencia, via_acceso, plano_evidencia, url, nota_homologacion from fuente")

DATA = dict(resumen=res.to_dict("records"), confianza=conf.confianza.round(3).tolist(), calibracion=cal.to_dict("records"),
            validacion=val, tipologia=tip.to_dict("records"), casos=casos,
            nodos=obj.assign(atributos=obj.atributos.map(lambda x: json.loads(x or "{}"))).to_dict("records"),
            vinculos=vin.to_dict("records"), autorregistro=auto.to_dict("records"), fuentes=fu.to_dict("records"),
            totales=dict(hogares=int(rd("select count(*) n from hogar_sintetico").n[0]), divergencias=int(rd("select count(*) n from divergencia").n[0]),
                         decisiones=int(rd("select count(*) n from decision").n[0])))

HTML = r"""<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Doppelganger POC</title>
<script>__D3__</script>
<style>
:root{--bg:#f6f5f1;--panel:#fff;--ink:#1d1d1b;--mute:#6b6a64;--line:#dedbd2;--acc:#b4441f;--acc2:#2f5d8a;--ok:#2f7a4f;--warn:#b4441f;--seam:#b4441f}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#151514;--panel:#1f1f1d;--ink:#ecebe6;--mute:#9d9b93;--line:#34332f;--acc:#e0764f;--acc2:#7fa9d6;--ok:#6cc08f;--warn:#e0764f;--seam:#e0764f}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
header{padding:28px 16px 8px;max-width:1180px;margin:auto}h1{font-size:26px;margin:0 0 4px;letter-spacing:-.01em}
.sub{color:var(--mute);max-width:820px}
nav{max-width:1180px;margin:12px auto 0;padding:0 16px;display:flex;gap:6px;flex-wrap:wrap}
nav button{border:1px solid var(--line);background:var(--panel);color:var(--ink);padding:7px 12px;border-radius:999px;cursor:pointer;font:inherit}
nav button.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}
main{max-width:1180px;margin:auto;padding:16px}section{display:none}section.on{display:block}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))}
.card{min-width:0;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px}
.k{font-size:28px;font-weight:650}.lab{color:var(--mute);font-size:13px}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--mute);font-weight:500}td.n{text-align:right;font-variant-numeric:tabular-nums}
.bar{height:8px;background:var(--line);border-radius:4px;overflow:hidden}.bar i{display:block;height:100%;background:var(--acc2)}
.seam{border-left:3px dashed var(--seam);padding-left:10px;margin:8px 0}
.tag{display:inline-block;font-size:12px;padding:1px 7px;border-radius:999px;border:1px solid var(--line);color:var(--mute);margin-right:4px}
.tag.a{color:var(--acc);border-color:var(--acc)}
h2{font-size:18px;margin:22px 0 8px}h3{font-size:15px;margin:0 0 6px}
.f6{display:grid;grid-template-columns:112px minmax(0,1fr);gap:4px 10px;font-size:13.5px;overflow-wrap:anywhere}.f6 b{color:var(--mute);font-weight:500}
#g{width:100%;height:620px;background:var(--panel);border:1px solid var(--line);border-radius:10px}
#info{min-height:120px}.ok{color:var(--ok)}.bad{color:var(--warn)}
.conf{display:flex;gap:2px;align-items:flex-end;height:90px}.conf div{flex:1;background:var(--acc2);border-radius:2px 2px 0 0}
.overflow{overflow-x:auto}
</style></head><body>
<header><h1>Doppelganger · POC</h1>
<div class="sub">Base común del registro público de divergencias. <b>A · DOBLE</b>: un gemelo sintético de cuatro comunas (CASEN 2022 recalibrada a Censo 2024) donde cada decisión lleva costura y cada discrepancia queda registrada. <b>C · Grafo del encargo</b>: la ontología de fusión aplicada al Estado y sus proveedores, con las ausencias como objetos. Todo caso es compuesto.</div></header>
<nav id="tabs"></nav><main id="main"></main>
<script>
const D = __DATA__;
const fmt = new Intl.NumberFormat('es-CL'); const pct = x => (100*x).toFixed(1).replace('.',',')+'%';
const secs = [['a','A · DOBLE'],['casos','Casos del registro'],['c','C · Grafo del encargo'],['auto','Autorregistro'],['val','Validación y fuentes']];
const nav = document.getElementById('tabs'), main = document.getElementById('main');
secs.forEach(([id,l],i)=>{const b=document.createElement('button');b.textContent=l;b.onclick=()=>show(id);b.dataset.id=id;nav.append(b);
  const s=document.createElement('section');s.id='s-'+id;main.append(s)});
function show(id){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.id===id));
  document.querySelectorAll('section').forEach(s=>s.classList.toggle('on',s.id==='s-'+id)); if(id==='c') drawGraph();}
const esc = s => String(s??'—').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

// A
(()=>{const T=D.totales; let h=`<div class="grid">
 <div class="card"><div class="k">${fmt.format(T.hogares)}</div><div class="lab">hogares sintéticos (= hogares censados 2024)</div></div>
 <div class="card"><div class="k">${fmt.format(T.decisiones)}</div><div class="lab">decisiones con costura obligatoria</div></div>
 <div class="card"><div class="k">${fmt.format(T.divergencias)}</div><div class="lab">entradas en el registro de divergencias</div></div></div>
 <h2>Registro frente a vida situada, por comuna (t + 24 meses)</h2><div class="card overflow"><table><tr><th>Comuna</th><th>Hogares</th><th>Prioriza el registro</th><th>Elegible situado</th><th>Divergencia t0</th><th>Divergencia t24</th><th>Desactualizada</th><th>Falso +</th><th>Falso −</th></tr>`;
 D.resumen.forEach(r=>{h+=`<tr><td>${r.comuna}</td><td class="n">${fmt.format(r.hogares)}</td><td class="n">${pct(r.priorizados_registro)}</td><td class="n">${pct(r.elegibles_situado)}</td><td class="n">${pct(r.divergencia_t0)}</td><td class="n"><b>${pct(r.divergencia)}</b></td><td class="n">${pct(r.base_desactualizada)}</td><td class="n">${pct(r.falso_positivo)}</td><td class="n">${pct(r.falso_negativo)}</td></tr>`});
 h+=`</table><p class="lab">Tipologías como proporción de las divergencias de cada comuna. Regla análoga compuesta (percentil 40 de ingreso equivalente), no el algoritmo CSE-RSH.</p></div>
 <h2>La costura: confianza que el propio sistema podría conocer</h2><div class="card"><div class="conf">${D.confianza.map((c,i)=>`<div title="vigintil ${i*5}–${i*5+5}: ${pct(c)}" style="height:${c*100}%"></div>`).join('')}</div>
 <div class="lab" style="display:flex;justify-content:space-between"><span>percentil 0 del registro</span><span>umbral 40 ↓ confianza mínima</span><span>100</span></div>
 <p class="lab">P(la clasificación situada coincide con la registrada | vigintil del registro), estimada en CASEN 2022. Junto al umbral la decisión es casi un volado; ninguna interfaz operativa lo muestra.</p></div>
 <h2>Locus de las divergencias</h2><div class="card overflow"><table><tr><th>Tipología</th><th>Locus situado</th><th>Entradas</th><th></th></tr>`;
 const mx=Math.max(...D.tipologia.map(t=>t.n)); D.tipologia.forEach(t=>{h+=`<tr><td>${t.tipologia}</td><td>${t.locus}</td><td class="n">${fmt.format(t.n)}</td><td style="width:30%"><div class="bar"><i style="width:${100*t.n/mx}%"></i></div></td></tr>`});
 document.getElementById('s-a').innerHTML=h+'</table></div>';})();

// casos
(()=>{let h='<p class="sub">Muestra estratificada del registro: dos entradas por tipología y locus, con los seis campos. La costura (lo que la interfaz operativa oculta) va marcada con borde discontinuo.</p><div class="grid">';
 D.casos.forEach(c=>{const R=c.representacion,O=c.ocurrido,A=c.afectado,F=c.formulacion;
  h+=`<div class="card"><h3>${esc(c.id)}</h3><span class="tag a">${c.tipologia}</span><span class="tag">${esc(c.locus)}</span><span class="tag">${c.estatuto}</span>
  <div class="f6" style="margin-top:8px"><b>1 · Representó</b><span>${esc(R.prediccion ?? R.regla)} ${R.percentil_registro!==undefined?`(p${R.percentil_registro})`:''}</span>
  <b>2 · Decidió</b><span>${esc(c.decision)}</span>
  <b>3 · Ocurrió</b><span>${O.percentil_situado!==undefined?`percentil situado ${O.percentil_situado}; ${O.reside_en_comuna?'reside en la comuna':'se mudó'}; ${O.numper_real} personas`:esc(O.situacion)}${O.eventos_mes&&Object.keys(O.eventos_mes).length?'<br>eventos: '+Object.entries(O.eventos_mes).map(([k,v])=>k+' (mes '+v+')').join(', '):''}</span>
  <b>4 · Afectado</b><span>${A.comuna?`hogar de ${A.numper} en ${A.comuna}, tenencia ${A.tenencia}`:esc(A.n_hogares+' hogares')}</span>
  <b>5 · Reparación</b><span>${esc(c.reparacion ?? 'ninguna')}</span>
  <b>6 · Formulación</b><span>${esc(F.quien)} · reconocimiento: ${esc(F.reconocimiento_institucional)}</span></div>
  ${R.confianza!==undefined?`<div class="seam lab">costura · confianza ${pct(R.confianza)} · antigüedad ${R.antiguedad_meses} meses · umbral ${R.umbral} · ${esc(R.procedencia)}</div>`:''}</div>`});
 document.getElementById('s-casos').innerHTML=h+'</div>';})();

// C
document.getElementById('s-c').innerHTML=`<p class="sub">Nodos: ${D.nodos.length} · vínculos: ${D.vinculos.length}. Las <b>ausencias</b> (rojo, borde discontinuo) son lo que el encargo no documenta. Toque un nodo o vínculo para ver su fuente y cita.</p>
 <svg id="g"></svg><div id="info" class="card" style="margin-top:10px"><span class="lab">Seleccione un elemento.</span></div><div id="leyenda" class="lab" style="margin-top:6px"></div>`;
let drawn=false;
function drawGraph(){ if(drawn||!window.d3) return; drawn=true;
 const svg=d3.select('#g'), W=svg.node().clientWidth, H=620, css=getComputedStyle(document.documentElement);
 const tipos=[...new Set(D.nodos.map(n=>n.tipo))]; const pal=['#2f5d8a','#7a8f3a','#8a5a9e','#c28a1e','#3a8f86','#9e5a5a','#5a6e9e','#6b6a64','#a0742e','#4f7f4f','#b4441f','#7b6fae'];
 const col=t=>t==='Ausencia'?css.getPropertyValue('--acc'):pal[tipos.indexOf(t)%pal.length];
 document.getElementById('leyenda').innerHTML=tipos.map(t=>`<span class="tag" style="border-color:${col(t)};color:${col(t)}">${t}</span>`).join('');
 const nodes=D.nodos.map(d=>({...d})), links=D.vinculos.map(d=>({...d}));
 const deg={}; links.forEach(l=>{deg[l.source]=(deg[l.source]||0)+1;deg[l.target]=(deg[l.target]||0)+1});
 const sim=d3.forceSimulation(nodes).force('link',d3.forceLink(links).id(d=>d.id).distance(d=>d.target.id==='PRG-SITIA'&&d.source.id.startsWith('MUN-')?55:110)).force('charge',d3.forceManyBody().strength(-480))
  .force('center',d3.forceCenter(W/2,H/2)).force('x',d3.forceX(W/2).strength(.04)).force('y',d3.forceY(H/2).strength(.06)).force('collide',d3.forceCollide(24));
 const g=svg.append('g'); svg.call(d3.zoom().scaleExtent([.3,4]).on('zoom',e=>g.attr('transform',e.transform)));
 const L=g.append('g').selectAll('line').data(links).join('line').attr('stroke',d=>d.tipo==='carece_de'||d.tipo==='asimetria_con'?css.getPropertyValue('--acc'):css.getPropertyValue('--line'))
  .attr('stroke-width',1.6).attr('stroke-dasharray',d=>d.tipo==='carece_de'?'4 3':null).style('cursor','pointer').on('click',(e,d)=>info(`<h3>${esc(d.source.nombre)} → <i>${esc(d.tipo)}</i> → ${esc(d.target.nombre)}</h3><div class="seam">${esc(d.cita)}</div><div class="lab">${esc(d.fecha)} · <a href="${d.url||'#'}" target="_blank" rel="noopener">${esc(d.fuente)}</a></div>`));
 const N=g.append('g').selectAll('g').data(nodes).join('g').style('cursor','pointer').call(d3.drag().on('start',(e,d)=>{if(!e.active)sim.alphaTarget(.3).restart();d.fx=d.x;d.fy=d.y}).on('drag',(e,d)=>{d.fx=e.x;d.fy=e.y}).on('end',(e,d)=>{if(!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null}))
  .on('click',(e,d)=>info(`<h3>${esc(d.nombre)}</h3><span class="tag a">${d.tipo}</span><span class="tag">${d.plano_evidencia}</span><pre style="white-space:pre-wrap;font-size:12.5px">${esc(JSON.stringify(d.atributos,null,1))}</pre><div class="lab">fuente: <a href="${d.url||'#'}" target="_blank" rel="noopener">${esc(d.fuente)}</a> · acceso: ${esc(d.via_acceso)}</div>`));
 N.append('circle').attr('r',d=>5+Math.sqrt(deg[d.id]||1)*2.2).attr('fill',d=>d.tipo==='Ausencia'?'transparent':col(d.tipo)).attr('stroke',d=>col(d.tipo)).attr('stroke-width',2).attr('stroke-dasharray',d=>d.tipo==='Ausencia'?'3 2':null);
 N.append('title').text(d=>d.nombre);
 N.append('text').text(d=>d.id.startsWith('MUN-')?'':d.nombre.split(' · ')[0].split(' (')[0].slice(0,30)).attr('x',10).attr('y',4).attr('font-size',10.5).attr('fill',css.getPropertyValue('--mute'));
 sim.on('end',()=>{const b=g.node().getBBox(),k=Math.min(W/(b.width+60),H/(b.height+60),1.2);svg.transition().duration(500).call(d3.zoom().on('zoom',e=>g.attr('transform',e.transform)).transform,d3.zoomIdentity.translate(W/2-k*(b.x+b.width/2),H/2-k*(b.y+b.height/2)).scale(k))});
 sim.on('tick',()=>{L.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);N.attr('transform',d=>`translate(${d.x},${d.y})`)});
}
const info=h=>document.getElementById('info').innerHTML=h;

// autorregistro
(()=>{let h='<p class="sub">El registro también diverge: cada componente declara qué registró, qué efecto produjo, qué resultó inexacto y cómo corregirlo.</p>';
 D.autorregistro.forEach(a=>{h+=`<div class="card" style="margin-bottom:10px"><span class="tag a">${esc(a.componente)}</span><h3 style="margin-top:6px">${esc(a.que_registro)}</h3>
  <div class="f6"><b>Efecto</b><span>${esc(a.efecto)}</span><b>Inexactitud</b><span>${esc(a.inexactitud)}</span><b>Detección</b><span>${esc(a.deteccion)}</span><b>Corrección</b><span>${esc(a.correccion ?? 'no requerida')}</span></div></div>`});
 document.getElementById('s-auto').innerHTML=h;})();

// validación + fuentes
(()=>{let h='<h2>Pruebas</h2><div class="card overflow"><table><tr><th></th><th>Prueba</th><th>Detalle</th></tr>';
 D.validacion.forEach(v=>{h+=`<tr><td class="${v.ok?'ok':'bad'}">${v.ok?'✓':'✗'}</td><td>${esc(v.prueba)}</td><td class="lab">${esc(typeof v.detalle==='object'?JSON.stringify(v.detalle):v.detalle)}</td></tr>`});
 h+='</table></div><h2>Calibración y holdout</h2><div class="card overflow"><table><tr><th>Comuna</th><th>Donantes CASEN</th><th>Efectivos</th><th>Pesos g</th><th>Hacin. crítico sint./Censo</th><th>Pobreza ingr. sint./SAE [IC]</th></tr>';
 D.calibracion.forEach(c=>{h+=`<tr><td>${c.comuna}</td><td class="n">${c.donantes}</td><td class="n">${Math.round(c.donantes_efectivos)}</td><td class="n">${c.g_min.toFixed(2)}–${c.g_max.toFixed(2)}</td><td class="n">${pct(c.hac_crit_sint)} / ${pct(c.hac_crit_censo)}</td><td class="n">${pct(c.pobreza_ing_sint)} / ${pct(c.pobreza_sae)} [${pct(c.sae_li)}–${pct(c.sae_ls)}]</td></tr>`});
 h+='</table></div><h2>Fuentes</h2><div class="card overflow"><table><tr><th>Fuente</th><th>Año</th><th>Acceso</th><th>Plano</th><th>Nota</th></tr>';
 D.fuentes.forEach(f=>{h+=`<tr><td>${f.url?`<a href="${f.url}" target="_blank" rel="noopener">${esc(f.nombre)}</a>`:esc(f.nombre)}<div class="lab">${esc(f.institucion)}</div></td><td>${esc(f.anio_referencia)}</td><td class="lab">${esc(f.via_acceso)}</td><td>${f.plano_evidencia}</td><td class="lab">${esc(f.nota_homologacion)}</td></tr>`});
 document.getElementById('s-val').innerHTML=h+'</table></div>';})();
show('a');
</script></body></html>"""
out = SALIDAS / "doppelganger_poc_vista.html"
D3 = (RAIZ.parent / "assets" / "d3.v7.min.js").read_text()
out.write_text(HTML.replace("__DATA__", json.dumps(DATA, ensure_ascii=False, default=str)).replace("<script>__D3__</script>", "<script>" + D3 + "</script>"))
print(out, round(out.stat().st_size / 1024), "KB")
