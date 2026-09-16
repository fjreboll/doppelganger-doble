"""Adaptador InfoLobby (Ley 20.730) → ontología común.  ESTADO: no ejecutado en la POC.

Fuente: descargas de datos abiertos en https://www.infolobby.cl/DatosAbiertos (CSV de audiencias).
Los nombres de columnas deben verificarse contra el archivo descargado; el mapeo se declara en MAPEO.
Solo se cargan: sujeto pasivo (autoridad, en su rol), institución, entidad representada (persona jurídica),
fecha y materia. Los asistentes particulares no se cargan como PersonaRol.
Uso: python3 infolobby.py audiencias.csv --filtro "teleprotec|SITIA|patentes|cámaras|inteligencia artificial"
"""
import sys, re, argparse, pandas as pd
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from comun import conectar, fuente, HOY, j

MAPEO = {"fecha": "Fecha", "institucion": "Institución", "sujeto_pasivo": "Sujeto Pasivo", "cargo": "Cargo",
         "materia": "Materia", "representado": "Representados"}  # ← ajustar a los encabezados reales


def cargar(con, ruta, filtro):
    df = pd.read_csv(ruta, sep=None, engine="python")
    df = df.rename(columns={v: k for k, v in MAPEO.items()})
    df = df[df.materia.astype(str).str.contains(filtro, flags=re.I, regex=True)]
    fid = "infolobby_" + Path(ruta).stem
    fuente(con, id=fid, nombre=f"InfoLobby · {Path(ruta).name}", institucion="Consejo para la Transparencia",
           url="https://www.infolobby.cl/DatosAbiertos", via_acceso="descarga", plano_evidencia="documentado")
    for i, r in df.iterrows():
        aid = f"AUD-{fid}-{i}"
        con.execute("INSERT OR REPLACE INTO objeto VALUES (?,?,?,?,?,?,?)", (aid, "Instrumento", f"Audiencia de lobby · {str(r.materia)[:80]}",
                    j({"fecha": str(r.fecha), "materia": str(r.materia)}), fid, "documentado", HOY))
        pid = "PER-" + re.sub(r"\W+", "_", f"{r.sujeto_pasivo}_{r.cargo}").upper()[:60]
        con.execute("INSERT OR IGNORE INTO objeto VALUES (?,?,?,?,?,?,?)", (pid, "PersonaRol", f"{r.sujeto_pasivo} · {r.cargo}", "{}", fid, "documentado", HOY))
        con.execute("INSERT INTO vinculo (origen,destino,tipo,fecha,fuente_id,plano_evidencia,cita) VALUES (?,?,?,?,?,?,?)",
                    (pid, aid, "recibe_audiencia", str(r.fecha), fid, "documentado", str(r.materia)[:200]))
        for ent in str(r.representado).split(";"):
            if ent.strip() and ent.strip().lower() != "nan":
                eid = "EMP-" + re.sub(r"\W+", "_", ent.strip()).upper()[:60]
                con.execute("INSERT OR IGNORE INTO objeto VALUES (?,?,?,?,?,?,?)", (eid, "Empresa", ent.strip(), "{}", fid, "reconstruccion", HOY))
                con.execute("INSERT INTO vinculo (origen,destino,tipo,fecha,fuente_id,plano_evidencia,cita) VALUES (?,?,?,?,?,?,?)",
                            (eid, aid, "representada_en", str(r.fecha), fid, "documentado", "InfoLobby"))
    con.commit(); return len(df)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("csv"); ap.add_argument("--filtro", default="teleprotec|SITIA|patente|cámara|inteligencia artificial")
    a = ap.parse_args(); print(cargar(conectar(), a.csv, a.filtro), "audiencias cargadas")
