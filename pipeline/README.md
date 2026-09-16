# Doppelganger · POC de viabilidad (A · DOBLE + C · Grafo del encargo)

Prueba de concepto para evaluar si el **registro público de divergencias algorítmicas** puede operarse con datos chilenos recientes y homologables, antes de incorporarlo como capítulo. Estado: **v0.1 · 15-09-2026**. Todo caso es **compuesto** (sintético); ninguna persona real es clasificada.

## Ejecución

```bash
pip install pandas pyarrow duckdb openpyxl numpy
bash run_all.sh          # 01 → 06, ~2 min; genera db/doppelganger.db (~360 MB) y salidas/
```

Datos de entrada esperados en `data/raw/` (espejos públicos usados; ver tabla de fuentes):
`casen2022.parquet`, `censo2024_tabulados/` (xlsx INE), `chile_hub/` (pobreza SAE 2022, RES).

| Paso | Script | Qué hace |
|---|---|---|
| 01 | `01_ingesta.py` | Registra fuentes con procedencia; extrae márgenes comunales Censo 2024; construye hogares donantes CASEN 2022 |
| 02 | `02_poblacion.py` | Calibración entrópica a Censo 2024 y síntesis de 559.440 hogares (4 comunas); validación holdout |
| 03 | `03_doble.py` | Simula 24 meses; el registro decide con costura obligatoria; cada discrepancia entra al registro (6 campos) |
| 04 | `04_grafo_encargo.py` | Grafo SITIA en la misma ontología; ausencias como objetos; resolución conservadora contra RES |
| 05 | `05_validar.py` | Auditoría independiente (13 pruebas) |
| 06 | `06_vista.py` | Vista HTML autocontenida de evaluación |
| — | `adaptadores/` | Mercado Público (API) e InfoLobby (CSV): **no ejecutados**, requieren red con acceso |

## Base de datos común (`db/schema.sql`)

`fuente` (procedencia y plano de evidencia) · `tipo_objeto` / `objeto` / `vinculo` (ontología compartida A↔C) · `hogar_sintetico` · `accion` · `decision` (costura NOT NULL: confianza, antigüedad, umbral, procedencia) · `divergencia` (seis campos + tipología + locus) · `autorregistro` (el registro también diverge). El programa DOBLE es un nodo del grafo que "ejerce la función ausente" de SITIA: A y C comparten el mismo espacio de objetos.

## Fuentes y homologación

| Fuente | Año ref. | Uso | Acceso en la POC |
|---|---|---|---|
| CASEN 2022, microdatos (MDSF) | 2022 | Donantes: hogares, ingresos por componente, cotización/boleta | Espejo GitHub `bastianolea/casen_comparador_ingresos@9c5af8a` |
| Censo 2024, tabulados comunales D1, D5, H1, V3 (INE) | 2024 | Calibración (hogares, edad, tenencia), mudanza (D5), holdout (hacinamiento) | Espejo `bastianolea/censo_2024@a83fd7b` |
| Pobreza comunal SAE 2022 (MDSF) | 2022 | Holdout con IC | Espejo `cortega26/chile-hub@e8e07d1` |
| Registro de Empresas y Sociedades | 2013–2026 | Resolución de entidades (C) | Espejo `chile-hub` |
| sitia.gob.cl (portada, FAQ, nota Maule), nota SONDA | 2024–2026 | Semilla del grafo | WebFetch (extracción resumida) |

**Homologación declarada:** estructura CASEN 2022 recalibrada a márgenes Censo 2024 (brecha ≈ 2 años = horizonte de simulación). Tenencia homologada en 4 grupos; hacinamiento Censo (medio/crítico) vs CASEN (medio/alto/crítico) agrupado. Sustituciones directas previstas: **microdatos Censo 2024** (publicados por INE el 04-12-2025) y **microdatos CASEN 2024** (resultados ya publicados), ambos inaccesibles desde el entorno de la POC.

## Resultados

**A · DOBLE** (regla análoga compuesta: percentil 40 de ingreso equivalente; no es el algoritmo CSE-RSH)

| Comuna | Hogares | Prioriza registro | Elegible situado | Divergencia t0 | Divergencia t24 |
|---|---:|---:|---:|---:|---:|
| La Pintana | 53.951 | 58,2% | 55,4% | 29,2% | 29,9% |
| Las Condes | 116.176 | 17,4% | 6,2% | 12,9% | 15,7% |
| Puente Alto | 182.855 | 41,3% | 37,1% | 21,7% | 24,0% |
| Santiago | 206.458 | 30,5% | 25,1% | 21,0% | 25,1% |

Entradas en el registro: 130.038 (falso positivo por ingreso no registrable 57.865 · falso negativo por ingreso no registrable 20.376 · base desactualizada por movilidad 20.322 · falso negativo por posición relativa en el ranking 18.979 · desactualizada por rezago de ingreso formal 7.621 · por composición del hogar 4.874 · deriva de umbral 1).

Hallazgos útiles para el argumento:
1. **La costura mide lo que la interfaz oculta:** la confianza estimable por el propio sistema cae a 32–39% en los vigintiles contiguos al umbral (percentiles 40–50).
2. **Divergencia sin escena, cuantificada:** en 24 meses la divergencia sube 0,7 a 4,1 p.p. sin que ninguna decisión cambie de forma visible; Santiago concentra desactualización (33% de sus divergencias) por movilidad residencial (41,6% de llegados en 5 años según Censo 2024).
3. **Posición relativa:** 18.979 hogares plenamente formales quedan fuera de la priorización no por error propio sino porque la informalidad ajena, invisible al registro, los desplaza en el ranking. Es una divergencia sin culpable técnico, coherente con la simetría de la definición (2.1).
4. **Estratificación territorial de la tipología:** en Las Condes el 70% de las divergencias son falsos positivos; en La Pintana se reparten entre falsos positivos y negativos (41/40%).

**C · Grafo del encargo:** 53 objetos, 54 vínculos, 6 ausencias documentadas (protocolo de falsos positivos, proveedor en información institucional, plazos de retención, código de licitación, nómina del Comité de Ética, registro de divergencias). La resolución por nombre contra RES produce 78 coincidencias por subcadena para "SONDA" y ninguna resolución válida sin RUT: la fusión por nombre fabricaría vínculos falsos.

## Validación (12/13)

Superadas: integridad referencial; costura en 559.440 decisiones; seis campos en todas las entradas; **auditoría recomputada: 0 decisiones divergentes sin bitácora**; márgenes Censo reproducidos (desvío máx. 1,08%); pobreza por ingresos dentro del IC SAE 2022 en las 4 comunas; privacidad (0,17% de hogares con ingresos idénticos al donante); grafo con fuente y cita en todo vínculo; personas solo en rol; grafo conexo; ninguna empresa fusionada sin RUT.
**Fallida (se mantiene visible):** hacinamiento crítico en Santiago 2,8% sintético vs 5,4% Censo 2024. Probable cambio 2022→2024 no capturado por CASEN y diferencia vivienda/hogar; corrección: agregar hacinamiento como restricción o usar microdatos censales.

## Viabilidad

| Dimensión | Juicio | Condición para escalar |
|---|---|---|
| Datos para A | **Viable** | Reemplazar por microdatos Censo 2024 + CASEN 2024 (misma referencia temporal) |
| Calibración territorial | **Viable** en comunas con ≥300 hogares donantes; frágil en comunas pequeñas (pesos g hasta 5,1 en La Pintana) | Pool de donantes provincial para comunas con muestra < 300 |
| Regla de decisión | **Parcial:** análogo compuesto | Documentar la CSE-RSH vía Ley 20.285 (instrumento, fuentes, ventanas) |
| Deriva | **Hipótesis:** 9 de 10 parámetros son supuestos | Calibrar con flujos ENE-INE, AFC y tasas de actualización RSH |
| Datos para C | **Viable con acceso de red** | Ejecutar adaptadores desde red con acceso (ticket API Mercado Público; CSV InfoLobby); verificar citas literales |
| Base común | **Viable** | Migrar a PostgreSQL si se agregan sondas B (LLM) y D (lectura de patentes) |

Tipologías cubiertas: 4 de 7. `dato_nulo` y `clasificacion_erronea` → sonda D (lectura de patentes); `alucinacion_sintetica` → sonda B.

## Ética

Todo hogar es sintético y está marcado `caso_compuesto`. CASEN es microdato público anonimizado; la perturbación impide copias exactas. El grafo registra solo personas en su rol público. La POC no replica capacidades de identificación: no hay entrada para datos personales reales ni exportación a nivel de individuo real.
