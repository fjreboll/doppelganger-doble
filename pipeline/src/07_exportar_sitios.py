"""07 · Exporta los datos de la base común a los dos sitios estáticos (GitHub Pages)."""
import json, math, shutil, pandas as pd
from comun import *

def limpio(x):
    if isinstance(x, float) and math.isnan(x): return None
    if isinstance(x, dict): return {k: limpio(v) for k, v in x.items()}
    if isinstance(x, list): return [limpio(v) for v in x]
    return x

con = conectar()
rd = lambda s: pd.read_sql(s, con)
SITIOS = RAIZ.parent.parent  # carpeta que contiene ambos repositorios
A, C = SITIOS / "doppelganger-doble", SITIOS / "doppelganger-encargo"
for d in (A, C):
    (d / "assets").mkdir(parents=True, exist_ok=True)
    shutil.copy(RAIZ.parent / "assets" / "d3.v7.min.js", d / "assets" / "d3.v7.min.js") if d != RAIZ.parent else None
    (d / ".nojekyll").write_text("")

# ── A · DOBLE
res = pd.read_csv(SALIDAS / "doble_resumen_comunal.csv").fillna(0)
serie = pd.read_csv(SALIDAS / "doble_serie_mensual.csv")
conf = pd.read_csv(SALIDAS / "doble_confianza_por_vigintil.csv")
cal = pd.read_csv(SALIDAS / "calibracion_poblacion.csv")
val = json.loads((SALIDAS / "validacion.json").read_text())
loc = rd("""select json_extract(afectado,'$.comuna') comuna, tipologia, locus, count(*) n
            from divergencia where tipologia!='deriva' group by 1,2,3""")
acc = rd("select parametros, n_evaluados, n_positivas, n_divergencias, ejecutada_en from accion").iloc[0]
casos = []
for (t, l), _ in loc.groupby(["tipologia", "locus"]):
    for r in rd(f"select * from divergencia where tipologia='{t}' and locus='{l}' order by random() limit 3").to_dict("records"):
        for k in ["representacion", "ocurrido", "afectado", "formulacion"]:
            r[k] = json.loads(r[k])
        r.pop("creada_en"); casos.append(r)
datos_a = dict(
    generado=HOY, totales=dict(hogares=int(acc.n_evaluados), decisiones=int(rd("select count(*) n from decision").n[0]),
                                divergencias=int(acc.n_divergencias), priorizados=int(acc.n_positivas)),
    parametros=json.loads(acc.parametros), resumen=res.round(5).to_dict("records"), serie=serie.round(5).to_dict("records"),
    confianza=conf.confianza.round(4).tolist(), locus=loc.to_dict("records"), casos=casos,
    calibracion=cal.round(5).to_dict("records"), validacion=val,
    autorregistro=rd("select componente, que_registro, efecto, inexactitud, correccion, deteccion from autorregistro where componente like 'A%' order by id").to_dict("records"),
    fuentes=rd("select id, nombre, institucion, anio_referencia, via_acceso, plano_evidencia, url, nota_homologacion from fuente where id in ('casen2022','censo2024_tab','sae2022','supuesto_poc')").to_dict("records"))
(A / "data.json").write_text(json.dumps(limpio(datos_a), ensure_ascii=False, default=str, allow_nan=False))

# ── C · Grafo del encargo
FAM = {"Institucion": "estado", "Unidad": "estado", "Programa": "programa", "Empresa": "privado", "Comite": "asesoria",
       "Instrumento": "instrumento", "Norma": "instrumento", "PersonaRol": "persona", "Territorio": "territorio",
       "Resultado": "resultado", "Ausencia": "ausencia"}
obj = rd("""select o.id, o.tipo, o.nombre, o.atributos, o.plano_evidencia, o.fuente_id, f.nombre fuente, f.url, f.via_acceso, f.fecha_publicacion
            from objeto o join fuente f on f.id=o.fuente_id""")
obj["familia"] = obj.tipo.map(FAM)
obj["atributos"] = obj.atributos.map(lambda x: json.loads(x or "{}"))
vin = rd("""select v.id, v.origen source, v.destino target, v.tipo, v.fecha, v.cita, v.plano_evidencia, v.fuente_id, f.nombre fuente, f.url
            from vinculo v join fuente f on f.id=v.fuente_id""")
datos_c = dict(generado=HOY, nodos=obj.to_dict("records"), vinculos=vin.to_dict("records"),
               tipos=rd("select * from tipo_objeto").to_dict("records"),
               fuentes=rd("select id, nombre, institucion, anio_referencia, fecha_publicacion, via_acceso, plano_evidencia, url, nota_homologacion from fuente where id not in ('casen2022','censo2024_tab','sae2022','supuesto_poc')").to_dict("records"),
               autorregistro=rd("select componente, que_registro, efecto, inexactitud, correccion, deteccion, metrica from autorregistro where componente like 'C%' order by id").to_dict("records"),
               ia_res=pd.read_csv(SALIDAS / "res_constituciones_ia_por_anio.csv").to_dict("records"))
(C / "data.json").write_text(json.dumps(limpio(datos_c), ensure_ascii=False, default=str, allow_nan=False))
print("A:", round((A / "data.json").stat().st_size / 1024), "KB · C:", round((C / "data.json").stat().st_size / 1024), "KB ·", len(casos), "casos")
