#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/src"
for s in 01_ingesta 02_poblacion 03_doble 04_grafo_encargo 05_validar 06_vista 07_exportar_sitios; do
  echo "── $s"; python3 "$s.py"
done
# banner pixel art (requiere límites comunales RM en GeoJSON: github.com/caracena/chile-geojson, archivo 13.geojson)
if [ -f ../data/raw/13.geojson ]; then python3 08_banner_pixel.py ../data/raw/13.geojson; else echo "── 08_banner_pixel omitido: falta data/raw/13.geojson"; fi
# contexto comunal RSH 2023 (SINIM) y tipología de vivienda (Censo 2024 V5): github.com/bastianolea/sinim_info_municipal, datos/sinim_2019-2023.xlsx
if [ -f ../data/raw/sinim_2019-2023.xlsx ]; then python3 09_contexto_rsh_vivienda.py ../data/raw/sinim_2019-2023.xlsx ../..; else echo "── 09_contexto omitido: falta data/raw/sinim_2019-2023.xlsx"; fi
# banner del sitio C (grilla con las 12 comunas nombradas por SITIA); escribe en un clon hermano doppelganger-encargo
# 10 regenera la grilla sin calles; 12 reinserta las calles OSM verificadas. Van siempre juntos (regresión 601a4d2)
if [ -f ../data/raw/13.geojson ] && [ -d ../../../doppelganger-encargo ]; then
  python3 10_banner_sitia.py ../data/raw/13.geojson ../../../doppelganger-encargo/assets/banner_grid_sitia.json
  python3 12_integrar_calles.py ../../../doppelganger-encargo/assets/banner_grid_sitia.json
else echo "── 10_banner_sitia + 12_integrar_calles omitidos"; fi
# tipo de vivienda (casa/departamento) del donante y su reparto en la clasificación (requiere 09)
if [ -f ../data/raw/casen2022.parquet ]; then python3 13_vivienda_clasificacion.py ../..; else echo "── 13_vivienda omitido"; fi
# sensibilidad (anexo) y vecindario: dependen de 03; se regeneran para que no queden desfasados del modelo
python3 14_sensibilidad.py
python3 15_vecindario.py
# guarda final: falla si algo publicado desapareció respecto del último commit de cada sitio
python3 16_verificar_sitios.py
