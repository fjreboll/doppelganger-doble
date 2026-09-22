"""15 · Vecindario: una muestra inspeccionable de hogares sintéticos, uno por uno.

No es una sonda nueva (no confundir con la "sonda B" de alucinación sintética que ya nombra
pipeline/README.md § Viabilidad): es una vista distinta sobre los mismos datos de 03_doble.py.

Referencia de interfaz: "Generative Agents" (Park et al. 2023, Stanford — la demo "Smallville").
Se toma la mecánica (un pueblo de personajes inspeccionables, uno por uno) y se descarta lo que no
aplica aquí: no hay LLM generando comportamiento ni diálogo. Cada personaje es un hogar sintético
real de la simulación (estatuto caso_compuesto, igual que en el resto del sitio) y su "memoria" es
su registro real: composición, ingreso, decisión del registro, y la divergencia con sus seis campos
si la tiene. La selección de los N_MUESTRA hogares no es aleatoria simple: se estratifica por
comuna y tenencia proporcional a su peso real, para que el conjunto "refleje los tipos de hogares
que priman" en vez de ser una curiosidad estadística. La divergencia NO se usa como criterio de
selección — a propósito: en la vida real tampoco se ve desde afuera cuál hogar diverge.
"""
import json, pandas as pd, numpy as np
from comun import *

N_MUESTRA = 28  # orden de magnitud de los 25 agentes de Smallville; no hay una razón para más
SITIO = RAIZ.parent / "vecindario"
SITIO.mkdir(exist_ok=True)
rng = np.random.default_rng(SEMILLA + 15)

con = conectar()
h = pd.read_sql("""
    select hs.*, d.resultado, d.percentil_reg, d.confianza, d.antiguedad_meses, d.divergencia_id,
           x.tipologia, x.locus, x.representacion, x.decision as decision_texto, x.ocurrido, x.afectado, x.reparacion, x.formulacion
    from hogar_sintetico hs
    join decision d on d.hogar_id = hs.id
    left join divergencia x on x.id = d.divergencia_id
""", con)

# tipo de vivienda: mismo criterio que 13_vivienda_clasificacion.py (CASEN v1, vía donante_folio)
v = pd.read_parquet(RAW / "casen2022.parquet", columns=["folio", "v1"]).drop_duplicates("folio")
cod = v.v1.astype(str).str.extract(r"^(\d+)")[0].astype(float)
v["tipo_vivienda"] = pd.cut(cod, [0, 3, 5, 99], labels=["casa", "departamento", "otra"]).astype(str)
h = h.merge(v[["folio", "tipo_vivienda"]], left_on="donante_folio", right_on="folio", how="left")
h["tipo_vivienda"] = h.tipo_vivienda.fillna("otra")

# ───────── muestra estratificada: comuna × tenencia, proporcional al peso real de cada celda ─────────
peso_comuna = (h.comuna_cut.value_counts(normalize=True) * N_MUESTRA).round().astype(int)
while peso_comuna.sum() != N_MUESTRA:  # el redondeo puede desviar en ±1-2; se ajusta en la comuna mayor
    peso_comuna[peso_comuna.idxmax()] += 1 if peso_comuna.sum() < N_MUESTRA else -1

elegidos = []
for cut, n_comuna in peso_comuna.items():
    sub = h[h.comuna_cut == cut]
    peso_ten = (sub.tenencia.value_counts(normalize=True) * n_comuna).round().astype(int)
    while peso_ten.sum() != n_comuna and len(peso_ten):
        peso_ten[peso_ten.idxmax()] += 1 if peso_ten.sum() < n_comuna else -1
    for ten, n_celda in peso_ten.items():
        celda = sub[sub.tenencia == ten]
        if not n_celda or not len(celda):
            continue
        elegidos.append(celda.sample(n=min(n_celda, len(celda)), random_state=rng.integers(1 << 31)))
muestra = pd.concat(elegidos).reset_index(drop=True) if elegidos else h.sample(N_MUESTRA, random_state=SEMILLA)

# ───────── registro por hogar: solo campos que el pipeline realmente calculó ─────────
def deserializar(x):
    return json.loads(x) if isinstance(x, str) else x

vecinos = []
for _, r in muestra.iterrows():
    perfil = dict(
        id=r.id, estatuto="caso_compuesto", comuna=COMUNAS_PILOTO[r.comuna_cut], comuna_cut=r.comuna_cut,
        tenencia=r.tenencia, hacinamiento=r.hacinamiento, tipo_vivienda=r.tipo_vivienda,
        numper_t0=int(r.numper_t0), numper_t24=int(r.numper_t24), se_mudo=bool(r.se_mudo),
        ingreso_formal_t0=float(r.y_formal_t0), ingreso_informal_t0=float(r.y_informal_t0),
        ingreso_formal_t24=float(r.y_formal_t24), ingreso_informal_t24=float(r.y_informal_t24),
        registro=dict(prioriza=bool(r.resultado), percentil=round(float(r.percentil_reg), 1),
                      confianza=round(float(r.confianza), 3), antiguedad_meses=int(r.antiguedad_meses)))
    perfil["diverge"] = bool(pd.notna(r.divergencia_id))
    if perfil["diverge"]:
        perfil["divergencia"] = dict(tipologia=r.tipologia, locus=r.locus, representacion=deserializar(r.representacion),
                                      decision=r.decision_texto, ocurrido=deserializar(r.ocurrido), afectado=deserializar(r.afectado),
                                      reparacion=r.reparacion, formulacion=deserializar(r.formulacion))
    vecinos.append(perfil)

(SITIO / "hogares.json").write_text(json.dumps(dict(generado=HOY, n=len(vecinos), hogares=vecinos), ensure_ascii=False, default=str))

comp = muestra.groupby(["comuna_cut", "tenencia"]).size()
print(f"{len(vecinos)} hogares elegidos · {int(muestra.divergencia_id.notna().sum())} con divergencia "
      f"({muestra.divergencia_id.notna().mean():.1%}, cf. tasa real de la simulación)")
print(comp.to_string())
print((SITIO / "hogares.json"))
