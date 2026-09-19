# Anexo técnico · Análisis de sensibilidad del registro sintético

**Prueba A · Santiago Gemelo Digital** · ejecutado el 19 de septiembre de 2026 con `src/14_sensibilidad.py` sobre la misma base que produce el sitio. Responde a la objeción de que las cifras del dispositivo sean artefactos de sus propios supuestos, separando lo que es dato de lo que es simulación.

## 1. Qué es dato y qué es simulación

| Resultado | Origen | Depende de |
|---|---|---|
| Curva de confianza por vigintil | CASEN 2022 expandida, hogares reales | escala de equivalencia y umbral |
| Cortes del percentil 40 | CASEN 2022 nacional, factor de expansión | — |
| Márgenes por comuna | Censo 2024 (D1, D5, H1, V3) | — |
| Tasas de divergencia a 24 meses | simulación de deriva | nueve probabilidades mensuales supuestas |
| Composición de la población sintética | donantes CASEN calibrados a Censo | emparejamiento y ruido ±5% |

La curva de confianza —el resultado más citado del dispositivo— no proviene de la simulación: compara, en hogares reales, la clasificación que produce el ingreso equivalente registrable con la que produce el ingreso equivalente total.

## 2. Sensibilidad de la curva de confianza (dato real)

Acierto de la regla, definido como la proporción de hogares en que la clasificación registrable y la situada coinciden, en los dos vigintiles inmediatamente superiores al umbral.

| Escala | Umbral | Acierto en la franja sobre el umbral | Mínimo de la curva | Vigintil del mínimo | Acierto medio |
|---|---|---|---|---|---|
| 0.5 | p30 | 40.4%–47.9% | 40.4% | v6 (30–35) | 79.5% |
| 0.5 | p40 | 33.2%–45.5% | 33.2% | v8 (40–45) | 80.3% |
| 0.5 | p50 | 34.4%–46.8% | 34.4% | v10 (50–55) | 83.0% |
| 0.7 | p30 | 48.3%–49.6% | 48.3% | v7 (35–40) | 79.7% |
| 0.7 | p40 | 31.8%–39.2% | 31.8% | v8 (40–45) | 78.9% |
| 0.7 | p50 | 32.4%–45.1% | 32.4% | v10 (50–55) | 82.1% |
| 1.0 | p30 | 34.0%–56.7% | 34.0% | v6 (30–35) | 80.5% |
| 1.0 | p40 | 43.1%–49.9% | 43.1% | v9 (45–50) | 79.8% |
| 1.0 | p50 | 23.7%–34.9% | 23.7% | v10 (50–55) | 79.8% |

**Lectura.** En las nueve configuraciones el mínimo de la curva cae en el vigintil que contiene el umbral o en el contiguo. La magnitud varía entre 23,7% y 48,3%; la caída junto al umbral se mantiene. Es una propiedad estructural de cualquier regla de corte aplicada a ingresos parcialmente observables, no un efecto de la parametrización elegida.

## 3. Sensibilidad de las tasas de divergencia (simulación)

Tres escenarios de informalidad por tres semillas. El escenario base usa `p_informal_tras_perdida_mes` = 0,08 y `fraccion_ingreso_informal` = 0,6; el bajo, 0,04 y 0,40; el alto, 0,14 y 0,80. Todo lo demás se mantiene constante.

| Escenario | Semilla | Divergencia | Falso positivo | Falso negativo | La Pintana | Las Condes | Puente Alto | Santiago | Acierto simulado p40–p50 |
|---|---|---|---|---|---|---|---|---|---|
| informalidad baja | 20260916 | 22.9% | 13.8% | 9.1% | 29.5% | 15.4% | 23.6% | 24.8% | 45.8%–46.9% |
| informalidad baja | 20261016 | 23.0% | 13.9% | 9.1% | 29.6% | 15.6% | 23.6% | 24.9% | 45.7%–46.9% |
| informalidad baja | 20261117 | 23.0% | 13.9% | 9.1% | 29.5% | 15.6% | 23.6% | 24.9% | 45.3%–46.9% |
| base | 20260916 | 23.2% | 14.6% | 8.7% | 29.9% | 15.7% | 24.0% | 25.1% | 47.3%–48.9% |
| base | 20261016 | 23.3% | 14.6% | 8.7% | 29.9% | 15.7% | 24.0% | 25.3% | 47.0%–48.9% |
| base | 20261117 | 23.4% | 14.7% | 8.7% | 29.8% | 15.8% | 24.1% | 25.3% | 46.7%–48.9% |
| informalidad alta | 20260916 | 23.5% | 15.4% | 8.2% | 30.4% | 15.7% | 24.4% | 25.4% | 49.3%–51.5% |
| informalidad alta | 20261016 | 23.6% | 15.4% | 8.2% | 30.4% | 15.7% | 24.5% | 25.6% | 49.0%–51.5% |
| informalidad alta | 20261117 | 23.6% | 15.4% | 8.2% | 30.3% | 15.8% | 24.6% | 25.5% | 48.6%–51.6% |

**Lectura.** La divergencia total se mueve entre 22,9% y 23,6% (±0,4 puntos porcentuales respecto del escenario base) y el orden entre comunas se mantiene en las nueve corridas. Lo que sí se mueve con el supuesto de informalidad es la composición del error: el falso positivo pasa de 13,8% a 15,4% y el falso negativo baja de 9,1% a 8,2%, con consecuencias de política distintas —priorizar a quien no lo necesita frente a excluir a quien sí—.

**Contraste con el dato real.** En la población sintética el acierto junto al umbral queda entre 45,3% y 51,6%, frente al 31,8%–39,3% que arroja la CASEN 2022. El modelo es conservador: subestima la confusión que el corte produce sobre hogares reales, porque su heterogeneidad de ingreso no registrable es menor que la observada.

## 4. Ficha de reproducibilidad

- **Semilla base:** 20260915 (`comun.SEMILLA`); semillas del análisis: 20260916, 20261016, 20261117.
- **Definición operativa de divergencia:** al mes 24, `prioriza_registro ≠ elegible_situado`, donde el registro usa el promedio móvil de doce meses del ingreso formal más pensiones, subsidios y otros ingresos registrables, sobre las personas declaradas; y la vida situada usa el ingreso total del mes sobre las personas reales, con residencia efectiva en la comuna.
- **Escala de equivalencia:** 0,7 (supuesto declarado). **Umbral:** percentil 40 de la distribución nacional CASEN 2022 expandida.
- **Fuentes:** CASEN 2022 (microdatos, vía espejo fijado por commit), Censo 2024 (tabulados D1, D5, H1, V3), RSH 2023 (SINIM, validación externa), límites comunales BCN.
- **Salidas:** `salidas/sens_confianza.csv`, `salidas/sens_divergencia.csv`, `salidas/sensibilidad.json`.
- **Autorregistro:** la entrada `A·sensibilidad` del sitio informa este análisis, su hallazgo y la inexactitud que deja pendiente (nueve probabilidades de deriva sin calibrar).

## 5. Qué queda pendiente

Calibrar las probabilidades de deriva con la Encuesta Nacional de Empleo, los registros del seguro de cesantía y la frecuencia efectiva de actualización del Registro Social de Hogares. Hasta entonces, las tasas de divergencia deben leerse como magnitud de orden y no como medición: lo que el análisis establece es que esa magnitud no se sostiene en los supuestos que la objeción señalaba.
