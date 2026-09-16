#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/src"
for s in 01_ingesta 02_poblacion 03_doble 04_grafo_encargo 05_validar 06_vista 07_exportar_sitios; do
  echo "── $s"; python3 "$s.py"
done
# banner pixel art (requiere límites comunales RM en GeoJSON: github.com/caracena/chile-geojson, archivo 13.geojson)
[ -f ../data/raw/13.geojson ] && python3 08_banner_pixel.py ../data/raw/13.geojson || echo "── 08_banner_pixel omitido: falta data/raw/13.geojson"
# contexto comunal RSH 2023 (SINIM) y tipología de vivienda (Censo 2024 V5): github.com/bastianolea/sinim_info_municipal, datos/sinim_2019-2023.xlsx
[ -f ../data/raw/sinim_2019-2023.xlsx ] && python3 09_contexto_rsh_vivienda.py ../data/raw/sinim_2019-2023.xlsx ../.. || echo "── 09_contexto omitido: falta data/raw/sinim_2019-2023.xlsx"
# banner del sitio C (grilla con las 12 comunas nombradas por SITIA); escribe en un clon hermano doppelganger-encargo
[ -f ../data/raw/13.geojson ] && [ -d ../../../doppelganger-encargo ] && python3 10_banner_sitia.py ../data/raw/13.geojson ../../../doppelganger-encargo/assets/banner_grid_sitia.json || echo "── 10_banner_sitia omitido"
# tipo de vivienda (casa/departamento) del donante y su reparto en la clasificación (requiere 09)
[ -f ../data/raw/casen2022.parquet ] && python3 13_vivienda_clasificacion.py ../.. || echo "── 13_vivienda omitido"
