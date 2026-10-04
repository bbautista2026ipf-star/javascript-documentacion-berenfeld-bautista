# Módulo 02 — ES Modules: `import` y `export`

> Requisito de los trabajos prácticos: *"El proyecto debe configurarse con `"type": "module"` en `package.json`. Todos los archivos deben usar la sintaxis `import`/`export`."*

---

## 1. Conceptos principales

### 1.1 Qué es ES Modules

**ES Modules (ESM)** es el **sistema de módulos estándar de JavaScript** (desde ES6). Define cómo un archivo **comparte** código (`export`) y cómo otro archivo lo **usa** (`import`). Es el mismo sistema en el navegador (`<script type="module">`) y en Node.js.

Características:
- Los `import` se escriben al **inicio** del archivo.
- En los módulos locales, la ruta lleva **siempre la extensión** `.js`.
- Cada archivo tiene su propio ámbito: lo que no se exporta queda **privado** a ese archivo.

> ES Modules **no es una carpeta ni una capa** del proyecto: es la **forma en que todos los archivos se conectan** entre sí. `app.js`, las rutas, los controladores, los modelos y los middlewares usan `import`/`export`.

### 1.2 Activar ES Modules

Node necesita que el `package.json` lo indique con `"type": "module"`:

```json
{
  "name": "practica-express",
  "type": "module",
  "scripts": {
    "dev": "node --watch app.js"
  }
}
```

- `npm init -y` puede crear el `package.json` con otro valor en `"type"`: hay que cambiarlo a `"module"`.
- Sin `"type": "module"`, Node no reconoce bien `import`/`export` y muestra un error o una advertencia.

### 1.3 Exportaciones nombradas y por defecto

**Export nombrado (named export):** se pueden tener varios por archivo; al importar se usan **llaves** y el **nombre exacto**.

```js
// src/data/personajes.js
export const personajes = [
  { id: 1, nombre: 'A-Bomb' },
  { id: 2, nombre: 'Abe Sapien' },
];
```

```js
// src/controllers/personajes.controllers.js
export const getAll = (req, res) => { /* ... */ };
export const getById = (req, res) => { /* ... */ };
```

```js
import { personajes } from '../data/personajes.js';
import { getAll, getById } from '../controllers/personajes.controllers.js';
```

**Export por defecto (default export):** uno solo por archivo; al importar **no** se usan llaves y el nombre es libre.

```js
// src/utils/formatear.js
const formatear = (texto) => texto.trim().toUpperCase();
export default formatear;

// app.js
import formatear from './src/utils/formatear.js';
```

| | Nombrado | Por defecto |
|---|---|---|
| Cantidad por archivo | Varios. | Uno. |
| Llaves al importar | **Sí**: `{ personajes }` | **No**: `formatear` |
| Nombre al importar | Debe coincidir. | Libre. |
| Uso en los TP | Lo más común: controladores, rutas, modelos, middlewares, helpers. | Paquetes externos como `express`. |

Se pueden combinar en una misma línea y renombrar con `as`:

```js
import express, { Router } from 'express';
import { getAll as obtenerTodos } from './controllers/personajes.controllers.js';
```

### 1.4 Los tres tipos de import

```js
import fs from 'node:fs';                                 // módulo integrado de Node
import express from 'express';                            // paquete externo (node_modules)
import { personajes } from './src/data/personajes.js';    // módulo local: ./ y extensión .js
```

### 1.5 `dotenv` en ES Modules

En ESM, `dotenv` se carga con un import especial, que por convención se escribe en las **primeras líneas** de `app.js`:

```js
import 'dotenv/config';

const PORT = process.env.PORT || 3000;
```

Este import no trae ninguna variable: solo **ejecuta** el archivo de `dotenv`, que carga el `.env` en `process.env`.

> Todos los `import` de un archivo se resuelven y ejecutan **antes** que el resto de su código, sin importar en qué línea estén. Igual se escriben arriba de todo, para que se lea claro de qué depende el archivo.

### 1.6 Cómo leer un `import`

| Import | Qué trae | De dónde |
|---|---|---|
| `import express from 'express';` | El export **por defecto** de Express, en la variable `express`. | Paquete externo (`node_modules`). |
| `import { Router } from 'express';` | El export **nombrado** `Router`. | Paquete externo. |
| `import { body, param } from 'express-validator';` | Dos exports nombrados. | Paquete externo. |
| `import os from 'node:os';` | El módulo integrado `os`. | Node.js. |
| `import { UserModel } from '../models/index.js';` | El export nombrado `UserModel`. | Archivo local, una carpeta arriba (`../`). |
| `import 'dotenv/config';` | Nada: solo ejecuta el archivo. | Paquete externo. |

| Export | Cómo se importa |
|---|---|
| `export const sumar = ...` | `import { sumar } from './math.js'` |
| `export const sumar = ...` y `export const restar = ...` | `import { sumar, restar } from './math.js'` |
| `export default app` | `import app from './app.js'` (cualquier nombre) |

### 1.7 Errores comunes

| Error | Causa | Solución |
|---|---|---|
| `SyntaxError: Cannot use import statement outside a module` | Falta `"type": "module"`. | Agregarlo al `package.json`. |
| `ReferenceError: x is not defined` | Se usó una variable que nunca se importó. | Agregar el `import` correspondiente. |
| `Error [ERR_MODULE_NOT_FOUND]` en una ruta local | Falta la extensión `.js`, o la ruta está mal (`./` en lugar de `../`). | `import x from '../carpeta/x.js'`. |
| `SyntaxError: The requested module does not provide an export named 'x'` | Se importó con llaves algo que es default, o el nombre no coincide. | Revisar cómo se exportó. |
| `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'dotenv'` | El paquete no está instalado. | `npm install dotenv`. |
| `process.env.PORT` es `undefined` | Falta `import 'dotenv/config'` o el `.env` no está en la raíz del proyecto. | Agregar el import y revisar la ubicación del `.env`. |
| Aviso `[MODULE_TYPELESS_PACKAGE_JSON] Warning` | Falta `"type"` en el `package.json`: Node adivina el sistema de módulos. | Agregar `"type": "module"`. |

### 1.8 Dónde vas a usar esto en los trabajos prácticos

En **todos los archivos**. Cada carpeta exporta y la capa siguiente importa:

```
app.js  ──import──▶  routes  ──import──▶  controllers  ──import──▶  data / models
```

---

## 2. Ejercicio fácil — "Exports nombrados y por defecto"

**Qué vas a practicar:** repartir funciones en archivos y conectarlas con exports **nombrados**, un export **por defecto** y un alias con `as`.

**En el proyecto real:** los controladores, modelos y middlewares del TP se exportan con exports nombrados (`export const createUser = ...`) y se importan con llaves en las rutas.

### Consigna

Tenés estas funciones **sueltas**, sin `export` ni `import`. Repartilas en archivos y conectalas.

```js
const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
const contarPalabras = (texto) => texto.trim().split(' ').filter((p) => p !== '').length;

function formatearNombre(nombre, apellido) {
  return `${capitalizar(apellido)}, ${capitalizar(nombre)}`;
}
```

### Requisitos

1. Proyecto con `npm init -y` y `"type": "module"` en el `package.json`.
2. **`textos.js`**: `capitalizar` y `contarPalabras` con **exports nombrados**.
3. **`formateador.js`**: `formatearNombre` con **export por defecto**. Necesita `capitalizar`: importala desde `textos.js`.
4. **`app.js`**:
   - Importá `formatearNombre` (export por defecto).
   - Importá `contarPalabras` con el alias `contar` (`import { contarPalabras as contar } ...`) y usalo con ese nombre.
   - Mostrá con `console.log` el resultado de `formatearNombre('aDa', 'LOVELACE')` y de `contar('  hola   mundo node  ')`.
5. Todas las rutas locales con extensión `.js`.

### Cómo probarlo

`node app.js` debe mostrar:

```
Lovelace, Ada
3
```

Y `test.js`. En cada línea, el valor **obtenido** tiene que coincidir con el **esperado**:

```js
import formatearNombre from './formateador.js';
import { capitalizar, contarPalabras } from './textos.js';

console.log(`capitalizar('jAVASCRIPT') → esperado: Javascript | obtenido: ${capitalizar('jAVASCRIPT')}`);
console.log(`contarPalabras(' a  b ') → esperado: 2 | obtenido: ${contarPalabras(' a  b ')}`);
console.log(`formatearNombre('alan', 'turing') → esperado: Turing, Alan | obtenido: ${formatearNombre('alan', 'turing')}`);
```

---

## 3. Ejercicio medio — "Datos y funciones en carpetas"

**Qué vas a practicar:** organizar un proyecto en carpetas conectadas con `import`/`export`, usando los tres tipos de import.

**En el proyecto real:** es la misma estructura de la Práctica de Express: un archivo `src/data/` que **exporta un arreglo** y otros archivos que lo **importan**.

### Consigna

```
catalogo/
├── .env
├── .gitignore
├── package.json          → "type": "module"
├── app.js
└── src/
    ├── data/
    │   └── productos.js
    └── services/
        └── productos.service.js
```

1. **`src/data/productos.js`**: exportá (export nombrado) un arreglo `productos` con 5 objetos `{ id, nombre, precio, categoria }`.
2. **`src/services/productos.service.js`**: importá `productos` y exportá estas funciones (exports nombrados):
   - `obtenerTodos()` → devuelve el arreglo.
   - `obtenerPorId(id)` → devuelve el producto o `undefined`.
   - `obtenerPorCategoria(categoria)` → devuelve un arreglo filtrado.
3. **`.env`**: `PORT=3000` y `APP_NAME=Catálogo`. Agregá `.env` y `node_modules/` al `.gitignore`.
4. **`app.js`**:
   - `import 'dotenv/config'` (paquete externo).
   - `import os from 'node:os'` (módulo integrado).
   - Importá las funciones del service (módulo local).
   - Mostrá el nombre de la app, el sistema operativo, la cantidad de productos y el producto con id `2`.

### Cómo probarlo

`node app.js` muestra los datos sin errores. Luego creá `test.js` y compará cada valor obtenido con el esperado:

```js
import { productos } from './src/data/productos.js';
import { obtenerTodos, obtenerPorId, obtenerPorCategoria } from './src/services/productos.service.js';

console.log(`obtenerTodos().length → esperado: ${productos.length} | obtenido: ${obtenerTodos().length}`);
console.log(`obtenerPorId(2).id → esperado: 2 | obtenido: ${obtenerPorId(2).id}`);
console.log(`obtenerPorId(999) → esperado: undefined | obtenido: ${obtenerPorId(999)}`);
console.log(`¿obtenerPorCategoria devuelve un array? → esperado: true | obtenido: ${Array.isArray(obtenerPorCategoria('cualquiera'))}`);
```

---

## 4. Ejercicio difícil — "Encontrá y corregí los errores"

**Qué vas a practicar:** reconocer los errores típicos de ES Modules leyendo el mensaje de la terminal.

**En el proyecto real:** son los errores que más vas a ver al armar el TP. Saber identificarlos por su mensaje te ahorra horas.

### Consigna

Copiá este proyecto tal cual. Tiene **6 problemas** (5 errores que detienen la ejecución y 1 advertencia). Ejecutá `npm start`, leé el mensaje, corregí y volvé a ejecutar hasta que funcione sin errores ni advertencias. Por cada problema, anotá en `ERRORES.md`: **el mensaje que apareció**, **la causa** y **cómo lo corregiste**.

```json
// package.json
{
  "name": "tienda",
  "scripts": { "start": "node app.js" }
}
```

```env
# .env
PORT=4000
DESCUENTO=10
```

```js
// src/data/clientes.js
const clientes = [
  { id: 1, nombre: 'Ana', compras: 1200 },
  { id: 2, nombre: 'Beto', compras: 300 },
];
export default clientes;
```

```js
// src/utils/descuentos.js
export const aplicarDescuento = (monto, porcentaje) => monto - (monto * porcentaje) / 100;
```

```js
// src/services/clientes.service.js
import { clientes } from '../data/clientes.js';
import { aplicarDescuento } from '../utils/descuentos';

export const totalConDescuento = (porcentaje) =>
  clientes.map((c) => ({ nombre: c.nombre, total: aplicarDescuento(c.compras, porcentaje) }));
```

```js
// app.js
import 'dotenv/config';
import totalConDescuento from './src/services/clientes.service.js';

const descuento = Number(process.env.DESCUENTO);

console.log(`Puerto: ${process.env.PORT} - Sistema: ${os.platform()}`);
console.table(totalConDescuento(descuento));
```

### Pistas

- Corregí **un problema por vez**: el siguiente mensaje recién aparece cuando arreglás el anterior.
- Pensá en: la configuración del `package.json`, un paquete que nunca se instaló, una extensión faltante, un módulo integrado que se usa pero nunca se importó, y default vs nombrado (en **dos** lugares).

### Cómo probarlo

Con los 6 problemas corregidos, `npm start` debe mostrar (sin ninguna advertencia arriba):

```
Puerto: 4000 - Sistema: win32
┌─────────┬────────┬───────┐
│ (index) │ nombre │ total │
├─────────┼────────┼───────┤
│ 0       │ 'Ana'  │ 1080  │
│ 1       │ 'Beto' │ 270   │
└─────────┴────────┴───────┘
```
