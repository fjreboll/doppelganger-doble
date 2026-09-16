#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/src"
for s in 01_ingesta 02_poblacion 03_doble 04_grafo_encargo 05_validar 06_vista 07_exportar_sitios; do
  echo "── $s"; python3 "$s.py"
done
# banner pixel art (requiere límites comunales RM en GeoJSON: github.com/caracena/chile-geojson, archivo 13.geojson)
[ -f ../data/raw/13.geojson ] && python3 08_banner_pixel.py ../data/raw/13.geojson || echo "── 08_banner_pixel omitido: falta data/raw/13.geojson"
