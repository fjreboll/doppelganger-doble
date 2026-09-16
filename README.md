# DOBLE · Registro público de divergencias (Doppelganger A)

**Sitio:** https://fjreboll.github.io/doppelganger-doble/ · **Par:** [Grafo del encargo (C)](https://fjreboll.github.io/doppelganger-encargo/)

Dashboard infográfico de la prueba de concepto A del programa *Doppelganger* (Doctorado en Arquitectura, Diseño y Estudios Urbanos UC). Un gemelo sintético de 559.440 hogares de cuatro comunas de Santiago (La Pintana, Puente Alto, Santiago, Las Condes), construido con CASEN 2022 recalibrada a los márgenes comunales del Censo 2024, sobre el cual un registro administrativo prioriza una prestación durante 24 meses simulados. Cada decisión lleva costura obligatoria (confianza, antigüedad del dato, umbral, procedencia) y cada discrepancia con la vida situada entra al registro con seis campos.

> Todos los hogares son **casos compuestos**. La regla de decisión es un **análogo**, no el algoritmo de Calificación Socioeconómica del Registro Social de Hogares.

## Estructura

| Ruta | Contenido |
|---|---|
| `index.html`, `app.js` | Interfaz (Material Design 3; visualizaciones D3 con paleta validada para daltonismo) |
| `banner.js`, `assets/banner_grid.json` | Banner pixel art: mapa de la RM rasterizado (300×116 celdas escritorio, 120×122 móvil). Las celdas de las cuatro comunas cambian de estado mes a mes; casas y edificios se dibujan en proporción a la tipología de vivienda del Censo 2024 y su techo toma el color del estado |
| `data.json` | Datos exportados desde la base común `doppelganger.db` |
| `assets/` | Hoja de estilo M3, D3 v7 y tipografías auto-alojadas (Roboto Flex, Roboto Mono, Material Symbols) |
| `pipeline/` | Código reproducible: ingesta, calibración, simulación, grafo, validación y exportación |

## Reproducir

```bash
pip install pandas pyarrow duckdb openpyxl numpy
# datos de entrada en pipeline/data/raw/ (ver pipeline/README.md)
bash pipeline/run_all.sh
```

## Fuentes

- Encuesta CASEN 2022, microdatos · Ministerio de Desarrollo Social y Familia (vía espejo `bastianolea/casen_comparador_ingresos`)
- Censo de Población y Vivienda 2024, tabulados comunales D1, D5, H1, V3 · INE (vía espejo `bastianolea/censo_2024`)
- Estimaciones comunales de pobreza SAE 2022 · Observatorio Social MDSF (vía `cortega26/chile-hub`)
- Registro Social de Hogares: hogares inscritos por tramo de CSE, 2023 · SINIM/Subdere, variables 4624–4630 (vía espejo `bastianolea/sinim_info_municipal`). Se contrasta con el registro simulado en la sección 04
- Censo 2024, tabulado V5 (casas y departamentos por comuna) · INE
- Límites comunales de la Región Metropolitana · BCN (vía espejo `caracena/chile-geojson@92332f8`), rasterizados con `pipeline/src/08_banner_pixel.py` (y `10_banner_sitia.py` para el sitio C)
- Red vial OpenStreetMap (© colaboradores OSM, ODbL) para el banner del sitio C: `pipeline/src/11_calles_osm.js` (Overpass, 2026-09-16) y `12_integrar_calles.py`
- Tipografías pixel: Pixelify Sans y VT323 (SIL Open Font License), auto-alojadas

## Límites declarados

Nueve de diez parámetros de deriva son supuestos; tipologías cubiertas 4 de 7; la prueba de hacinamiento crítico en Santiago falla (2,8% sintético vs 5,4% Censo) y se mantiene visible. El RSH real (SINIM) cuenta solo hogares inscritos y su etiqueta dice «total regional» aunque los tramos suman 100% por comuna: queda en el autorregistro. Detalle completo en la sección Método del sitio y en `pipeline/README.md`.
