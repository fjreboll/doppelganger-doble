# Santiago Gemelo Digital · Registro público de divergencias (Doppelgänger A)

**Sitio:** https://fjreboll.github.io/doppelganger-doble/ · **Par:** [Beholder · Grafo del encargo SITIA (C)](https://fjreboll.github.io/doppelganger-encargo/)

Dashboard infográfico de la prueba de concepto A del programa *Doppelganger* (Doctorado en Arquitectura, Diseño y Estudios Urbanos UC). Un gemelo sintético de 559.440 hogares de cuatro comunas de Santiago (La Pintana, Puente Alto, Santiago, Las Condes), construido con CASEN 2022 recalibrada a los márgenes comunales del Censo 2024, sobre el cual un registro administrativo prioriza una prestación durante 24 meses simulados. Cada decisión lleva costura obligatoria (confianza, antigüedad del dato, umbral, procedencia) y cada discrepancia con la vida situada entra al registro con seis campos.

> Todos los hogares son **casos compuestos**. La regla de decisión es un **análogo**, no el algoritmo de Calificación Socioeconómica del Registro Social de Hogares.

## Estructura

| Ruta | Contenido |
|---|---|
| `index.html`, `app.js` | Interfaz (Material Design 3; visualizaciones D3 con paleta validada para daltonismo) |
| `banner.js`, `assets/banner_grid.json` | Banner pixel art: mapa del Santiago urbano rasterizado (300×237 celdas escritorio, 140×111 móvil; encuadre −70,92/−70,42 y −33,66/−33,33: Pudahuel y Maipú al poniente, el sector oriente hasta el límite urbano, Puente Alto al sur). Las celdas de las cuatro comunas cambian de estado mes a mes; casas y edificios se dibujan en proporción a la tipología de vivienda del Censo 2024 y su techo toma el color del estado |
| Sección 01 · El hogar | Diagrama de factores del hogar sintético (qué calibra el Censo, qué hereda el donante CASEN, qué lee el registro y qué la vida situada) y comparación casas/departamentos al mes 24, generada con `pipeline/src/13_vivienda_clasificacion.py` (tipo de vivienda CASEN v1 del donante; contraste holdout con Censo 2024 V5) |
| `secviz.js` | Dos bandas de píxeles dibujadas por código (canvas, sin dependencias, escala entera): la confianza hundiéndose junto al umbral p40 y las fichas de seis campos con la costura en rojo. El resto de las secciones va sin gráfico decorativo. Se detienen fuera de pantalla y respetan `prefers-reduced-motion` |
| `nav.js` | Navegación compartida con el sitio C: índice de secciones con seguimiento de lectura, barra de progreso, aparición progresiva, enlaces profundos y atajos (`[` `]` secciones, `t` arriba). Clic en una comuna del banner, del gráfico 05 o del de viviendas filtra el tablero; el diagrama del hogar ilumina la lectura que usa cada factor |
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

Cada fuente lleva su verificación: las bases públicas se leyeron desde espejos de GitHub fijados por commit (el enlace de la columna «Acceso» abre ese commit), porque los portales institucionales no son alcanzables desde el entorno de la POC.

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
