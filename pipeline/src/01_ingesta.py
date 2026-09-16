"""01 · Ingesta: fuentes, objetivos censales 2024 y donantes CASEN 2022.

Homologación temporal declarada: la estructura de hogares e ingresos proviene de CASEN 2022
(levantamiento nov-2022 a feb-2023) y se recalibra a los márgenes comunales del Censo 2024.
La distancia de ~2 años es en sí misma una divergencia del gemelo, y se autorregistra.
"""
import numpy as np, pandas as pd
from comun import *

con = iniciar_db(reset=True)

# ───────── Fuentes ─────────
ESPEJO_CASEN = "espejo:github.com/bastianolea/casen_comparador_ingresos@9c5af8a"
ESPEJO_CENSO = "espejo:github.com/bastianolea/censo_2024@a83fd7b"
ESPEJO_HUB = "espejo:github.com/cortega26/chile-hub@e8e07d1"
fuente(con, id="casen2022", nombre="Encuesta CASEN 2022 · base de microdatos", institucion="Ministerio de Desarrollo Social y Familia",
       url="https://observatorio.ministeriodesarrollosocial.gob.cl/encuesta-casen-2022", anio_referencia="2022",
       fecha_publicacion="2023", via_acceso=ESPEJO_CASEN, licencia="Datos públicos anonimizados MDSF",
       plano_evidencia="documentado",
       nota_homologacion="Microdato más reciente accesible. CASEN 2024 publicó resultados, pero sus microdatos no fueron accesibles desde el entorno de la POC; el pipeline acepta el reemplazo directo.")
fuente(con, id="censo2024_tab", nombre="Censo de Población y Vivienda 2024 · tabulados comunales (D1, D5, H1, V3)", institucion="INE",
       url="https://censo2024.ine.gob.cl/resultados/", anio_referencia="2024", fecha_publicacion="2025",
       via_acceso=ESPEJO_CENSO, licencia="Datos públicos INE", plano_evidencia="documentado",
       nota_homologacion="Categorías de tenencia y hacinamiento difieren de CASEN; ver tabla de equivalencias en 01_ingesta.py.")
fuente(con, id="sae2022", nombre="Estimaciones comunales de pobreza (SAE) 2022", institucion="Observatorio Social · MDSF",
       url="https://observatorio.ministeriodesarrollosocial.gob.cl/", anio_referencia="2022", fecha_publicacion="2023-2024",
       via_acceso=ESPEJO_HUB, licencia="Datos públicos MDSF", plano_evidencia="documentado",
       nota_homologacion="Usada solo como validación externa (holdout), con intervalos de confianza.")
fuente(con, id="res_empresas", nombre="Registro de Empresas y Sociedades (RES)", institucion="Ministerio de Economía",
       url="https://www.registrodeempresasysociedades.cl/", anio_referencia="2013-2026", via_acceso=ESPEJO_HUB,
       licencia="Datos abiertos", plano_evidencia="documentado",
       nota_homologacion="Cubre sociedades constituidas por Ley 20.659 (desde 2013); no incluye sociedades anteriores.")
fuente(con, id="supuesto_poc", nombre="Supuestos de simulación no calibrados", institucion="POC Doppelganger",
       via_acceso="interno", plano_evidencia="hipotesis",
       nota_homologacion="Parámetros explícitos a reemplazar por flujos ENE-INE, AFC y actualizaciones RSH.")

# ───────── Censo 2024: objetivos comunales ─────────
T = RAW / "censo2024_tabulados"
def hoja(archivo, h):
    d = pd.read_excel(T / archivo, h, header=3)
    d = d[pd.to_numeric(d.iloc[:, 4], errors="coerce").notna()].copy()
    d["cut"] = d.iloc[:, 4].astype(float).astype(int).astype(str)
    return d[d.cut.isin(COMUNAS_PILOTO)]

filas = []
edad = hoja("D1_Poblacion-censada-por-sexo-y-edad-en-grupos-quinquenales.xlsx", "4")
edad = edad[edad["Grupos de edad"] != "Total Comuna"].copy()
lim = edad["Grupos de edad"].str.extract(r"^(\d+)")[0].astype(int)
edad["g"] = pd.cut(lim, [-1, 14, 29, 44, 64, 200], labels=["n0_14", "n15_29", "n30_44", "n45_64", "n65"])
for (cut, g), v in edad.groupby(["cut", "g"], observed=True)["Población censada"].sum().items():
    filas.append((cut, "personas_edad", g, float(v), "censo2024_tab", "calibracion"))

ten = hoja("H1_Servicios-basicos-hogar-y-tenencia-vivienda.xlsx", "8")
# Equivalencias Censo 2024 → CASEN 2022 (v13)
EQ_TEN = {"propia": ["Propia pagada", "Propia pagándose"],
          "arrendada": ["Arrendada con contrato", "Arrendada sin contrato"],
          "cedida_usufructo": ["Cedida por trabajo o servicio", "Cedida por familiar u otro", "Usufructo: solo uso y goce"],
          "irregular_otra": ["Ocupada de hecho", "Propiedad en sucesión y litigio", "Tenencia de la vivienda no declarada"]}
for _, r in ten.iterrows():
    filas.append((r.cut, "hogares", "total", float(r["Hogares censados"]), "censo2024_tab", "calibracion"))
    for k, cols in EQ_TEN.items():
        filas.append((r.cut, "tenencia", k, float(r[cols].sum()), "censo2024_tab", "calibracion"))

hac = hoja("V3_N-de-dormitorios-hacinamiento-y-viv-con-mas-de-un-hogar.xlsx", "4")
for _, r in hac.iterrows():
    tot = r.iloc[7:10].sum()
    for k, c in zip(["sin", "medio", "critico"], hac.columns[7:10]):
        filas.append((r.cut, "hacinamiento_share", k, float(r[c] / tot), "censo2024_tab", "validacion"))

mig = hoja("D5_Migracion-interna.xlsx", "2")
for _, r in mig.iterrows():
    pob, nomig, nonac = r.iloc[6], r.iloc[7], r.iloc[8]
    filas.append((r.cut, "migrante_5a_share", "llegados", float((pob - nomig - nonac) / (pob - nonac)), "censo2024_tab", "calibracion"))

sae = pd.read_json(RAW / "chile_hub" / "pobreza_comunal.json", dtype={"codigo_comuna": str})
sae = sae[sae.codigo_comuna.isin(COMUNAS_PILOTO)]
for _, r in sae.iterrows():
    for q in ["tasa", "limite_inferior", "limite_superior"]:
        filas.append((r.codigo_comuna, f"pobreza_{r.dimension}", q, float(r[q]) / 100, "sae2022", "validacion"))

con.executemany("INSERT INTO censo_objetivo VALUES (?,?,?,?,?,?)", filas)

# ───────── CASEN 2022: donantes a nivel hogar ─────────
# Visibilidad administrativa (análogo al cruce RSH con SII, AFC, IPS): supuesto explícito
OTROS_REG = ["yre1h", "yre2h", "yre3h", "yamah", "yah1h", "yah2h", "yruth", "ydesh", "yidsh", "ydimh", "yfamh"]   # arriendos, capital, utilidades, cesantía, indemnización, devolución impuestos, asignación familiar
OTROS_NOREG = ["yfa1h", "yfa2h", "ymesh", "ytroh", "yta1h", "yta2h", "ydonh", "yotrh", "yac2h"]                      # transferencias familiares, pensión de alimentos, ocasionales, donaciones, autoconsumo
cols = ["folio", "region", "cut_comuna", "expr", "expc", "pco1", "numper", "edad", "v13", "ind_hacina",
        "ytotcorh", "ytrabajocor", "ytrabajocorh", "cotiza", "activ", "ysubh", "y2803h", "yinv02h", "yotph",
        "pobreza", "pobreza_multi_5d", "o14"] + OTROS_REG + OTROS_NOREG
c = pd.read_parquet(RAW / "casen2022.parquet", columns=cols)
for v in ["pco1", "v13", "ind_hacina", "cotiza", "activ", "pobreza", "pobreza_multi_5d", "region", "o14"]:
    c[v] = c[v].astype(str)
c["g"] = pd.cut(c.edad, [-1, 14, 29, 44, 64, 200], labels=["n0_14", "n15_29", "n30_44", "n45_64", "n65"])
c["visible"] = c.cotiza.eq("Sí") | c.o14.str.startswith(("1.", "2."))   # cotiza o emite boleta/factura (SII)
c["formal"] = np.where(c.visible, c.ytrabajocor.fillna(0), 0.0)
c["ocup_formal"] = (c.activ.eq("Ocupados") & c.visible).astype(int)
c["ocup_informal"] = (c.activ.eq("Ocupados") & ~c.visible).astype(int)

per = c.groupby("folio").agg(y_formal=("formal", "sum"), ocup_formal=("ocup_formal", "sum"), ocup_informal=("ocup_informal", "sum"))
eda = pd.crosstab(c.folio, c.g)
jefe = c[c.pco1.str.startswith("1.")].set_index("folio")
h = jefe[["region", "cut_comuna", "expr", "expc", "numper", "v13", "ind_hacina", "ytotcorh", "ytrabajocorh",
          "ysubh", "y2803h", "yinv02h", "yotph", "pobreza", "pobreza_multi_5d"] + OTROS_REG].join(per).join(eda)
h = h.fillna({k: 0 for k in ["ysubh", "y2803h", "yinv02h", "yotph", "ytotcorh", "ytrabajocorh"] + OTROS_REG})
h["y_pension"] = h.y2803h + h.yinv02h + h.yotph
h["y_subsidio"] = h.ysubh
h["y_informal"] = (h.ytrabajocorh - h.y_formal).clip(lower=0)
h["y_otros_reg"] = h[OTROS_REG].sum(axis=1)
h["y_otros_no_reg"] = (h.ytotcorh - h.ytrabajocorh - h.y_pension - h.y_subsidio - h.y_otros_reg).clip(lower=0)
MAP_TEN = {"1. Propia": "propia", "2. Arrendada": "arrendada", "3. Cedida": "cedida_usufructo",
           "9. Usufructo (sólo uso y goce)": "cedida_usufructo", "10. Ocupación irregular (de hecho)": "irregular_otra",
           "11. Poseedor irregular": "irregular_otra"}
h["tenencia"] = h.v13.map(MAP_TEN).fillna("irregular_otra")
h["hacinamiento"] = np.select([h.ind_hacina.str.startswith("Sin"), h.ind_hacina.str.contains("crítico"),
                               h.ind_hacina.str.contains("medio|alto")], ["sin", "critico", "medio"], "ignorado")
h = h.reset_index()
h.to_parquet(INTERIM / "casen2022_hogares.parquet")

autorregistro(con, componente="A·ingesta", que_registro="Equivalencia de categorías Censo 2024 ↔ CASEN 2022",
              efecto="Calibración por tenencia en 4 grupos y validación de hacinamiento en 3 grupos",
              inexactitud="Censo agrupa hacinamiento medio y alto (CASEN los separa); 'Propiedad en sucesión' y 'no declarada' se asignan a irregular_otra sin categoría espejo en CASEN",
              alcance="Todas las comunas piloto", deteccion="Lectura comparada de libros de códigos",
              correccion="Documentado; sustituir por microdatos Censo 2024 (publicados dic-2025) para homologar a nivel de registro")
con.commit()
print("hogares CASEN:", len(h), "| piloto:", h.cut_comuna.isin(COMUNAS_PILOTO).sum())
print(pd.read_sql("select * from censo_objetivo", con).pivot_table(index=["variable", "categoria"], columns="comuna_cut", values="valor").round(3))
