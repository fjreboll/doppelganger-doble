"""09 · Contexto comunal: Registro Social de Hogares (SINIM 2023) y tipología de vivienda (Censo 2024).

RSH: distribución de los hogares inscritos por tramo de Calificación Socioeconómica (CSE), por comuna.
Fuente SINIM (Subdere), variables 4624–4630, año 2023, vía espejo github.com/bastianolea/sinim_info_municipal@2e61363.
Vivienda: Censo 2024, tabulado V5 (casas y departamentos por comuna).
Uso: contrastar la priorización del registro análogo de DOBLE con la distribución real del RSH, y dibujar casas y
edificios en el banner según la tipología censal.
"""
import json, sys, pandas as pd
from comun import *

SINIM = Path(sys.argv[1] if len(sys.argv) > 1 else "/home/claude/src/sinim_info_municipal/datos/sinim_2019-2023.xlsx")
V5 = RAW / "censo2024_tabulados" / "V5_Tipologias-de-viviendas-censadas.xlsx"
SITIOS = [Path(p) for p in sys.argv[2:]] or [RAIZ.parent / "sitios" / "doppelganger-doble"]
TRAMOS = {4624: "0-40", 4625: "41-50", 4626: "51-60", 4627: "61-70", 4628: "71-80", 4629: "81-90", 4630: "91-100"}

con = conectar()  # contexto_comunal vive en db/schema.sql (creada por 01_ingesta.py vía iniciar_db)
con.execute("DELETE FROM contexto_comunal")
con.execute("DELETE FROM autorregistro WHERE componente='A·contexto'")
fuente(con, id="sinim_rsh2023", nombre="SINIM · Registro Social de Hogares, hogares por tramo de CSE (2023)", institucion="Subdere · SINIM (fuente primaria: MDSF)",
       url="https://datos.sinim.gov.cl", anio_referencia="2023", via_acceso="espejo:github.com/bastianolea/sinim_info_municipal@2e61363",
       licencia="Datos públicos", plano_evidencia="documentado",
       nota_homologacion="La etiqueta SINIM dice 'respecto del total regional', pero en 2023 los siete tramos suman 100% dentro de cada comuna (52/52 comunas RM): se usan como distribución comunal. Base: hogares inscritos en el RSH, no el total de hogares.")
fuente(con, id="censo2024_v5", nombre="Censo 2024 · V5 tipologías de vivienda por comuna", institucion="INE", url="https://censo2024.ine.gob.cl/resultados/",
       anio_referencia="2024", via_acceso="espejo:github.com/bastianolea/censo_2024@a83fd7b", licencia="Datos públicos INE", plano_evidencia="documentado")

x = pd.read_excel(SINIM)
r = x[x.variable_id.isin(TRAMOS) & (x["año"] == 2023) & x.cut_comuna.astype(str).isin(COMUNAS_PILOTO)]
filas = [(str(c), "rsh_tramo_share", TRAMOS[v], float(val) / 100, "sinim_rsh2023") for c, v, val in r[["cut_comuna", "variable_id", "valor"]].itertuples(index=False)]
suma = r.groupby("cut_comuna").valor.sum()

d = pd.read_excel(V5, "2", header=3)
d = d[pd.to_numeric(d.iloc[:, 4], errors="coerce").notna()]
d["cut"] = d.iloc[:, 4].astype(float).astype(int).astype(str)
d = d[d.cut.isin(COMUNAS_PILOTO)]
for _, q in d.iterrows():
    tot = q["Viviendas censadas"]
    casas = q["Casa con acceso directo desde la calle"] + q["Casa en condominio cerrado"]
    deptos = q["Departamento en edificio con ascensor"] + q["Departamento en edificio sin ascensor"]
    filas += [(q.cut, "vivienda_share", "casa", float(casas / tot), "censo2024_v5"), (q.cut, "vivienda_share", "departamento", float(deptos / tot), "censo2024_v5"),
              (q.cut, "vivienda_share", "otra", float(1 - (casas + deptos) / tot), "censo2024_v5")]
con.executemany("INSERT INTO contexto_comunal VALUES (?,?,?,?,?)", filas)

# contraste con el registro análogo (t24)
res = pd.read_csv(SALIDAS / "doble_resumen_comunal.csv")
ctx = pd.DataFrame(filas, columns=["cut", "variable", "categoria", "valor", "fuente"])
rsh40 = ctx[(ctx.variable == "rsh_tramo_share") & (ctx.categoria == "0-40")].set_index("cut").valor
viv = ctx[ctx.variable == "vivienda_share"].pivot(index="cut", columns="categoria", values="valor")
nombre_a_cut = {v: k for k, v in COMUNAS_PILOTO.items()}
res["cut"] = res.comuna.map(nombre_a_cut)
res["rsh_tramo40"] = res.cut.map(rsh40)
res["brecha_pp"] = (res.priorizados_registro - res.rsh_tramo40) * 100
autorregistro(con, componente="A·contexto", que_registro="Contraste del registro análogo con el RSH real (SINIM 2023)",
              efecto="Tercera práctica de conocimiento en la comparación registro / situado",
              inexactitud="Bases distintas: el RSH cubre hogares inscritos (no todos) y su corte es 2023; el análogo prioriza sobre hogares sintéticos a t+24. "
                          f"Diferencias análogo − RSH (p.p.): " + ", ".join(f"{c} {b:+.1f}" for c, b in zip(res.comuna, res.brecha_pp)) +
                          ". Etiqueta SINIM 'respecto del total regional' contradicha por los datos (suman 100% por comuna)",
              metrica=res[["comuna", "priorizados_registro", "rsh_tramo40", "brecha_pp"]].round(4).to_dict("records"),
              alcance="4 comunas piloto", deteccion="Suma de tramos por comuna (52/52 = 100% ± 0,2)",
              correccion="Solicitar al MDSF la serie RSH por tramo y fecha de corte; usar hogares inscritos como denominador explícito")
con.commit()

extra = {COMUNAS_PILOTO[c]: dict(rsh={k: round(float(v), 4) for k, v in ctx[(ctx.cut == c) & (ctx.variable == "rsh_tramo_share")].set_index("categoria").valor.items()},
                                 vivienda={k: round(float(v), 4) for k, v in viv.loc[c].items()}) for c in COMUNAS_PILOTO}
for sitio in SITIOS:
    p = sitio / "data.json"; D = json.loads(p.read_text())
    D["contexto"] = extra
    D["fuentes"] = [f for f in D["fuentes"] if f["id"] not in ("sinim_rsh2023", "censo2024_v5")] + \
        json.loads(pd.read_sql("select id, nombre, institucion, anio_referencia, via_acceso, plano_evidencia, url, nota_homologacion from fuente where id in ('sinim_rsh2023','censo2024_v5')", con).to_json(orient="records", force_ascii=False))
    D["autorregistro"] = json.loads(pd.read_sql("select componente, que_registro, efecto, inexactitud, correccion, deteccion from autorregistro where componente like 'A%' order by id", con).to_json(orient="records", force_ascii=False))
    p.write_text(json.dumps(D, ensure_ascii=False, default=str, allow_nan=False))
print(res[["comuna", "priorizados_registro", "rsh_tramo40", "brecha_pp"]].round(3).to_string(index=False)); print(viv.round(3))
