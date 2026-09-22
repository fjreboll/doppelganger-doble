"""05 · Validación independiente de la POC (auditoría del propio dispositivo)."""
import json, numpy as np, pandas as pd
from comun import *

con = conectar()
q = lambda s: con.execute(s).fetchall()
checks = []
def check(nombre, ok, detalle):
    checks.append(dict(prueba=nombre, ok=bool(ok), detalle=detalle)); print(("OK   " if ok else "FALLA"), nombre, "·", detalle)

# 1 · integridad
# DuckDB aplica las FK al escribir (a diferencia de SQLite, que solo las audita si se le pide con
# PRAGMA foreign_key_check); igual se recorren explícitamente aquí para no depender de eso.
FKS = [("objeto", "tipo", "tipo_objeto", "tipo"), ("objeto", "fuente_id", "fuente", "id"),
       ("vinculo", "origen", "objeto", "id"), ("vinculo", "destino", "objeto", "id"), ("vinculo", "fuente_id", "fuente", "id"),
       ("censo_objetivo", "fuente_id", "fuente", "id"), ("contexto_comunal", "fuente_id", "fuente", "id"),
       ("decision", "accion_id", "accion", "id"), ("decision", "hogar_id", "hogar_sintetico", "id"),
       ("decision", "divergencia_id", "divergencia", "id"), ("divergencia", "accion_id", "accion", "id")]
huerfanos_fk = sum(q(f"select count(*) from {ct} where {cc} is not null and not exists "
                      f"(select 1 from {pt} where {pt}.{pc} = {ct}.{cc})")[0][0] for ct, cc, pt, pc in FKS)
check("Integridad referencial (11 relaciones FK recorridas)", huerfanos_fk == 0, f"{huerfanos_fk} violaciones")
check("Toda fuente declara plano de evidencia y vía de acceso", q("select count(*) from fuente where plano_evidencia is null or via_acceso is null")[0][0] == 0, f"{q('select count(*) from fuente')[0][0]} fuentes")

# 2 · costura obligatoria y seis campos
n_dec = q("select count(*) from decision")[0][0]
check("Toda decisión lleva costura (confianza, antigüedad, umbral, procedencia)",
      q("select count(*) from decision where confianza is null or antiguedad_meses is null or umbral is null or procedencia is null")[0][0] == 0, f"{n_dec} decisiones")
check("Toda divergencia tiene los campos 1-4 y 6 (reparación puede ser nula = ninguna)",
      q("select count(*) from divergencia where representacion='' or decision='' or ocurrido='' or afectado='' or formulacion=''")[0][0] == 0,
      f"{q('select count(*) from divergencia')[0][0]} entradas")

# 3 · auditoría independiente: ninguna decisión divergente sin bitácora
H = pd.read_parquet(INTERIM / "casen2022_hogares.parquet")
eq = lambda y, n: y / np.power(np.maximum(n, 1), 0.7)
def ecdf(v, w):
    o = np.argsort(v); c = np.cumsum(w[o]); return lambda x: np.interp(x, v[o], c / c[-1] * 100)
comp = H.y_formal + H.y_informal + H.y_otros_reg + H.y_otros_no_reg + H.y_pension + H.y_subsidio
ps = ecdf(eq(np.maximum(H.ytotcorh, comp), H.numper).values, H.expr.values.astype(float))
S0 = pd.read_parquet(INTERIM / "hogares_sinteticos_t0.parquet")[["id", "y_otros_reg", "y_otros_no_reg"]]
h = pd.read_sql("select h.*, d.resultado, d.divergencia_id from hogar_sintetico h join decision d on d.hogar_id=h.id", con).merge(S0, on="id")
p_sit = ps(eq(h.y_formal_t24 + h.y_informal_t24 + h.y_otros_reg + h.y_otros_no_reg + h.y_pension + h.y_subsidio, h.numper_t24).values)
eleg = (p_sit < 40) & (h.se_mudo == 0)
diverge = eleg != (h.resultado == 1)
sin_bitacora = int((diverge & h.divergencia_id.isna()).sum()); bitacora_sin_div = int((~diverge & h.divergencia_id.notna()).sum())
check("Ninguna decisión divergente sin entrada en el registro (recomputado)", sin_bitacora == 0 and bitacora_sin_div < 0.001 * len(h),
      f"divergentes sin bitácora: {sin_bitacora}; entradas sin divergencia recomputada: {bitacora_sin_div} (redondeo de ingresos)")

# 4 · población sintética
M = pd.read_csv(SALIDAS / "calibracion_poblacion.csv")
check("Márgenes Censo 2024 reproducidos (desvío máx. < 2%)", (M.max_desvio_muestra_pct < 2).all(), dict(zip(M.comuna, M.max_desvio_muestra_pct.round(2))))
dentro = (M.sae_li <= M.pobreza_ing_sint) & (M.pobreza_ing_sint <= M.sae_ls)
check("Holdout: pobreza por ingresos dentro del IC de SAE 2022", dentro.all(), dict(zip(M.comuna, dentro)))
dif_crit = (M.hac_crit_sint - M.hac_crit_censo).abs()
check("Holdout: hacinamiento crítico a ±1 p.p. del Censo 2024", (dif_crit <= 0.01).all(), dict(zip(M.comuna, (dif_crit * 100).round(2))))
D = pd.read_parquet(INTERIM / "casen2022_hogares.parquet")[["folio", "y_formal", "y_informal"]].rename(columns={"y_formal": "df", "y_informal": "di"})
S = pd.read_parquet(INTERIM / "hogares_sinteticos_t0.parquet")[["folio", "y_formal", "y_informal"]].merge(D, on="folio")
copias = ((S.y_formal == S.df.round(-2)) & (S.y_informal == S.di.round(-2)) & ((S.df + S.di) > 0)).mean()
check("Privacidad: hogares con ingresos idénticos al donante < 5%", copias < 0.05, f"{copias:.2%}")

# 5 · grafo
check("Todo vínculo del grafo tiene fuente y cita", q("select count(*) from vinculo where fuente_id is null or cita is null or cita=''")[0][0] == 0, f"{q('select count(*) from vinculo')[0][0]} vínculos")
check("Personas solo en rol público (formato 'Nombre · Cargo')", q("select count(*) from objeto where tipo='PersonaRol' and nombre not like '% · %'")[0][0] == 0, str(q("select count(*) from objeto where tipo='PersonaRol'")[0][0]) + " personas-rol")
huerf = q("select count(*) from objeto o where not exists (select 1 from vinculo v where v.origen=o.id or v.destino=o.id)")[0][0]
check("Grafo conexo (sin objetos aislados)", huerf == 0, f"{huerf} aislados")
check("Empresas no fusionadas sin RUT", q("select count(*) from objeto where tipo='Empresa' and json_extract(atributos,'$.resolucion_RES.resuelta')=1")[0][0] == 0, "resolución conservadora")

(SALIDAS / "validacion.json").write_text(json.dumps(checks, ensure_ascii=False, indent=1, default=str))
print(f"\n{sum(c['ok'] for c in checks)}/{len(checks)} pruebas superadas")
