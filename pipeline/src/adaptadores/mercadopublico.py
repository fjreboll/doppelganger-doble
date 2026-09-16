"""Adaptador Mercado Público (ChileCompra) → ontología común.  ESTADO: no ejecutado en la POC.

Requiere: ticket de API (solicitud gratuita en https://api.mercadopublico.cl) y red con acceso al portal.
Endpoints (verificar contra la documentación vigente antes de usar):
  licitaciones.json?codigo=<CODIGO>&ticket=<T>
  ordenesdecompra.json?codigo=<CODIGO>&ticket=<T>
  Empresas/BuscarProveedor?rutempresaproveedor=<RUT>&ticket=<T>
Uso:  MP_TICKET=xxxx python3 mercadopublico.py --licitacion 1234-56-LR24
Alternativa sin API: descargas masivas de https://datos-abiertos.chilecompra.cl/descargas (CSV) → cargar_csv().
"""
import os, sys, json, argparse, urllib.request, sqlite3
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from comun import conectar, fuente, HOY

BASE = "https://api.mercadopublico.cl/servicios/v1/publico/"


def get(ruta, **params):
    params["ticket"] = os.environ["MP_TICKET"]
    q = "&".join(f"{k}={v}" for k, v in params.items())
    with urllib.request.urlopen(f"{BASE}{ruta}?{q}", timeout=60) as r:
        return json.load(r)


def cargar_licitacion(con, codigo, programa="PRG-SITIA"):
    d = get("licitaciones.json", codigo=codigo)
    fid = f"mp_{codigo}"
    fuente(con, id=fid, nombre=f"Mercado Público · licitación {codigo}", institucion="ChileCompra",
           url=f"https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion={codigo}",
           via_acceso="api", plano_evidencia="documentado")
    for l in d.get("Listado", []):
        lid = f"LIC-{codigo}"
        con.execute("INSERT OR REPLACE INTO objeto VALUES (?,?,?,?,?,?,?)", (lid, "Instrumento", l.get("Nombre", codigo),
                    json.dumps({k: l.get(k) for k in ["Estado", "FechaCierre", "MontoEstimado", "Moneda"]}, ensure_ascii=False), fid, "documentado", HOY))
        comp = l.get("Comprador", {})
        cid = "INS-" + str(comp.get("CodigoOrganismo"))
        con.execute("INSERT OR IGNORE INTO objeto VALUES (?,?,?,?,?,?,?)", (cid, "Institucion", comp.get("NombreOrganismo", cid), "{}", fid, "documentado", HOY))
        con.execute("INSERT INTO vinculo (origen,destino,tipo,fecha,fuente_id,plano_evidencia,cita) VALUES (?,?,?,?,?,?,?)",
                    (cid, lid, "licita", l.get("FechaCreacion"), fid, "documentado", "API Mercado Público"))
        for it in (l.get("Items", {}) or {}).get("Listado", []):
            adj = it.get("Adjudicacion") or {}
            if adj.get("RutProveedor"):
                eid = "EMP-" + adj["RutProveedor"]
                con.execute("INSERT OR IGNORE INTO objeto VALUES (?,?,?,?,?,?,?)", (eid, "Empresa", adj.get("NombreProveedor", eid),
                            json.dumps({"rut": adj["RutProveedor"]}), fid, "documentado", HOY))
                con.execute("INSERT INTO vinculo (origen,destino,tipo,fecha,fuente_id,plano_evidencia,cita) VALUES (?,?,?,?,?,?,?)",
                            (eid, lid, "adjudicataria", None, fid, "documentado", f"monto {adj.get('MontoUnitario')} x {adj.get('Cantidad')}"))
        con.execute("INSERT INTO vinculo (origen,destino,tipo,fecha,fuente_id,plano_evidencia,cita) VALUES (?,?,?,?,?,?,?)",
                    (lid, programa, "financia", None, fid, "reconstruccion", "asociación a verificar manualmente"))
    con.commit()


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--licitacion", required=True)
    cargar_licitacion(conectar(), ap.parse_args().licitacion)
