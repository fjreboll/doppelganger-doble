"""04 · Grafo del encargo (C): la ontología de fusión aplicada hacia arriba, sobre el Estado y sus proveedores.

Carga la semilla curada de SITIA en la ontología común (objeto/vinculo), resuelve empresas contra el
Registro de Empresas y Sociedades, y trata las AUSENCIAS como objetos de primera clase.
Las fuentes transaccionales (Mercado Público, InfoLobby) entran por adaptadores (src/adaptadores/),
ejecutables desde una red con acceso a esos portales.
"""
import json, duckdb, pandas as pd
from comun import *

con = conectar()
seed = json.loads((SEEDS / "encargo_sitia.json").read_text())
for t in ["vinculo", "objeto", "tipo_objeto"]:
    con.execute(f"DELETE FROM {t}")
con.execute("DELETE FROM autorregistro WHERE componente LIKE 'C·%'")

TIPOS = {"Programa": "Sistema algorítmico público", "Institucion": "Organismo del Estado", "Unidad": "Unidad interna de un organismo",
         "Empresa": "Persona jurídica privada", "Comite": "Instancia asesora", "Instrumento": "Convenio, licitación, mandato",
         "Norma": "Ley o reglamento", "PersonaRol": "Persona en su rol público (nunca como individuo privado)",
         "Territorio": "Región o comuna", "Resultado": "Cifra declarada por el sistema", "Ausencia": "Lo que el encargo no documenta",
         "Hogar": "Hogar sintético (capa A)", "Accion": "Operación que produce decisiones (capa A)"}
CAPA = {"Hogar": "A", "Accion": "A"}
con.executemany("INSERT INTO tipo_objeto VALUES (?,?,?)", [(k, CAPA.get(k, "C"), v) for k, v in TIPOS.items()])

for f in seed["fuentes"]:
    f = dict(f)
    if f["via_acceso"] == "webfetch":
        f["nota_homologacion"] = "Extracción asistida (WebFetch) con resumen automático: las citas pueden ser paráfrasis; verificar texto literal antes de publicar."
    fuente(con, **f)

for o in seed["objetos"]:
    plano = "reconstruccion" if o["tipo"] == "Ausencia" and "no verificado" in o["nombre"] else "documentado"
    con.execute("INSERT INTO objeto VALUES (?,?,?,?,?,?,?)", (o["id"], o["tipo"], o["nombre"], j(o.get("atributos", {})), o["fuente"], plano, None))
for m in seed["municipios_nombrados"]:
    oid = "MUN-" + m.upper().replace(" ", "_")
    con.execute("INSERT INTO objeto VALUES (?,?,?,?,?,?,?)", (oid, "Institucion", f"Municipalidad de {m}", "{}", "sitia_home", "documentado", None))
    con.execute("INSERT INTO vinculo (origen,destino,tipo,fecha,fuente_id,plano_evidencia,cita) VALUES (?,?,?,?,?,?,?)",
                (oid, "PRG-SITIA", "colabora (adhesión)", None, "sitia_home", "documentado", "36 comunas de la Región Metropolitana (12 nombradas)"))
for o, d, t, f, fecha, cita in seed["vinculos"]:
    con.execute("INSERT INTO vinculo (origen,destino,tipo,fecha,fuente_id,plano_evidencia,cita) VALUES (?,?,?,?,?,?,?)",
                (o, d, t, fecha, f, "documentado", cita))

# ── puente A↔C: el gemelo DOBLE es también un sistema del grafo, con su propia ausencia resuelta
fuente(con, id="poc_doble", nombre="DOBLE · simulación compuesta", institucion="POC Doppelganger", via_acceso="interno", plano_evidencia="hipotesis")
con.execute("INSERT INTO objeto VALUES (?,?,?,?,?,?,?)", ("PRG-DOBLE", "Programa", "DOBLE · priorización comunal (análogo compuesto)",
            j({"hogares": con.execute("select count(*) from hogar_sintetico").fetchone()[0],
               "divergencias_registradas": con.execute("select count(*) from divergencia").fetchone()[0]}), "poc_doble", "hipotesis", HOY))
con.execute("INSERT INTO vinculo (origen,destino,tipo,fecha,fuente_id,plano_evidencia,cita) VALUES (?,?,?,?,?,?,?)",
            ("PRG-DOBLE", "AUS-REGISTRO-DIV", "ejerce_funcion_ausente", HOY, "poc_doble", "hipotesis", "registro de seis campos operativo en la base común"))

# ── resolución de entidades contra RES
RES = str(RAW / "chile_hub" / "empresas.parquet")
res_rows = []
for oid, nom in con.execute("select id, nombre from objeto where tipo='Empresa'").fetchall():
    clave = nom.split(" S.A.")[0].upper()
    n_sub = duckdb.sql(f"select count(*) from '{RES}' where upper(razon_social) like '%{clave}%'").fetchone()[0]
    n = duckdb.sql(f"select count(*) from '{RES}' where regexp_matches(upper(razon_social), '(^|[^A-ZÁÉÍÓÚÑ]){clave}([^A-ZÁÉÍÓÚÑ]|$)')").fetchone()[0]
    res_rows.append((oid, nom, n, n_sub))
    attrs = json.loads(con.execute("select atributos from objeto where id=?", (oid,)).fetchone()[0] or "{}")
    attrs["resolucion_RES"] = {"coincidencias_token": n, "coincidencias_subcadena": n_sub, "resuelta": False,
                               "nota": "Ninguna coincidencia por nombre se acepta sin RUT; RES cubre sociedades desde 2013 (Ley 20.659)"}
    con.execute("update objeto set atributos=? where id=?", (j(attrs), oid))
sin_res = res_rows  # sin RUT ninguna se da por resuelta
autorregistro(con, componente="C·resolución", que_registro="Resolución de empresas del grafo contra el Registro de Empresas y Sociedades",
              efecto="Atributo resolucion_RES en objetos Empresa", metrica=[dict(id=a, nombre=b, coincidencias_token=c, coincidencias_subcadena=d) for a, b, c, d in res_rows],
              inexactitud="Ninguna empresa resuelta: la búsqueda por nombre produce homónimos (p.ej. subcadenas 'SONDA' en razones sociales ajenas) "
                          "y el RES no cubre sociedades anteriores a 2013. La fusión por nombre fabricaría vínculos falsos: es la divergencia "
                          "de resolución de entidades que las plataformas de fusión ocultan",
              alcance="Objetos tipo Empresa", deteccion="Consulta directa al RES", correccion="Ejecutar adaptador Mercado Público (BuscarProveedor)")

# ── capa material: crecimiento del mercado local de 'inteligencia artificial' (agregado, sin razones sociales)
ia = duckdb.sql(f"""select anio, count(*) n from '{RES}' where tipo_actuacion ilike 'CONSTITUC%'
                    and upper(razon_social) like '%INTELIGENCIA ARTIFICIAL%'
                    group by anio order by anio""").df()
ia.to_csv(SALIDAS / "res_constituciones_ia_por_anio.csv", index=False)

# ── autorregistro: fuentes y límites de la semilla
autorregistro(con, componente="C·semilla", que_registro="Semilla del grafo SITIA desde 4 fuentes legibles (portada, FAQ, nota Maule, nota SONDA)",
              efecto=f"{con.execute('select count(*) from objeto').fetchone()[0]} objetos y {con.execute('select count(*) from vinculo').fetchone()[0]} vínculos",
              inexactitud="Citas obtenidas por extracción automatizada (posibles paráfrasis); página de gobernanza devolvió 403 y ficha GobLab no fue legible; "
                          "24 de 36 municipios no nombrados en la fuente; cifras de cámaras difieren entre fuentes (+2.200 vs más de 2.000) por fecha",
              alcance="Grafo del encargo", deteccion="Registro de estados de acceso por fuente",
              correccion="Verificar citas literales; solicitar vía Ley 20.285 el convenio SITIA, el mandato de tratamiento y la nómina del Comité de Ética")
con.commit()

g = pd.read_sql("select o.tipo, count(*) n from objeto o group by 1 order by 2 desc", con)
print(g.to_string(index=False)); print(res_rows); print(ia.tail(6).to_string(index=False))
