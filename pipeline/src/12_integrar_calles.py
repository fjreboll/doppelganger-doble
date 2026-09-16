"""12 · Verifica las filas RLE de calles OSM (hash por fila) y las inserta en assets/banner_grid_sitia.json del sitio C."""
import json, re, sys
from pathlib import Path
OSM = Path(__file__).resolve().parents[1] / "data" / "osm"
GRID = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parents[3] / "doppelganger-encargo" / "assets" / "banner_grid_sitia.json")
h = lambda s: __import__("functools").reduce(lambda x, ch: (x * 31 + ord(ch)) % 997, s, 0)
G = json.loads(GRID.read_text())
for k in ("escritorio", "movil"):
    L = (OSM / f"calles_rle_{k}.txt").read_text().strip().split("\n")
    filas, hs = L[:-1], list(map(int, L[-1][1:].split(",")))
    for y, r in enumerate(filas):
        s = "".join(str("ABCDE".index(c)) * (int(n, 36) if n else 1) for c, n in re.findall(r"([A-E])([0-9a-z]*)", r))
        assert len(s) == G[k]["cols"] and h(s) == hs[y], f"{k} fila {y} no verifica"
    G[k]["calles"] = "|".join(filas)
G["fuente_calles"] = "Vías OpenStreetMap (© colaboradores OSM, ODbL): motorway/trunk(+link)=B, primary=C, secondary=D, tertiary=E; Overpass 2026-09-16T12:52:49Z; Bresenham a la grilla; filas RLE (letra=clase, largo base36)"
GRID.write_text(json.dumps(G, ensure_ascii=False, separators=(",", ":")))
print("ok", GRID)
