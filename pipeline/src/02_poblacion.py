"""02 · Población sintética: calibración entrópica de donantes CASEN 2022 a márgenes Censo 2024.

Método: para cada comuna, pesos w = d · exp(Xλ) que reproducen exactamente los totales censales
(hogares, personas por 5 grupos de edad, tenencia en 4 grupos). Luego muestreo de N hogares
(N = hogares censados) con probabilidad ∝ w y perturbación multiplicativa de ingresos (±5%)
para que ningún hogar sintético sea copia exacta de un registro de la encuesta.
Validación holdout: hacinamiento (Censo 2024) y pobreza por ingresos (SAE 2022).
"""
import numpy as np, pandas as pd
from comun import *

con = conectar()
rng = np.random.default_rng(SEMILLA)
H = pd.read_parquet(INTERIM / "casen2022_hogares.parquet")
obj = pd.read_sql("select * from censo_objetivo", con)
EDAD = ["n0_14", "n15_29", "n30_44", "n45_64", "n65"]
TEN = ["propia", "arrendada", "cedida_usufructo", "irregular_otra"]


def calibrar(d, X, T, iters=100):
    lam = np.zeros(X.shape[1])
    Xs = X / np.maximum(T, 1)  # escala para estabilidad numérica
    Ts = np.ones_like(T)
    for _ in range(iters):
        w = d * np.exp(np.clip(Xs @ lam, -30, 30))
        g = Xs.T @ w - Ts
        if np.max(np.abs(g)) < 1e-9:
            break
        Hm = (Xs * w[:, None]).T @ Xs
        lam -= np.linalg.solve(Hm + 1e-10 * np.eye(len(lam)), g)
    return w, np.max(np.abs(g))


sint, metr = [], []
for cut, nom in COMUNAS_PILOTO.items():
    o = obj[obj.comuna_cut == cut].set_index(["variable", "categoria"]).valor
    don = H[H.cut_comuna == cut].copy()
    X = np.column_stack([np.ones(len(don))] + [don[e].values for e in EDAD] + [(don.tenencia == t).values * 1.0 for t in TEN[:-1]])
    T = np.array([o["hogares", "total"]] + [o["personas_edad", e] for e in EDAD] + [o["tenencia", t] for t in TEN[:-1]])
    d = don.expc.values.astype(float)
    d *= T[0] / d.sum()
    w, err = calibrar(d, X, T)
    g = w / d
    N = int(o["hogares", "total"])
    idx = rng.choice(len(don), size=N, p=w / w.sum())
    s = don.iloc[idx].reset_index(drop=True)
    ruido = rng.lognormal(0, 0.05, size=(N, 5))
    for k, col in enumerate(["y_formal", "y_informal", "y_pension", "y_otros_reg", "y_otros_no_reg"]):
        s[col] = (s[col] * ruido[:, k]).round(-2)
    s["y_subsidio"] = s.y_subsidio.round(-2)
    s["id"] = [f"H{cut}-{i:06d}" for i in range(N)]
    sint.append(s)

    # métricas de calibración y holdout
    real = dict(zip(["hogares"] + EDAD + TEN[:-1], T))
    got = dict(zip(["hogares"] + EDAD + TEN[:-1], X.T @ w))
    samp = {"hogares": N, **{e: s[e].sum() for e in EDAD}, **{t: (s.tenencia == t).sum() for t in TEN[:-1]}}
    hac = s.hacinamiento.value_counts(normalize=True)
    pob_ing = (~s.pobreza.eq("No pobreza")).mean()
    metr.append(dict(comuna=nom, cut=cut, donantes=len(don), error_calib=float(err), g_min=float(g.min()), g_max=float(g.max()),
                     g_p95=float(np.quantile(g, .95)), donantes_efectivos=float(w.sum() ** 2 / (w ** 2).sum()),
                     max_desvio_muestra_pct=float(max(abs(samp[k] / real[k] - 1) for k in real) * 100),
                     hac_sin_sint=float(hac.get("sin", 0)), hac_sin_censo=float(o["hacinamiento_share", "sin"]),
                     hac_crit_sint=float(hac.get("critico", 0)), hac_crit_censo=float(o["hacinamiento_share", "critico"]),
                     pobreza_ing_sint=float(pob_ing), pobreza_sae=float(o["pobreza_ingresos", "tasa"]),
                     sae_li=float(o["pobreza_ingresos", "limite_inferior"]), sae_ls=float(o["pobreza_ingresos", "limite_superior"])))

S = pd.concat(sint, ignore_index=True)
S.to_parquet(INTERIM / "hogares_sinteticos_t0.parquet")
M = pd.DataFrame(metr)
M.to_csv(SALIDAS / "calibracion_poblacion.csv", index=False)

for _, m in M.iterrows():
    dentro = m.sae_li <= m.pobreza_ing_sint <= m.sae_ls
    autorregistro(con, componente="A·población", que_registro=f"Población sintética {m.comuna} ({int(S.cut_comuna.eq(m.cut).sum())} hogares)",
                  efecto="Base del gemelo sobre la cual el registro decide",
                  inexactitud=(f"Donantes 2022 recalibrados a 2024: pesos g entre {m.g_min:.2f} y {m.g_max:.2f}; "
                               f"hacinamiento crítico sintético {m.hac_crit_sint:.1%} vs Censo {m.hac_crit_censo:.1%}; "
                               f"pobreza por ingresos {m.pobreza_ing_sint:.1%} vs SAE 2022 {m.pobreza_sae:.1%} "
                               f"[{m.sae_li:.1%}–{m.sae_ls:.1%}] → {'dentro' if dentro else 'FUERA'} del intervalo"),
                  metrica=m.to_dict(), alcance=m.comuna, deteccion="Validación holdout contra Censo 2024 y SAE 2022",
                  correccion=None if dentro else "Agregar pobreza SAE como restricción o ampliar pool de donantes a la provincia")
con.commit()
pd.set_option("display.width", 250)
print(M.round(3).T)
