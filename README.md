# regis-use

### Bienvenidos
  Hoy voy a documentar como conecté mi base de datos de prueba con Regis, (usando Python), con PostgreSQL

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
### Quinto
  bash
  ```
  ```
  
~~
