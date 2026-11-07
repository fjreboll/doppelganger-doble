"""16 · Guarda de los sitios publicados: nada de lo publicado puede desaparecer en una corrida.

Compara cada archivo de los sitios con su versión en el último commit (git HEAD) del repositorio respectivo.
Falla (código 1) si se pierde una clave de primer nivel, un nodo, vínculo o fuente del grafo de C, la sección
vida_dato o las calles OSM del banner de C. No corrige nada: indica qué archivo restaurar con git checkout.
Uso: python3 16_verificar_sitios.py   (desde pipeline/src; espera los dos repos como carpetas hermanas)
"""
import json, subprocess, sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
A, C = RAIZ.parent, RAIZ.parent.parent / "doppelganger-encargo"


def en_head(repo, ruta):
    r = subprocess.run(["git", "-C", str(repo), "show", f"HEAD:{ruta}"], capture_output=True, text=True)
    return json.loads(r.stdout) if r.returncode == 0 else None


def ids(lista):
    return {str(x.get("id")) for x in lista or [] if isinstance(x, dict)}


fallas = []
def revisar(repo, ruta, extra=None):
    actual_p = repo / ruta
    if not actual_p.exists():
        fallas.append(f"{repo.name}/{ruta}: no existe"); return
    antes, ahora = en_head(repo, ruta), json.loads(actual_p.read_text())
    if antes is None:
        return  # archivo nuevo o repo sin git: nada que comparar
    for k in set(antes) - set(ahora):
        fallas.append(f"{repo.name}/{ruta}: desapareció la clave «{k}»")
    if extra:
        extra(antes, ahora)


def grafo_c(antes, ahora):
    for k in ("nodos", "vinculos", "fuentes"):
        perdidos = ids(antes.get(k)) - ids(ahora.get(k))
        if perdidos:
            fallas.append(f"doppelganger-encargo/data.json: {len(perdidos)} {k} perdidos (p. ej. {sorted(perdidos)[:3]})")
    if antes.get("vida_dato") and not ahora.get("vida_dato", {}).get("estaciones"):
        fallas.append("doppelganger-encargo/data.json: la sección vida_dato quedó vacía")


def calles_c(antes, ahora):
    for k in ("escritorio", "movil"):
        if antes.get(k, {}).get("calles") and not ahora.get(k, {}).get("calles"):
            fallas.append(f"doppelganger-encargo/assets/banner_grid_sitia.json: faltan las calles OSM ({k}); correr 12_integrar_calles.py")


revisar(A, "data.json")
revisar(A, "assets/banner_grid.json")
if C.exists():
    revisar(C, "data.json", grafo_c)
    revisar(C, "assets/banner_grid_sitia.json", calles_c)

if fallas:
    print("FALLA · se perdió contenido publicado:\n  " + "\n  ".join(fallas))
    print("Restaurar con: git -C <repo> checkout -- <archivo>, y revisar qué script lo sobrescribió.")
    sys.exit(1)
print("OK · ningún contenido publicado se perdió respecto del último commit de cada sitio")
