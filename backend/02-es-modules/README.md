# Módulo 02 — ES Modules: el sistema de módulos estándar de JavaScript

---

## 1. Conceptos principales

### 1.1 Dos sistemas de módulos, un mismo objetivo

Un **sistema de módulos** define cómo un archivo **expone** (export) y **consume** (import) código de otro. Node convive con dos:

| Característica | **CommonJS (CJS)** | **ES Modules (ESM)** |
|---|---|---|
| Origen | Creado por Node (2009). | Estándar oficial de ECMAScript (ES6 / 2015). |
| Sintaxis | `require()` / `module.exports` | `import` / `export` |
| Carga | **Síncrona**, en tiempo de ejecución. | **Asíncrona**, analizada **antes** de ejecutar (estática). |
| Dónde se puede importar | En cualquier línea, incluso dentro de un `if`. | Solo en el nivel superior del archivo (salvo `import()` dinámico). |
| Extensión en rutas locales | Opcional (`./math`). | **Obligatoria** (`./math.js`). |
| `__dirname` / `__filename` | Disponibles. | **No existen**; se usa `import.meta`. |
| `await` en el nivel superior | No. | Sí (**top-level await**). |
| Modo estricto | Opcional. | Siempre activo (`'use strict'` implícito). |
| Navegador | No lo entiende. | Lo entiende de forma nativa (`<script type="module">`). |

**Por qué ESM:** es el estándar del lenguaje. El mismo código de módulos funciona en el navegador y en el servidor, permite **análisis estático** (los editores y bundlers saben qué se exporta sin ejecutar nada) y habilita el **tree shaking** (eliminar código no utilizado). Desde este módulo en adelante, **todo el curso usa ESM exclusivamente**.

### 1.2 Activar ES Modules en Node

Node decide cómo interpretar un `.js` mirando el `package.json` más cercano:

```json
{
  "name": "mi-proyecto",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/app.js"
  }
}
```

- `"type": "module"` → los `.js` se interpretan como ESM.
- Sin `"type"` (o `"type": "commonjs"`) → los `.js` son CommonJS.
- Las extensiones `.mjs` (siempre ESM) y `.cjs` (siempre CJS) fuerzan el sistema sin importar el `package.json`.

### 1.3 Exportaciones nombradas vs por defecto

```js
// math.js
export const sumar = (a, b) => a + b;          // export nombrado
export const restar = (a, b) => a - b;         // export nombrado
const calcular = (op, a, b) => op(a, b);
export default calcular;                        // export por defecto (uno solo por archivo)
```

```js
// app.js
import calcular, { sumar, restar } from './math.js';
import { sumar as add } from './math.js';      // renombrar (alias)
import * as math from './math.js';             // namespace: math.sumar, math.default
```

| | **Named export** | **Default export** |
|---|---|---|
| Cantidad por archivo | Ilimitados. | Uno solo. |
| Nombre al importar | Debe coincidir exactamente (o usar `as`). | Libre. |
| Llaves al importar | Sí: `{ sumar }`. | No: `calcular`. |
| Uso recomendado | Utilidades, controladores, validaciones. | El "objeto principal" del archivo (ej: la instancia de `sequelize`, el `router`). |

### 1.4 Rutas de importación

```js
import fs from 'node:fs/promises';           // Core Module (prefijo node:)
import express from 'express';               // Paquete de node_modules
import { sumar } from './utils/math.js';     // Módulo local: ./ o ../ y extensión .js
```

### 1.5 `import.meta`, `__dirname` y rutas absolutas

En ESM no existe `__dirname`. Se reconstruye con `import.meta.url` (la URL del archivo actual):

```js
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rutaDatos = path.join(__dirname, 'data', 'notas.json');
```

En versiones recientes de Node (20.11+) también existen `import.meta.dirname` e `import.meta.filename`.

> Por qué importa: `fs.readFile('./data/notas.json')` resuelve la ruta **desde donde ejecutás el comando**, no desde donde está el archivo. Con `__dirname` la ruta es siempre correcta.

### 1.6 Top-level await

En ESM se puede usar `await` fuera de una función `async`, en el nivel superior del módulo:

```js
import fs from 'node:fs/promises';

const config = JSON.parse(await fs.readFile('./config.json', 'utf-8'));
console.log(config);
```

Los módulos que importan a este **esperan** a que termine de evaluarse. Útil para inicializaciones (leer configuración, conectar a la base de datos).

### 1.7 Live bindings y singleton

- Lo que se importa es una **referencia viva (live binding)** de solo lectura: si el módulo exportador cambia el valor, el importador ve el cambio, pero el importador **no puede reasignarlo**.
- Cada módulo se evalúa **una sola vez** y queda en caché. Todas las importaciones reciben la **misma instancia**. Esto es lo que permite crear una única conexión a la base de datos y compartirla en todo el proyecto (patrón **singleton**).

### 1.8 Variables de entorno con `dotenv`

Los datos sensibles o que cambian según el entorno (puerto, credenciales de la base de datos, claves secretas) **nunca** se escriben en el código. Se guardan en un archivo `.env`:

```env
PORT=3000
DB_NAME=curso
```

```js
import 'dotenv/config';   // carga .env en process.env (debe ir lo antes posible)

const PORT = process.env.PORT ?? 3000;
```

- `.env` **va en `.gitignore`**. Se sube un `.env.example` con las claves pero sin valores reales.
- Todo valor de `process.env` es **string**: `Number(process.env.PORT)`.

### 1.9 Organización en capas y barrel files

Con módulos se separan **responsabilidades** (*Separation of Concerns*):

```
src/
├── config/        → configuración (variables de entorno, conexiones)
├── services/      → lógica de negocio (reglas, cálculos)
├── data/          → acceso a datos (leer/escribir archivos, luego base de datos)
├── utils/         → funciones auxiliares reutilizables
│   └── index.js   → barrel file
└── app.js         → punto de entrada
```

Un **barrel file** (`index.js`) re-exporta varios módulos desde un único punto:

```js
// utils/index.js
export { formatearFecha } from './fechas.js';
export { capitalizar, slugify } from './textos.js';

// app.js
import { formatearFecha, capitalizar } from './utils/index.js';
```

**Dependencia circular:** ocurre cuando `a.js` importa `b.js` y `b.js` importa `a.js`. Uno de los dos recibe valores **todavía no inicializados** (`ReferenceError: Cannot access 'x' before initialization`). Se evita respetando la **dirección de las capas**: `app → services → data`, nunca al revés.

### 1.10 Errores comunes

| Error | Causa | Solución |
|---|---|---|
| `SyntaxError: Cannot use import statement outside a module` | Falta `"type": "module"` en `package.json`. | Agregarlo. |
| `ReferenceError: require is not defined in ES module scope` | Usar `require` en un proyecto ESM. | Reemplazar por `import`. |
| `Error [ERR_MODULE_NOT_FOUND]` con ruta local | Falta la extensión `.js`. | `import x from './x.js'`. |
| `SyntaxError: The requested module does not provide an export named 'x'` | Importar con llaves algo que es `default`, o un nombre mal escrito. | Revisar si es named o default. |
| `ReferenceError: __dirname is not defined` | ESM no define `__dirname`. | `fileURLToPath(import.meta.url)`. |
| `process.env.PORT` es `undefined` | No se cargó `dotenv` o se cargó **después** de leer la variable. | `import 'dotenv/config'` como primera línea del punto de entrada. |
| `TypeError: Assignment to constant variable` sobre algo importado | Los imports son de solo lectura. | Exportar una función que modifique el valor. |

### 1.11 Cómo pensar la lógica modular

1. Identificar **responsabilidades** (¿quién lee datos?, ¿quién decide reglas?, ¿quién muestra resultados?).
2. Un archivo = una responsabilidad. Si un archivo hace dos cosas, se divide.
3. Exportar solo lo que otro módulo necesita: el resto queda **privado** al módulo.
4. Las dependencias fluyen en **una sola dirección**.

---

## 2. Ejercicio fácil — "Migración a ES Modules"

**Qué vas a practicar:** convertir código CommonJS a ESM, exports nombrados y por defecto.

### Consigna

Tenés este proyecto en CommonJS. Migralo a ES Modules **sin cambiar el comportamiento**.

```js
// textos.js
const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
const contarPalabras = (texto) => texto.trim().split(/\s+/).filter(Boolean).length;
const invertir = (texto) => texto.split('').reverse().join('');
module.exports = { capitalizar, contarPalabras, invertir };
```

```js
// formateador.js
const { capitalizar } = require('./textos');
function formatearNombre(nombre, apellido) {
  return `${capitalizar(apellido)}, ${capitalizar(nombre)}`;
}
module.exports = formatearNombre;
```

```js
// app.js
const formatearNombre = require('./formateador');
const { contarPalabras, invertir } = require('./textos');
console.log(formatearNombre('aDa', 'LOVELACE'));
console.log(contarPalabras('  hola   mundo node  '));
console.log(invertir('node'));
```

### Requisitos

1. Agregá `"type": "module"` al `package.json`.
2. `textos.js` usa **exports nombrados**.
3. `formateador.js` usa **export por defecto**.
4. Todas las rutas locales llevan extensión `.js`.
5. En `app.js` importá `invertir` con el alias `reverse` y usalo con ese nombre.

### Cómo probarlo

Ejecutá `node app.js`. Salida esperada:

```
Lovelace, Ada
3
edon
```

Luego creá `test.js` (sin salida = todo correcto):

```js
import formatearNombre from './formateador.js';
import { capitalizar, contarPalabras, invertir } from './textos.js';

console.assert(capitalizar('jAVASCRIPT') === 'Javascript', 'capitalizar falló');
console.assert(contarPalabras('') === 0, 'contarPalabras con texto vacío falló');
console.assert(contarPalabras(' a  b ') === 2, 'contarPalabras con espacios falló');
console.assert(invertir('abc') === 'cba', 'invertir falló');
console.assert(formatearNombre('alan', 'turing') === 'Turing, Alan', 'formatearNombre falló');
```

---

## 3. Ejercicio medio — "Catálogo de productos con capas y `.env`"

**Qué vas a practicar:** estructura en carpetas, barrel files, `import.meta`, top-level await y variables de entorno.

### Consigna

Armá este proyecto ESM:

```
catalogo/
├── .env
├── .env.example
├── .gitignore
├── package.json
└── src/
    ├── config/
    │   └── env.js
    ├── data/
    │   ├── productos.json
    │   └── productosRepository.js
    ├── services/
    │   └── productosService.js
    ├── utils/
    │   ├── index.js
    │   ├── moneda.js
    │   └── textos.js
    └── app.js
```

1. **`.env`**: `IVA=0.21` y `MONEDA=ARS`. Creá también `.env.example` con las claves vacías y agregá `.env` y `node_modules` al `.gitignore`.
2. **`config/env.js`**: carga `dotenv` y exporta un objeto `env` con `iva` (convertido a **número**) y `moneda`. Si `IVA` no es un número válido, lanzá un `Error` con un mensaje claro.
3. **`data/productos.json`**: al menos 5 productos `{ id, nombre, precio, categoria, stock }`.
4. **`data/productosRepository.js`**: exporta `obtenerTodos()` que lee el JSON con `fs/promises`, usando una ruta construida con `import.meta.url` (debe funcionar ejecutando el comando desde **cualquier** carpeta).
5. **`utils/`**: `moneda.js` exporta `formatearPrecio(numero, moneda)` → `"ARS 1210.00"`; `textos.js` exporta `capitalizar`. `index.js` es un barrel que re-exporta ambos.
6. **`services/productosService.js`** exporta:
   - `listarConIva()`: productos con un campo nuevo `precioFinal` (precio + IVA, redondeado a 2 decimales).
   - `buscarPorCategoria(categoria)`: sin distinguir mayúsculas/minúsculas.
   - `sinStock()`: productos con `stock === 0`.
7. **`app.js`**: usando **top-level await**, muestra en consola el listado con precio final formateado y la cantidad de productos sin stock.

### Reglas

- La dirección de importación es `app → services → data` y `services → utils`. **`data` no importa nada de `services`.**
- Ningún valor del `.env` puede aparecer escrito en el código.

### Cómo probarlo

1. Desde la carpeta `catalogo/`: `node src/app.js` → muestra el listado.
2. Desde la carpeta **padre**: `node catalogo/src/app.js` → **debe funcionar igual** (si falla con `ENOENT`, la ruta no está construida con `import.meta.url`).
3. Cambiá `IVA=0.105` en el `.env` → los precios finales cambian sin tocar código.
4. Cambiá `IVA=abc` → el programa termina con tu mensaje de error claro.
5. Creá `test.js` en la raíz:

```js
import { formatearPrecio, capitalizar } from './src/utils/index.js';
import { listarConIva, buscarPorCategoria } from './src/services/productosService.js';

console.assert(formatearPrecio(1210, 'ARS') === 'ARS 1210.00', 'formatearPrecio falló');
console.assert(capitalizar('teclado') === 'Teclado', 'capitalizar falló');

const productos = await listarConIva();
console.assert(productos.every((p) => 'precioFinal' in p), 'falta precioFinal');

const categoria = productos[0].categoria;
const filtrados = await buscarPorCategoria(categoria.toUpperCase());
console.assert(filtrados.length > 0, 'la búsqueda debe ignorar mayúsculas');

console.log('Tests finalizados');
```

---

## 4. Ejercicio difícil — "Refactor del servidor nativo a arquitectura modular ESM"

**Qué vas a practicar:** refactorizar código real, separar responsabilidades, evitar dependencias circulares y diseñar un "mini router" propio.

### Punto de partida

El `server.js` del **ejercicio difícil del módulo 01** (API de notas con `http` nativo). Si no lo terminaste, completalo primero.

### Consigna

Reescribí el proyecto en ESM con esta arquitectura:

```
api-notas/
├── .env                      → PORT, DATA_FILE
├── package.json              → "type": "module"
└── src/
    ├── config/env.js         → exporta la configuración ya validada
    ├── data/notasRepository.js   → único módulo que toca el archivo JSON
    ├── services/notasService.js  → reglas de negocio (validar título, generar id)
    ├── controllers/notasController.js → recibe req/res, llama al service, responde
    ├── http/
    │   ├── response.js       → enviarJSON(res, status, data)
    │   ├── body.js           → leerBody(req)
    │   └── router.js         → mini router propio
    ├── routes/notasRoutes.js → registra las rutas de notas en el router
    └── server.js             → crea el servidor y lo pone a escuchar
```

### El mini router

`http/router.js` debe exportar una función `crearRouter()` que devuelva un objeto con:

- `get(ruta, handler)`, `post(ruta, handler)`, `delete(ruta, handler)`: registran rutas.
- Soporte de **parámetros dinámicos**: registrar `'/notas/:id'` y que al pedir `/notas/7` el handler reciba `req.params = { id: '7' }`.
- `manejar(req, res)`: busca la ruta que coincide con `req.method` y `req.url`; si no encuentra ninguna, responde `404`.

```js
// Así se debería poder usar:
const router = crearRouter();
router.get('/notas/:id', obtenerPorId);
// ...
http.createServer((req, res) => router.manejar(req, res));
```

### Requisitos

1. Mismo contrato de la API del módulo 01 (mismos métodos, rutas, status y bodies) + `PUT /notas/:id`.
2. Los **controllers** no leen archivos; los **services** no conocen `req` ni `res`; el **repository** no valida reglas de negocio.
3. Los services lanzan errores con información de status. Por ejemplo, creá una clase:
   ```js
   export class HttpError extends Error {
     constructor(status, message) {
       super(message);
       this.status = status;
     }
   }
   ```
   y en un único lugar (`router.manejar`) atrapá los errores: si es `HttpError` respondés con su `status`, si no, `500`.
4. Ruta del archivo de datos y puerto desde `.env` (`DATA_FILE=data/notas.json`), resueltos con `import.meta.url`.
5. **Cero** dependencias circulares. Dibujá en un comentario al inicio de `server.js` el grafo de importaciones (ej: `server → routes → controllers → services → data`).

### Pistas

- Para comparar rutas con parámetros, dividí ambas por `/` y compará segmento por segmento: si el segmento registrado empieza con `:`, es un parámetro y acepta cualquier valor.
- Ignorá el *query string*: `new URL(req.url, 'http://localhost').pathname` te da solo la ruta.

### Cómo probarlo

Repetí la **tabla de 10 pruebas** del ejercicio difícil del módulo 01 (deben dar exactamente los mismos resultados) y agregá:

| # | Petición | Status esperado |
|---|---|---|
| 11 | `PUT /notas/2` body `{"titulo":"Título editado"}` | `200` + nota actualizada |
| 12 | `PUT /notas/2` body `{"titulo":""}` | `400` |
| 13 | `PUT /notas/999` body `{"titulo":"Algo válido"}` | `404` |
| 14 | `GET /notas?orden=desc` | `200` (el query string no rompe el router) |
| 15 | `GET /notas/1/extra` | `404` |

Test unitario del router (`test-router.js`), **sin levantar el servidor**:

```js
import { crearRouter } from './src/http/router.js';

const router = crearRouter();
let recibido = null;
router.get('/items/:id', (req) => { recibido = req.params; });

const resFalso = { writeHead() {}, end() {} };
await router.manejar({ method: 'GET', url: '/items/42' }, resFalso);

console.assert(recibido?.id === '42', 'el router no extrajo el parámetro id');
console.log('Test del router finalizado');
```

**Criterio de aprobación:** las 15 pruebas pasan, el test del router pasa y cada capa respeta su responsabilidad.
