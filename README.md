# regis-use

### Bienvenidos
  Hoy voy a documentar como conecté mi base de datos de prueba con Redis, (usando Python), con PostgreSQL

### ¿Por qué lo hicimos?
  bastante simple, para acelerar las consultas, ya que PostgreSQL es como un maestro cargando una mochila de ladrillos; puede hacer todo, pero carga mucho

#### Primero vamos a descargar
  bash
  ```
  #descargamos para debian, desde los repositorios oficiales
  sudo apt install redis-server -
  ```
#### Segundo, comprobamos que esté instalado
  bash
  ```
  #verificar estado redis
  sudo systemctl status redis
  #kuego le hacemos un ping
  redis-cli ping
  su respuesta: PONG #jeje
  ```
#### Tercero
  bash
  ```
  #Le pones tu contraseña
  redis-cli -a "noreikutron" #por ejemplo
  #desde el redis se escribiría
  AUTH noreikutron
  #te responde ↓
  OK
  ```
#### Cuarto
  bash
  ```
  #para instalar
  sudo apt install postgresql postgresql-contrib -y
  ```
#### Quinto
  bash
  ```
  #instalamos 
  sudo apt install python3-pip -y #instalamos pip por si acaso
  pip3 install redis psycopg2-binary #parece que dice psichology, pero es para conectar regis con Python
  #si da error el piṕ3, usa --break-system-packages.
  pip3 install redis psycopg2-binary --break-system-packages #no es seguro, pero es rápido
  ```
#### Sexto
  Escribes en Python; el código acontinuación.
  python
  ```
import redis #importamos redis
import psycopg2 #un órgano de Python para que puedan hablar
import json #para enviar datos de forma rápida
import time #la hora para timestamp y/o medir velocidad

# Conexiones (con tu contraseña de Redis que pusiste antes)
r = redis.Redis(host='localhost', port=6379, password='noreikutron', decode_responses=True)

conn = psycopg2.connect(
    database="tarea_escuela",
    user="tarea_user",
    password="vacaciones2026",
    host="localhost"
)
conn.autocommit = True  # Para que los comandos se ejecuten inmediatamente
cur = conn.cursor()
cur.execute("SET search_path TO public;")
cur.execute("GRANT ALL ON SCHEMA public TO public;")  # Dar permisos a todos
conn.commit()
cur.close()
conn.autocommit = False
def consulta_con_cache(query, cache_key, ttl=60):
    """Primero busca en Redis, si no, va a PostgreSQL y guarda"""
    
    # Buscar en caché
    cached = r.get(cache_key)
    if cached:
        print("🎯 (Respondido desde Redis - rápido y fácil)")
        return json.loads(cached)
    
    # Si no está, consultar PostgreSQL
    print("🐘 (Consultando PostgreSQL - solo esta vez)")
    cur = conn.cursor()
    cur.execute(query)
    resultado = cur.fetchall()
    cur.close()
    
    # Guardar en Redis por 'ttl' segundos
    r.setex(cache_key, ttl, json.dumps(resultado))
    return resultado

# ========== EJEMPLO PARA MOSTRAR AL PROFE ==========

# 1. Crear una tabla de ejemplo
cur = conn.cursor()
cur.execute("""
    CREATE TABLE IF NOT EXISTS estudiantes (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100),
        tarea_completada BOOLEAN
    );
""")
conn.commit()
cur.close()

# 2. Insertar datos de prueba (para que se vea que funciona)
cur = conn.cursor()
cur.execute("""
    INSERT INTO estudiantes (nombre, tarea_completada) 
    VALUES ('Yo', true), ('Compañero distraído', false)
    ON CONFLICT DO NOTHING;
""")
conn.commit()
cur.close()

# 3. Primera consulta (va a PostgreSQL)
print("\n--- PRIMERA CONSULTA (debe ir a PostgreSQL) ---")
resultado1 = consulta_con_cache(
    "SELECT * FROM estudiantes WHERE tarea_completada = true",
    "estudiantes_activos"
)
print(f"Resultado: {resultado1}")

# 4. Segunda consulta (saldrá desde Redis)
print("\n--- SEGUNDA CONSULTA (debe salir de Redis) ---")
resultado2 = consulta_con_cache(
    "SELECT * FROM estudiantes WHERE tarea_completada = true",
    "estudiantes_activos"
)
print(f"Resultado: {resultado2}")

print("\n✅ Tarea completada. Redis está cacheando las consultas a PostgreSQL.")
print("❄️ Ahora sí, ¡a disfrutar las vacaciones de invierno! 🏂")

  ```
Si en Bash te da error como este
bash
```
python3 tarea.py
Traceback (most recent call last):
  File "/home/uzy/tarea.py", line 40, in <module>
    cur.execute("""
psycopg2.errors.InsufficientPrivilege: permission denied for schema public
LINE 2:     CREATE TABLE IF NOT EXISTS estudiantes (
```
se arregla muy simple
bash
```
sudo -u postgres psql -d tarea_escuela -c "GRANT ALL ON SCHEMA public TO tarea_user;
```
SI te devuelve GRANT, todo es GRANDioso, (estamos bien)
Y luego limpiamos
bash
```
uzy@uzy-sf20gm7:~$ # Eliminar lo que hicimos mal
sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS tarea_escuela;
DROP USER IF EXISTS tarea_user;
EOF

# Crearlo bien esta vez
sudo -u postgres psql << EOF
CREATE USER tarea_user WITH PASSWORD 'vacaciones2026';
CREATE DATABASE tarea_escuela OWNER tarea_user;
GRANT ALL PRIVILEGES ON DATABASE tarea_escuela TO tarea_user;
\c tarea_escuela
GRANT ALL ON SCHEMA public TO tarea_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO tarea_user;
EOF
DROP DATABASE
DROP ROLE
CREATE ROLE
CREATE DATABASE
GRANT
You are now connected to database "tarea_escuela" as user "postgres".
GRANT
ALTER DEFAULT PRIVILEGES
```
#### Uso
bash
```
#creamos una tabla de prueba
PGPASSWORD='vacaciones2026' psql -U tarea_user -d tarea_escuela -h localhost -c "CREATE TABLE prueba (id int); DROP TABLE prueba;"
```
Lo que nos queda

bash
```
sudo -u postgres psql -c "ALTER USER tarea_user WITH SUPERUSER;" && python3 tarea.py && sudo -u postgres psql -c "ALTER USER tarea_user WITH NOSUPERUSER;"
ALTER ROLE

--- PRIMERA CONSULTA (debe ir a PostgreSQL) ---
🐘 (Consultando PostgreSQL - solo esta vez)
Resultado: [(1, 'Yo', True)]

--- SEGUNDA CONSULTA (debe salir de Redis) ---
🎯 (Respondido desde Redis - rápido y fácil)
Resultado: [[1, 'Yo', True]]

✅ Tarea completada. Redis está cacheando las consultas a PostgreSQL.
❄ Ahora sí, ¡a disfrutar las vacaciones de invierno! 🏂
ALTER ROLE
uzy@uzy-sf20gm7:~$ python3 tarea.py


--- PRIMERA CONSULTA (debe ir a PostgreSQL) ---
🐘 (Consultando PostgreSQL - solo esta vez)
Resultado: [(1, 'Yo', True), (3, 'Yo', True)]

--- SEGUNDA CONSULTA (debe salir de Redis) ---
🎯 (Respondido desde Redis - rápido y fácil)
Resultado: [[1, 'Yo', True], [3, 'Yo', True]]

✅ Tarea completada. Redis está cacheando las consultas a PostgreSQL.
❄ Ahora sí, ¡a disfrutar las vacaciones de invierno! 🏂
```
## Conclusión personal
Redis es como un asistente personal que recuerda todo por vos. PostgreSQL hace el trabajo pesado una sola vez, y Redis se encarga de repetirlo rápido. La combinación es ideal para aplicaciones que necesitan responder rápido sin matar al servidor.

## Qué aprendí
- Los permisos en PostgreSQL son como los de tu casa: hay que dar la llave correcta a cada persona.
- Redis envejece los datos (TTL) para que no queden obsoletos.
- Python es el pegamento que une todo.



Gracias por leer, que les vaya bien
