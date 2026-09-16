-- DOPPELGANGER POC · Base de datos común
-- Registro público de divergencias algorítmicas + ontología (A: DOBLE) + grafo del encargo (C)
-- Principio: ninguna decisión sin costura; ninguna costura sin fuente.

PRAGMA foreign_keys = ON;

-- ───────────── Procedencia ─────────────
CREATE TABLE IF NOT EXISTS fuente (
  id                  TEXT PRIMARY KEY,
  nombre              TEXT NOT NULL,
  institucion         TEXT NOT NULL,
  url                 TEXT,
  anio_referencia     TEXT,             -- año que describe el dato
  fecha_publicacion   TEXT,
  fecha_acceso        TEXT NOT NULL,
  via_acceso          TEXT NOT NULL,    -- 'oficial' | 'espejo:<repo@commit>' | 'webfetch'
  licencia            TEXT,
  plano_evidencia     TEXT NOT NULL CHECK (plano_evidencia IN ('documentado','reconstruccion','hipotesis')),
  nota_homologacion   TEXT
);

-- ───────────── Ontología común ─────────────
CREATE TABLE IF NOT EXISTS tipo_objeto (
  tipo        TEXT PRIMARY KEY,
  capa        TEXT NOT NULL CHECK (capa IN ('A','C','comun')),
  descripcion TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS objeto (
  id              TEXT PRIMARY KEY,
  tipo            TEXT NOT NULL REFERENCES tipo_objeto(tipo),
  nombre          TEXT NOT NULL,
  atributos       TEXT,                 -- JSON
  fuente_id       TEXT NOT NULL REFERENCES fuente(id),
  plano_evidencia TEXT NOT NULL CHECK (plano_evidencia IN ('documentado','reconstruccion','hipotesis')),
  fecha_dato      TEXT
);

CREATE TABLE IF NOT EXISTS vinculo (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  origen          TEXT NOT NULL REFERENCES objeto(id),
  destino         TEXT NOT NULL REFERENCES objeto(id),
  tipo            TEXT NOT NULL,
  fecha           TEXT,
  fuente_id       TEXT NOT NULL REFERENCES fuente(id),
  plano_evidencia TEXT NOT NULL CHECK (plano_evidencia IN ('documentado','reconstruccion','hipotesis')),
  cita            TEXT                  -- fragmento textual que respalda el vínculo
);

-- ───────────── A · DOBLE: gemelo sintético ─────────────
CREATE TABLE IF NOT EXISTS censo_objetivo (
  comuna_cut TEXT, variable TEXT, categoria TEXT, valor REAL, fuente_id TEXT REFERENCES fuente(id),
  uso TEXT CHECK (uso IN ('calibracion','validacion')),
  PRIMARY KEY (comuna_cut, variable, categoria)
);

CREATE TABLE IF NOT EXISTS hogar_sintetico (
  id              TEXT PRIMARY KEY,
  comuna_cut      TEXT NOT NULL,
  donante_folio   INTEGER NOT NULL,     -- trazabilidad al microdato público CASEN
  estatuto        TEXT NOT NULL DEFAULT 'caso_compuesto',
  numper_t0 INTEGER, n0_14 INTEGER, n15_29 INTEGER, n30_44 INTEGER, n45_64 INTEGER, n65 INTEGER,
  tenencia TEXT, hacinamiento TEXT,
  y_formal_t0 REAL, y_informal_t0 REAL, y_pension REAL, y_subsidio REAL,
  -- estado situado a t24
  numper_t24 INTEGER, y_formal_t24 REAL, y_informal_t24 REAL, se_mudo INTEGER,
  -- estado del registro a t24
  numper_reg INTEGER, y_formal_reg REAL, domicilio_reg_vigente INTEGER, meses_sin_actualizar INTEGER
);

CREATE TABLE IF NOT EXISTS accion (
  id            TEXT PRIMARY KEY,
  tipo          TEXT NOT NULL,
  sistema       TEXT NOT NULL,
  parametros    TEXT NOT NULL,          -- JSON: umbral, regla, escala
  mes_sim       INTEGER,
  ejecutada_en  TEXT NOT NULL,
  n_evaluados   INTEGER, n_positivas INTEGER, n_divergencias INTEGER
);

-- La costura es obligatoria: NOT NULL en confianza, antigüedad, umbral y procedencia.
CREATE TABLE IF NOT EXISTS decision (
  accion_id         TEXT NOT NULL REFERENCES accion(id),
  hogar_id          TEXT NOT NULL REFERENCES hogar_sintetico(id),
  resultado         INTEGER NOT NULL,   -- 1 = priorizado por el registro
  percentil_reg     REAL NOT NULL,
  confianza         REAL NOT NULL,
  antiguedad_meses  INTEGER NOT NULL,
  umbral            REAL NOT NULL,
  procedencia       TEXT NOT NULL,
  divergencia_id    TEXT REFERENCES divergencia(id),
  PRIMARY KEY (accion_id, hogar_id)
);

-- ───────────── Registro público de divergencias (6 campos) ─────────────
CREATE TABLE IF NOT EXISTS divergencia (
  id              TEXT PRIMARY KEY,
  estatuto        TEXT NOT NULL CHECK (estatuto IN ('caso_compuesto','documental','consentido')),
  sistema         TEXT NOT NULL,
  tipologia       TEXT NOT NULL CHECK (tipologia IN
                    ('dato_nulo','base_desactualizada','falso_positivo','falso_negativo',
                     'clasificacion_erronea','deriva','alucinacion_sintetica')),
  locus           TEXT,                 -- causa situada: movilidad, composicion, ingreso_no_registrable, ...
  representacion  TEXT NOT NULL,        -- 1. qué representó el sistema (JSON)
  decision        TEXT NOT NULL,        -- 2. qué decisión produjo
  ocurrido        TEXT NOT NULL,        -- 3. qué ocurrió según otras prácticas (JSON)
  afectado        TEXT NOT NULL,        -- 4. quién resultó afectado (JSON)
  reparacion      TEXT,                 -- 5. qué reparación hubo (NULL = ninguna)
  formulacion     TEXT NOT NULL,        -- 6. quién la formuló, con qué evidencia y reconocimiento (JSON)
  accion_id       TEXT REFERENCES accion(id),
  objeto_ref      TEXT,
  creada_en       TEXT NOT NULL
);

-- El registro también diverge.
CREATE TABLE IF NOT EXISTS autorregistro (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  componente    TEXT NOT NULL,
  que_registro  TEXT NOT NULL,
  efecto        TEXT NOT NULL,
  inexactitud   TEXT NOT NULL,
  metrica       TEXT,                   -- JSON
  alcance       TEXT NOT NULL,
  correccion    TEXT,
  deteccion     TEXT NOT NULL,
  fecha         TEXT NOT NULL
);

-- El control "ninguna decisión divergente sin bitácora" se audita en src/05_validar.py,
-- recomputando el estado situado de forma independiente al sistema que decide.

CREATE INDEX IF NOT EXISTS ix_div_tipo ON divergencia(tipologia);
CREATE INDEX IF NOT EXISTS ix_hogar_comuna ON hogar_sintetico(comuna_cut);
