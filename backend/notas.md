NodeJS:

- Entorno de ejecucion donde se corre el codigo de Javascript FUERA DEL SERVIDOR.
- Consturido sobre el motor V8 (motor de google chrome)
- Gestor de paquetes: npm
- Un solo hilo (single-threaded)
- Core Modules (fs, http, path...).

Nodejs -> permite correr un programa de js fuera del servidor, es decir sobre el sistema operativo.

npm -> gestor de paquetes y dependencias de NODEJS.

express -> framework construido sobre el modulo "http" de node

1.2 modelo de ejecucion:

I/O bloqueante (síncrono): ejecuta una sola tarea hasta finalizar, hasta eso no ejecuta otra.

I/O no bloqueante (asíncrono): Node delega la operación al sistema operativo o al thread pool de libuv, sigue ejecutando otras tareas, y cuando la operación termina se encola su callback para procesarlo.

1.3 Event loop -> mientras haya trabajo node sigue corriendo.

fases del loop:
timers (setTimeout, setInterval) → pending callbacks → poll (I/O) →
check (setImmediate) → close callbacks.

Ciclo de vida de node: se cargan modulos y globales -> se procesa el script y el Event Loop -> finaliza; no hay tareas pendientes.

1.4 MODULOS

- archivo con scope propio

tipos:

CORE -> fs, path, http, os, events, crypto. -> require('node:fs')

LOCAL MODULES -> archivos .js propios -> require('./utils/maths.js')

THIRD-PARTY MODULES -> paquetes de npm -> npm install (paquete) -> require('paquete')

1.5 gestor de paquetes

npm init -y -> crea un package.json donde se cargan los paquetes, dependencias, nombre y scripts.

npm install express -> agrega express a las dependencias y descarga el codigo de node_modules/.

npm install -D nodemon -> agrega una dependencia de desarrollo.

package-lock.json -> fija las versiones exactas instaladas -> garantiza que todos los integrantes del equipo instalen lo mismo.

node_modules/ -> va al .gitignore

1.6 Objetos globales que usar -> revisar tabla

1.7 Servidor http nativo

- un servidor es un programa que escucha peticiones en un puerto y devuelve respuestas, se crea con el modulo http.

http + port -> request -> response

1.9 Cómo construir la lógica de un programa en Node
Entrada: ¿de dónde vienen los datos? (process.argv, un archivo, una petición HTTP).

Validación: ¿los datos son del tipo y formato esperado? Si no, cortar con un mensaje claro.

Procesamiento: funciones puras y pequeñas, separadas en módulos locales (fáciles de testear).

Salida: consola, archivo o respuesta HTTP con su código de estado.
Asincronía: toda I/O (archivos, red, base de datos) es asíncrona → pensar en qué pasa mientras espero.

crear http -> crear servidor ->
