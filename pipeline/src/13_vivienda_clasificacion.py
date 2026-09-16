"""13 · Tipo de vivienda (casa / departamento) en el gemelo y en la clasificación.

La regla análoga NO usa el tipo de vivienda: prioriza por ingreso equivalente registrado. Este script lo
hace visible: recupera el tipo de vivienda de cada hogar sintético desde su donante CASEN 2022 (v1),
contrasta la mezcla sintética con el Censo 2024 (V5, holdout: no se usó para calibrar) y mide, por comuna
y tipo, cuántos hogares prioriza el registro y cuántos divergen de la vida situada (mes 24).
"""
import json, sys, pandas as pd
from comun import *

SITIO = Path(sys.argv[1] if len(sys.argv) > 1 else RAIZ.parent / "sitios" / "doppelganger-doble")
con = conectar()
v = pd.read_parquet(RAW / "casen2022.parquet", columns=["folio", "v1"]).drop_duplicates("folio")
cod = v.v1.astype(str).str.extract(r"^(\d+)")[0].astype(float)
v["tipo"] = pd.cut(cod, [0, 3, 5, 99], labels=["casa", "departamento", "otra"]).astype(str)   # 1-3 casas · 4-5 deptos · 6-10 otras
h = pd.read_sql("""select h.id, h.comuna_cut, h.donante_folio, d.resultado, d.divergencia_id, x.tipologia
                   from hogar_sintetico h join decision d on d.hogar_id = h.id left join divergencia x on x.id = d.divergencia_id""", con)
h = h.merge(v[["folio", "tipo"]], left_on="donante_folio", right_on="folio", how="left")
assert h.tipo.notna().all()
h["comuna"] = h.comuna_cut.astype(str).map(COMUNAS_PILOTO)
h["div"] = h.divergencia_id.notna()

D = json.loads((SITIO / "data.json").read_text())
out = {}
for c, g in h.groupby("comuna"):
    censo = D["contexto"][c]["vivienda"]
    filas = {}
    for t, gt in g.groupby("tipo"):
        filas[t] = dict(hogares=int(len(gt)), share_sintetico=round(len(gt) / len(g), 4), share_censo=round(censo.get(t, 0), 4),
                        priorizados=round(gt.resultado.mean(), 4), divergencia=round(gt["div"].mean(), 4),
                        falso_positivo=round((gt.tipologia == "falso_positivo").mean(), 4),
                        falso_negativo=round((gt.tipologia == "falso_negativo").mean(), 4),
                        desactualizada=round((gt.tipologia == "base_desactualizada").mean(), 4))
    out[c] = filas
D["vivienda_clasificacion"] = out
(SITIO / "data.json").write_text(json.dumps(D, ensure_ascii=False, allow_nan=False))

m = {c: max(abs(f["share_sintetico"] - f["share_censo"]) for f in fs.values()) for c, fs in out.items()}
con.execute("DELETE FROM autorregistro WHERE componente='A·vivienda'")
autorregistro(con, componente="A·vivienda", que_registro="Tipo de vivienda de los hogares sintéticos (donante CASEN v1) frente al Censo 2024 V5",
              efecto="Diagrama de factores: la regla no usa el tipo de vivienda; se muestra cómo se reparte la clasificación entre casas y departamentos",
              inexactitud="La calibración no restringe el tipo de vivienda: la mezcla sintética casa/depto se desvía del Censo hasta " +
                          ", ".join(f"{c} {d*100:.1f} p.p." for c, d in m.items()) + ". 'Otra' agrupa pieza, mediagua, vivienda precaria, indígena y rancho",
              metrica=out, alcance="4 comunas piloto, mes 24", deteccion="Holdout contra Censo 2024 V5 (no usado en la calibración)",
              correccion="Agregar tipo de vivienda como margen de calibración si el análisis depende de él")
con.commit()
for c, fs in out.items():
    print(c); print(pd.DataFrame(fs).T.round(3))
