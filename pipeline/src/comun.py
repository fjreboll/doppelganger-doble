"""Utilidades comunes: rutas, conexión a la base y registro de fuentes."""
import json, sqlite3, datetime as dt
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
DB = RAIZ / "db" / "doppelganger.db"
RAW = RAIZ / "data" / "raw"
INTERIM = RAIZ / "data" / "interim"
SEEDS = RAIZ / "data" / "seeds"
SALIDAS = RAIZ / "salidas"

COMUNAS_PILOTO = {"13101": "Santiago", "13112": "La Pintana", "13114": "Las Condes", "13201": "Puente Alto"}
HOY = dt.date.today().isoformat()
SEMILLA = 20260915


def conectar():
    con = sqlite3.connect(DB)
    con.execute("PRAGMA foreign_keys = ON")
    return con


def iniciar_db(reset=False):
    if reset and DB.exists():
        DB.unlink()
    con = conectar()
    con.executescript((RAIZ / "db" / "schema.sql").read_text())
    return con


def fuente(con, **kw):
    kw.setdefault("fecha_acceso", HOY)
    cols = ",".join(kw)
    con.execute(f"INSERT OR REPLACE INTO fuente ({cols}) VALUES ({','.join('?'*len(kw))})", list(kw.values()))


def autorregistro(con, **kw):
    kw.setdefault("fecha", HOY)
    if isinstance(kw.get("metrica"), (dict, list)):
        kw["metrica"] = json.dumps(kw["metrica"], ensure_ascii=False)
    cols = ",".join(kw)
    con.execute(f"INSERT INTO autorregistro ({cols}) VALUES ({','.join('?'*len(kw))})", list(kw.values()))


def j(x):
    return json.dumps(x, ensure_ascii=False, default=float)


# ───────── Propiedad de los data.json publicados ─────────
# El pipeline solo escribe las claves que produce. Lo curado a mano en los sitios (en C: nodos y vínculos
# agregados, verificación de citas, vida_dato, Oficio N.° 3736, folios de transparencia) no se regenera
# desde la base y por eso nunca se sobrescribe. Ver 16_verificar_sitios.py.
CLAVES_PIPELINE_C = ("ia_res", "tipos")


def actualizar_json(ruta, nuevas, claves=None):
    """Reemplaza en el JSON existente solo `claves` (por defecto, todas las de `nuevas`) y conserva el resto."""
    ruta = Path(ruta)
    texto = ruta.read_text() if ruta.exists() else ""
    D = json.loads(texto) if texto else {}
    previo = json.dumps(D, sort_keys=True, default=str)
    for k in (claves or nuevas.keys()):
        D[k] = nuevas[k]
    if json.dumps(D, sort_keys=True, default=str) == previo:
        return D  # sin cambios de contenido: no se toca el archivo (evita diffs de formato)
    sangria = 1 if texto.startswith("{\n") else None  # respeta el formato del archivo publicado
    ruta.write_text(json.dumps(D, ensure_ascii=False, default=str, allow_nan=False, indent=sangria))
    return D


def exportar_autorregistro_a(con, sitio=None):
    """Vuelca al data.json de A todo el autorregistro A·* de la base. Lo llaman 09, 13 y 14 al terminar,
    para que el sitio no dependa del orden en que se corrieron (antes 09 lo escribía antes de 13 y 14)."""
    import pandas as pd
    filas = pd.read_sql("select componente, que_registro, efecto, inexactitud, correccion, deteccion from autorregistro "
                        "where componente like 'A%' order by id", con).to_json(orient="records", force_ascii=False)
    actualizar_json(Path(sitio or RAIZ.parent) / "data.json", {"autorregistro": json.loads(filas)})
