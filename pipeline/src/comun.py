"""Utilidades comunes: rutas, conexión a la base y registro de fuentes.

Prototipo Fase 1 (ver propuesta de arquitectura): motor DuckDB en vez de SQLite.
Nombre de archivo distinto (doppelganger.duckdb) para no pisar la base SQLite
de producción mientras ambas conviven.
"""
import json, duckdb, datetime as dt
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
DB = RAIZ / "db" / "doppelganger.duckdb"
RAW = RAIZ / "data" / "raw"
INTERIM = RAIZ / "data" / "interim"
SEEDS = RAIZ / "data" / "seeds"
SALIDAS = RAIZ / "salidas"

COMUNAS_PILOTO = {"13101": "Santiago", "13112": "La Pintana", "13114": "Las Condes", "13201": "Puente Alto"}
HOY = dt.date.today().isoformat()
SEMILLA = 20260915


def conectar():
    return duckdb.connect(str(DB))


def iniciar_db(reset=False):
    if reset and DB.exists():
        DB.unlink()
    con = conectar()
    con.execute((RAIZ / "db" / "schema.sql").read_text())
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
