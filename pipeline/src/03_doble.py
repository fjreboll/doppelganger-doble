"""03 · DOBLE: el registro que decide y la vida que diverge (contra-Foundry con costuras).

Dos prácticas de conocimiento sobre el mismo hogar sintético:
  · REGISTRO  → lo que un sistema administrativo puede ver: trabajo con cotización (promedio móvil
                12 meses), pensiones, subsidios y composición declarada (actualización intermitente).
  · SITUADO   → lo que el hogar vive: además ingreso informal, otros ingresos no registrables,
                mudanzas y cambios de composición en el mes en que ocurren.
La regla de decisión es un análogo compuesto (NO el algoritmo RSH/CSE): priorizar hogares bajo el
percentil 40 de ingreso equivalente, con cortes calibrados en CASEN 2022 nacional.
Cada decisión lleva costura obligatoria; cada discrepancia entra al registro con sus seis campos.
"""
import numpy as np, pandas as pd, uuid, datetime as dt
from comun import *

con = conectar()
rng = np.random.default_rng(SEMILLA + 1)
H = pd.read_parquet(INTERIM / "casen2022_hogares.parquet")
S = pd.read_parquet(INTERIM / "hogares_sinteticos_t0.parquet")
obj = pd.read_sql("select * from censo_objetivo", con)
ESC = 0.7          # escala de equivalencia (supuesto)
UMBRAL = 40.0
MESES = 24         # brecha CASEN 2022 → Censo 2024

PARAM = {  # supuestos explícitos (fuente 'supuesto_poc'); a calibrar con ENE-INE, AFC, RSH
    "p_perdida_formal_mes": 0.010, "p_informal_tras_perdida_mes": 0.08, "fraccion_ingreso_informal": 0.6,
    "p_formalizacion_mes": 0.008, "p_nacimiento_mes": 0.0015, "p_salida_miembro_mes": 0.002,
    "p_actualiza_composicion_mes": 0.04, "p_actualiza_domicilio_mes": 0.03, "ventana_ingreso_registro_meses": 12,
    "p_mudanza_mes": "derivada de Censo 2024 D5 (llegados en 5 años por comuna)"}

# ───────── cortes nacionales (CASEN 2022, factor regional) ─────────
def eq(y, n): return y / np.power(np.maximum(n, 1), ESC)
H["e_sit"] = eq(np.maximum(H.ytotcorh, H.y_formal + H.y_informal + H.y_otros_reg + H.y_otros_no_reg + H.y_pension + H.y_subsidio), H.numper)
H["e_reg"] = eq(H.y_formal + H.y_pension + H.y_subsidio + H.y_otros_reg, H.numper)

def ecdf(vals, w):
    o = np.argsort(vals); v, c = vals[o], np.cumsum(w[o]); c = c / c[-1] * 100
    return lambda x: np.interp(x, v, c)

pct_sit, pct_reg = ecdf(H.e_sit.values, H.expr.values.astype(float)), ecdf(H.e_reg.values, H.expr.values.astype(float))
H["p_sit"], H["p_reg"] = pct_sit(H.e_sit.values), pct_reg(H.e_reg.values)
# confianza que el propio sistema podría estimar: P(clasificación situada = registrada | vigintil del registro)
H["vig"] = np.minimum((H.p_reg // 5).astype(int), 19)
H["acierto"] = ((H.p_sit < UMBRAL) == (H.p_reg < UMBRAL)).astype(float)
conf_vig = H.groupby("vig").apply(lambda d: np.average(d.acierto, weights=d.expr)).reindex(range(20)).fillna(1.0).values

# ───────── simulación de 24 meses ─────────
N = len(S)
formal = S.y_formal.values.astype(float).copy(); informal = S.y_informal.values.astype(float).copy()
otros = S.y_otros_no_reg.values.astype(float); oreg = S.y_otros_reg.values.astype(float); pen = S.y_pension.values.astype(float); sub = S.y_subsidio.values.astype(float)
numper = S.numper.values.astype(int).copy(); numper_reg = numper.copy()
ocf = np.maximum(S.ocup_formal.values, (formal > 0).astype(int))
hist_formal = np.tile(formal, (PARAM["ventana_ingreso_registro_meses"], 1))
se_mudo = np.zeros(N, bool); dom_vigente = np.ones(N, bool); ult_act = np.zeros(N, int)
ev = {k: np.full(N, -1) for k in ["perdida_formal", "ingreso_informal", "formalizacion", "cambio_composicion", "mudanza"]}
share = obj[obj.variable == "migrante_5a_share"].set_index("comuna_cut").valor
p_mud = S.cut_comuna.map(lambda c: 1 - (1 - share[c]) ** (1 / 60)).values

def marcar(k, m, mes):
    ev[k] = np.where(m & (ev[k] < 0), mes, ev[k])

perdio = np.zeros(N, bool); monto_perdido = np.zeros(N)
comuna_arr = S.cut_comuna.map(COMUNAS_PILOTO).values
serie = []
def medir(mes):
    pr = pct_reg(eq(hist_formal.mean(axis=0) + oreg + pen + sub, numper_reg)) < UMBRAL
    el = (pct_sit(eq(formal + informal + oreg + otros + pen + sub, numper)) < UMBRAL) & ~se_mudo
    d = pd.DataFrame(dict(comuna=comuna_arr, div=pr != el, fp=pr & ~el, fn=~pr & el, mud=se_mudo, desact=numper_reg != numper))
    for c, g in d.groupby("comuna"):
        serie.append(dict(mes=mes, comuna=c, divergencia=g["div"].mean(), falso_positivo=g.fp.mean(), falso_negativo=g.fn.mean(),
                          mudados=g.mud.mean(), composicion_desactualizada=g.desact.mean()))
medir(0)
for mes in range(1, MESES + 1):
    u = rng.random((8, N))
    m = (formal > 0) & (u[0] < PARAM["p_perdida_formal_mes"])
    cuota = np.where(m, formal / np.maximum(ocf, 1), 0); formal -= cuota; ocf = np.maximum(ocf - m, 0)
    perdio |= m; monto_perdido += cuota; marcar("perdida_formal", m, mes)
    m2 = perdio & (monto_perdido > 0) & (u[1] < PARAM["p_informal_tras_perdida_mes"])
    informal += np.where(m2, monto_perdido * PARAM["fraccion_ingreso_informal"], 0); monto_perdido[m2] = 0; marcar("ingreso_informal", m2, mes)
    m3 = (informal > 0) & (u[2] < PARAM["p_formalizacion_mes"])
    formal += np.where(m3, informal, 0); ocf += m3; informal[m3] = 0; marcar("formalizacion", m3, mes)
    nac = u[3] < PARAM["p_nacimiento_mes"]; sal = (numper > 1) & (u[4] < PARAM["p_salida_miembro_mes"])
    numper += nac.astype(int) - sal.astype(int); marcar("cambio_composicion", nac | sal, mes)
    mud = (~se_mudo) & (u[5] < p_mud); se_mudo |= mud; marcar("mudanza", mud, mes)
    act_c = u[6] < PARAM["p_actualiza_composicion_mes"]; numper_reg[act_c] = numper[act_c]; ult_act[act_c] = mes
    act_d = se_mudo & dom_vigente & (u[7] < PARAM["p_actualiza_domicilio_mes"]); dom_vigente[act_d] = False; ult_act[act_d] = mes
    hist_formal = np.vstack([hist_formal[1:], formal])
    medir(mes)
pd.DataFrame(serie).to_csv(SALIDAS / "doble_serie_mensual.csv", index=False)

formal_reg = hist_formal.mean(axis=0)
e_sit_t0 = eq(S.y_formal + S.y_informal + S.y_otros_reg + S.y_otros_no_reg + pen + sub, S.numper).values
e_reg_t0 = eq(S.y_formal + S.y_otros_reg + pen + sub, S.numper).values
e_sit = eq(formal + informal + oreg + otros + pen + sub, numper)
e_reg = eq(formal_reg + oreg + pen + sub, numper_reg)
p_sit_t0, p_reg_t0, p_sit, p_reg = pct_sit(e_sit_t0), pct_reg(e_reg_t0), pct_sit(e_sit), pct_reg(e_reg)
# contrafactual: el registro con datos al día (sin rezago) — para distinguir desactualización de no-registrabilidad
p_reg_aldia = pct_reg(eq(formal + oreg + pen + sub, numper))

prior_reg = (p_reg < UMBRAL)  # el registro prioriza según su domicilio registrado (mudanzas no actualizadas incluidas)
elegible_sit = (p_sit < UMBRAL) & ~se_mudo      # programa comunal: requiere residir en la comuna
conf = conf_vig[np.minimum((p_reg // 5).astype(int), 19)]
antig = MESES - ult_act

# ───────── acción + decisiones con costura + divergencias ─────────
ahora = dt.datetime.now().isoformat(timespec="seconds")
acc_id = "ACC-PRIORIZA-" + ahora[:10]
con.execute("DELETE FROM decision"); con.execute("DELETE FROM divergencia"); con.execute("DELETE FROM accion"); con.execute("DELETE FROM hogar_sintetico")
con.execute("DELETE FROM autorregistro WHERE componente='A·doble'")

hog = pd.DataFrame(dict(id=S.id, comuna_cut=S.cut_comuna, donante_folio=S.folio.astype(int), estatuto="caso_compuesto",
                        numper_t0=S.numper, n0_14=S.n0_14, n15_29=S.n15_29, n30_44=S.n30_44, n45_64=S.n45_64, n65=S.n65,
                        tenencia=S.tenencia, hacinamiento=S.hacinamiento, y_formal_t0=S.y_formal, y_informal_t0=S.y_informal,
                        y_pension=pen, y_subsidio=sub, numper_t24=numper, y_formal_t24=formal.round(-2), y_informal_t24=informal.round(-2),
                        se_mudo=se_mudo.astype(int), numper_reg=numper_reg, y_formal_reg=formal_reg.round(-2),
                        domicilio_reg_vigente=dom_vigente.astype(int), meses_sin_actualizar=antig))
con.execute("INSERT INTO hogar_sintetico SELECT * FROM hog")  # bulk (ver nota de rendimiento en 03_doble.py cabecera)

diverge = prior_reg != elegible_sit
tipos, locus = np.empty(N, object), np.empty(N, object)
misma_t0 = ((p_reg_t0 < UMBRAL) != (p_sit_t0 < UMBRAL))
no_reg = (S.y_informal.values + S.y_otros_no_reg.values) > 0
for i in np.where(diverge)[0]:
    if se_mudo[i] and prior_reg[i]:
        tipos[i], locus[i] = "base_desactualizada", "movilidad_residencial"
    elif (prior_reg[i] != (p_reg_aldia[i] < UMBRAL)) or numper_reg[i] != numper[i]:
        tipos[i], locus[i] = "base_desactualizada", ("composicion_hogar" if numper_reg[i] != numper[i] else "rezago_ingreso_formal")
    else:
        tipos[i] = "falso_positivo" if prior_reg[i] else "falso_negativo"
        locus[i] = "ingreso_no_registrable" if (no_reg[i] or informal[i] > 0) else "posicion_relativa_en_ranking"

PROC = "trabajo con cotización o boleta (prom. 12m) · rentas y capital declarados · pensiones · subsidios · composición declarada"
filas_dec, filas_div = [], []
for i in range(N):
    div_id = None
    if diverge[i]:
        div_id = f"DIV-{S.id[i]}"
        eventos = {k: int(v[i]) for k, v in ev.items() if v[i] > 0}
        filas_div.append((div_id, "caso_compuesto", "DOBLE · priorización comunal (análogo compuesto)", tipos[i], locus[i],
            j({"prediccion": "tramo ≤40" if prior_reg[i] else "tramo >40", "percentil_registro": round(float(p_reg[i]), 1),
               "confianza": round(float(conf[i]), 3), "umbral": UMBRAL, "procedencia": PROC, "antiguedad_meses": int(antig[i]),
               "numper_registrado": int(numper_reg[i])}),
            "prioriza prestación" if prior_reg[i] else "no prioriza",
            j({"percentil_situado": round(float(p_sit[i]), 1), "reside_en_comuna": bool(~se_mudo[i]), "numper_real": int(numper[i]),
               "ingreso_informal_t24": float(round(informal[i], -2)), "eventos_mes": eventos}),
            j({"tipo": "hogar_sintetico", "id": S.id[i], "comuna": COMUNAS_PILOTO[S.cut_comuna[i]], "numper": int(numper[i]),
               "tenencia": S.tenencia[i]}),
            None,
            j({"quien": "simulación DOBLE (modelamiento situado compuesto)", "evidencia": "estado situado simulado vs registro",
               "practica": "comparación entre prácticas de conocimiento", "reconocimiento_institucional": "ninguno"}),
            acc_id, S.id[i], ahora))
    filas_dec.append((acc_id, S.id[i], int(prior_reg[i]), float(round(p_reg[i], 2)), float(round(conf[i], 3)), int(antig[i]), UMBRAL, PROC, div_id))

con.execute("INSERT INTO accion VALUES (?,?,?,?,?,?,?,?,?)", (acc_id, "priorizar_prestacion_comunal", "DOBLE",
            j({"umbral_percentil": UMBRAL, "escala_equivalencia": ESC, "cortes": "CASEN 2022 nacional (expr)", **PARAM}),
            MESES, ahora, N, int(prior_reg.sum()), int(diverge.sum())))
# Bulk vía DataFrame + replacement scan, no executemany fila a fila: en DuckDB (a diferencia de
# SQLite) executemany/to_sql insertan de a una fila y son ~300-400x más lentas a este volumen
# (130k-560k filas); medido en el prototipo de Fase 1, ver notas de la migración.
COLS_DIV = ["id", "estatuto", "sistema", "tipologia", "locus", "representacion", "decision", "ocurrido",
            "afectado", "reparacion", "formulacion", "accion_id", "objeto_ref", "creada_en"]
COLS_DEC = ["accion_id", "hogar_id", "resultado", "percentil_reg", "confianza", "antiguedad_meses", "umbral", "procedencia", "divergencia_id"]
df_div = pd.DataFrame(filas_div, columns=COLS_DIV)
df_dec = pd.DataFrame(filas_dec, columns=COLS_DEC)
con.execute("INSERT INTO divergencia SELECT * FROM df_div")
con.execute("INSERT INTO decision SELECT * FROM df_dec")

# divergencia de sistema: umbrales 2022 aplicados a 2024
con.execute("INSERT INTO divergencia VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (f"DIV-SISTEMA-DERIVA-{ahora[:10]}", "caso_compuesto",
    "DOBLE · priorización comunal (análogo compuesto)", "deriva", "umbral_calibrado_en_otro_tiempo",
    j({"regla": "percentil 40 de ingreso equivalente", "cortes_calibrados_con": "CASEN 2022 (nov-2022/feb-2023)"}),
    f"aplicada a {N} hogares en t+{MESES} meses",
    j({"situacion": "distribución de ingresos 2024 no observada; márgenes demográficos Censo 2024 sí"}),
    j({"tipo": "poblacion", "n_hogares": N, "comunas": list(COMUNAS_PILOTO.values())}), None,
    j({"quien": "autorregistro del dispositivo", "evidencia": "fechas de referencia de las fuentes", "reconocimiento_institucional": "ninguno"}),
    acc_id, "SISTEMA", ahora))

res = pd.DataFrame(dict(comuna=S.cut_comuna.map(COMUNAS_PILOTO), prior=prior_reg, eleg=elegible_sit, div=diverge, tipo=tipos, locus=locus))
tab = res.groupby("comuna").agg(hogares=("prior", "size"), priorizados_registro=("prior", "mean"), elegibles_situado=("eleg", "mean"), divergencia=("div", "mean"))
tipo_tab = pd.crosstab(res.comuna, res.tipo, normalize="index")
loc_tab = pd.crosstab(res.tipo, res.locus)
div_t0 = pd.Series(misma_t0).groupby(S.cut_comuna.map(COMUNAS_PILOTO)).mean().rename("divergencia_t0")
tab = tab.join(div_t0)
tab.join(tipo_tab).to_csv(SALIDAS / "doble_resumen_comunal.csv")
loc_tab.to_csv(SALIDAS / "doble_tipologia_locus.csv")
pd.DataFrame({"vigintil_registro": range(20), "confianza": conf_vig}).to_csv(SALIDAS / "doble_confianza_por_vigintil.csv", index=False)

autorregistro(con, componente="A·doble", que_registro="Regla de priorización y parámetros de deriva",
              efecto=f"{int(diverge.sum())} divergencias registradas sobre {N} decisiones",
              inexactitud="Regla análoga, no el algoritmo CSE-RSH; 9 de 10 parámetros de deriva son supuestos (plano 'hipótesis'); "
                          "no se modelan llegadas desde otras comunas (el gemelo solo ve salidas); tipologías cubiertas: 4 de 7 "
                          "(dato_nulo, clasificacion_erronea y alucinacion_sintetica quedan para las sondas B y D)",
              metrica={"parametros": PARAM, "confianza_por_vigintil": [round(x, 3) for x in conf_vig]},
              alcance="Acción " + acc_id, deteccion="Revisión del diseño de la simulación",
              correccion="Calibrar transiciones con ENE-INE (flujos laborales), AFC y tasas de actualización RSH vía Ley de Transparencia")
con.commit()
pd.set_option("display.width", 250)
print(tab.round(3)); print(tipo_tab.round(3)); print(loc_tab)
print("confianza por vigintil:", np.round(conf_vig, 2))
