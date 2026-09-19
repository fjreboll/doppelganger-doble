"""10 · Banner pixel art SITIA: misma rasterización que 08, con las 12 municipalidades nombradas en sitia.gob.cl.

Fuente geométrica: límites comunales RM (BCN, vía espejo github.com/caracena/chile-geojson@92332f8).
Salida: assets/banner_grid.json con dos encuadres (escritorio y móvil). Cada celda guarda el índice
de la comuna cuyo polígono contiene su centro (0 = fuera de la RM). Proyección equirectangular
corregida por latitud (cos 33,5°), suficiente a esta escala.
"""
import json, math, sys, numpy as np
from pathlib import Path
from matplotlib.path import Path as MPath

GEO = Path(sys.argv[1] if len(sys.argv) > 1 else "/home/claude/src/chile-geojson/13.geojson")
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else Path(__file__).resolve().parents[2] / "assets" / "banner_grid_sitia.json")
PILOTO = {13108: "Independencia", 13117: "Lo Prado", 13101: "Santiago", 13122: "Peñalolén", 13129: "San Joaquín", 13132: "Vitacura",
          13124: "Pudahuel", 13107: "Huechuraba", 13115: "Lo Barnechea", 13121: "Pedro Aguirre Cerda", 13113: "La Reina", 13119: "Maipú"}
K = math.cos(math.radians(33.5))  # encuadre: Santiago urbano (Pudahuel/Maipú al poniente, sector oriente hasta el límite urbano, Puente Alto al sur)

fc = json.loads(GEO.read_text())["features"]
comunas = []
for f in sorted(fc, key=lambda f: f["properties"]["cod_comuna"]):
    g = f["geometry"]
    polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    comunas.append(dict(cod=int(f["properties"]["cod_comuna"]), nombre=f["properties"]["Comuna"], polys=polys))


def grilla(lon0, lon1, lat0, lat1, cols):
    rows = round(cols * ((lat1 - lat0)) / ((lon1 - lon0) * K))
    xs = lon0 + (np.arange(cols) + .5) * (lon1 - lon0) / cols
    ys = lat1 - (np.arange(rows) + .5) * (lat1 - lat0) / rows
    X, Y = np.meshgrid(xs, ys)
    pts = np.column_stack([X.ravel(), Y.ravel()])
    idx = np.zeros(len(pts), dtype=np.uint8)
    for i, c in enumerate(comunas, start=1):
        dentro = np.zeros(len(pts), bool)
        for poly in c["polys"]:
            ext = MPath(np.array(poly[0]))
            m = ext.contains_points(pts)
            for hole in poly[1:]:
                m &= ~MPath(np.array(hole)).contains_points(pts)
            dentro |= m
        idx[dentro & (idx == 0)] = i
    G = idx.reshape(rows, cols)
    etiquetas = {}
    for i, c in enumerate(comunas, start=1):
        if c["cod"] in PILOTO:
            yy, xx = np.nonzero(G == i)
            if len(xx):
                etiquetas[c["cod"]] = dict(cx=round(float(xx.mean()) / cols, 4), cy=round(float(yy.mean()) / rows, 4), celdas=int(len(xx)))
    # codificación compacta: un carácter por celda (base 64 del índice)
    ALF = "0ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789+/"
    return dict(cols=cols, rows=rows, bbox=[lon0, lat0, lon1, lat1], celdas="".join(ALF[v] for v in G.ravel()), etiquetas=etiquetas)


out = dict(
    fuente="Límites comunales Región Metropolitana · BCN (espejo github.com/caracena/chile-geojson@92332f8)",
    alfabeto="0ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789+/",
    comunas=[dict(i=i, cod=c["cod"], nombre=c["nombre"], piloto=c["cod"] in PILOTO) for i, c in enumerate(comunas, start=1)],
    escritorio=grilla(-70.92, -70.42, -33.66, -33.33, 300),
    movil=grilla(-70.92, -70.42, -33.66, -33.33, 140),
)
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
for k in ("escritorio", "movil"):
    g = out[k]; print(k, g["cols"], "x", g["rows"], g["etiquetas"])
print(OUT, round(OUT.stat().st_size / 1024), "KB")
