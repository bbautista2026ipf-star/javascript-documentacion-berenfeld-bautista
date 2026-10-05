/* =====================================================================
   CALCULADORA WEB: Node (http) + HTML + CSS + Bootstrap
   =====================================================================

   ¿QUÉ CAMBIÓ RESPECTO A LA VERSIÓN DE TERMINAL?
   - Terminal: los datos entran UNA vez al arrancar (process.argv),
     el programa calcula, imprime y TERMINA.
   - Servidor: arranca SIN datos y queda VIVO escuchando un puerto.
     Los datos llegan DESPUÉS, en cada petición, dentro de la URL.
     Por eso acá ya no usamos process.argv.

   RUTAS QUE ATIENDE ESTE SERVIDOR (dos trabajos distintos):
     GET /                     -> envía index.html (la página)
     GET /style.css            -> envía la hoja de estilos
     GET /api/sumar?a=5&b=3    -> responde JSON { "resultado": 8 }

   RECORRIDO COMPLETO:
     1. El navegador pide "/"                 -> recibe index.html
     2. El usuario completa el form y "Calcular"
     3. El JS del navegador hace fetch("/api/<operacion>?a=..&b=..")
     4. El servidor responde 200 { resultado } o 4xx { error }
     5. El JS pinta un alert verde (res.ok) o rojo (error)

   ¿IF O TRY/CATCH? -> se usan los dos, atrapan cosas distintas:
   | Herramienta | Qué atrapa                         | Código |
   |-------------|------------------------------------|--------|
   | if          | Errores ESPERADOS (input del user) | 400/404|
   | try/catch   | EXCEPCIONES (algo hizo throw)      | 400/500|
   OJO: Number("hola") NO lanza error, devuelve NaN.
   Un try/catch no lo atraparía, así que eso se valida con if.

   CÓMO EJECUTAR:
     npm start      -> node app.js
     npm run dev    -> nodemon (reinicia al guardar), agregar en package.json:
                       "dev": "nodemon app.js"
     Abrir http://localhost:3000  |  Cortar con Ctrl + C

   CONSIGNAS PENDIENTES (para completar):
     [ ] 1. Crear index.html en esta carpeta con Bootstrap por CDN:
            form, 2 input type="number", select con las 4 operaciones,
            botón "Calcular" y un <div id="resultado">.
     [ ] 2. Crear style.css y enlazarlo con <link href="/style.css">.
     [ ] 3. En index.html, un <script> que:
            - escuche el submit del form (event.preventDefault())
            - haga fetch(`/api/${operacion}?a=${a}&b=${b}`)
            - lea la respuesta con await respuesta.json()
            - use respuesta.ok para elegir alert-success o alert-danger
     [ ] 4. En operaciones.js, hacer que dividir LANCE un error:
              if (b === 0) throw new Error("No se puede dividir por cero");
            y actualizar el console.assert de test.js que espera null.
   ===================================================================== */

import http from "node:http"; // módulo core: crea el servidor (antes usabas require, que NO existe con "type": "module")
import { readFile } from "node:fs/promises"; // módulo core: lee archivos del disco (index.html, style.css)
import { sumar, restar, multiplicar, dividir } from "./operaciones.js";

const PORT = 3000;

// Menú de operaciones: elige la función POR NOMBRE sin escribir ningún if.
// menu["sumar"] -> la función sumar
const menu = { sumar, restar, multiplicar, dividir };

// Helper: responde JSON con un código de estado.
// Evita repetir setHeader + stringify en cada respuesta.
const enviarJSON = (res, status, datos) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(datos));
};

// Helper: lee un archivo y lo envía.
// readFile LANZA una excepción si el archivo no existe -> acá SÍ va try/catch (500 = culpa del servidor).
const enviarArchivo = async (res, ruta, tipo) => {
  try {
    const contenido = await readFile(new URL(ruta, import.meta.url)); // ruta relativa a ESTE archivo, no a la terminal
    res.statusCode = 200;
    res.setHeader("Content-Type", `${tipo}; charset=utf-8`);
    res.end(contenido);
  } catch (error) {
    res.statusCode = 500;
    res.end(`No se pudo leer ${ruta}: ${error.message}`);
  }
};

// createServer recibe un CALLBACK. Node lo ejecuta UNA VEZ POR CADA PETICIÓN
// y le pasa: req (lo que pidió el cliente) y res (donde escribimos la respuesta).
// Las llaves { } son el CUERPO de la función: las instrucciones de cada visita.
const server = http.createServer(async (req, res) => {
  // req.url trae solo "/api/sumar?a=5&b=3" (incompleta).
  // new URL() necesita una base para armar la dirección completa y luego la DESCOMPONE.
  // Desestructuramos solo lo que usamos:
  //   pathname     -> "/api/sumar"
  //   searchParams -> objeto con .get() y .has() para leer a y b
  const { pathname, searchParams } = new URL(req.url, `http://${req.headers.host}`);

  // ---------- RUTAS DE ARCHIVOS (el frontend) ----------
  if (pathname === "/") return enviarArchivo(res, "./index.html", "text/html");
  if (pathname === "/style.css") return enviarArchivo(res, "./style.css", "text/css");

  // ---------- RUTA DE LA API ----------
  if (pathname.startsWith("/api/")) {
    const operacion = pathname.slice(5); // "/api/sumar" -> "sumar" (quita los 5 caracteres de "/api/")

    // IF: error esperado -> la operación no existe en el menú.
    // El return CORTA la función: sin él, seguiría bajando e intentaría responder
    // dos veces (ERR_STREAM_WRITE_AFTER_END).
    if (!menu[operacion]) {
      return enviarJSON(res, 404, { error: `Operación "${operacion}" no existe` });
    }

    // IF: faltan parámetros. Se chequea con has() ANTES de convertir porque
    // Number(null) devuelve 0 (no NaN) y un parámetro ausente pasaría como cero.
    if (!searchParams.has("a") || !searchParams.has("b")) {
      return enviarJSON(res, 400, { error: "Faltan los parámetros a y b" });
    }

    // Todo lo que viene en la URL es STRING -> hay que convertirlo.
    const a = Number(searchParams.get("a"));
    const b = Number(searchParams.get("b"));

    // IF: no son números válidos.
    if (Number.isNaN(a) || Number.isNaN(b)) {
      return enviarJSON(res, 400, { error: "a y b deben ser números" });
    }

    // TRY/CATCH: protege la ejecución de la operación.
    // Cuando completes la consigna 4 (dividir con throw), este catch
    // atrapará "No se puede dividir por cero" y responderá 400.
    try {
      const resultado = menu[operacion](a, b);
      return enviarJSON(res, 200, { operacion, a, b, resultado });
    } catch (error) {
      return enviarJSON(res, 400, { error: error.message });
    }
  }

  // ---------- NINGUNA RUTA COINCIDIÓ ----------
  enviarJSON(res, 404, { error: `Ruta ${pathname} no encontrada` });
});

// Sin listen() el servidor existe pero NO escucha nada.
// listen reserva el puerto y deja el proceso VIVO: el Event Loop tiene
// trabajo pendiente (esperar conexiones), por eso no termina como la versión de terminal.
server.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
