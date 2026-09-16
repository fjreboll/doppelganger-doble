#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/src"
for s in 01_ingesta 02_poblacion 03_doble 04_grafo_encargo 05_validar 06_vista 07_exportar_sitios; do
  echo "── $s"; python3 "$s.py"
done
