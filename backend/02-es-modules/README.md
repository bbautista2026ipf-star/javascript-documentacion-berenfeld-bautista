# Módulo 02 — ES Modules: `import` y `export`

> Requisito de los trabajos prácticos: *"El proyecto debe configurarse con `"type": "module"` en `package.json`. Todos los archivos deben usar la sintaxis `import`/`export`. Está prohibido el uso de `require` o `module.exports`."*

---

## 1. Conceptos principales

### 1.1 Dos sistemas de módulos

Un **sistema de módulos** define cómo un archivo **comparte** código (export) y cómo otro lo **usa** (import). En Node conviven dos:

| | **CommonJS** (módulo 01) | **ES Modules** (este módulo) |
|---|---|---|
| Origen | Creado por Node. | **Estándar oficial** de JavaScript (ES6). |
| Exportar | `module.exports = { ... }` | `export` |
| Importar | `const x = require('./x')` | `import x from './x.js'` |
| Extensión en rutas locales | Opcional. | **Obligatoria** (`.js`). |
| Dónde se escriben los imports | En cualquier línea. | Al **inicio** del archivo. |
| Funciona en el navegador | No. | Sí. |

**ES Modules (ESM)** es el estándar del lenguaje: el mismo sistema funciona en el navegador y en el servidor. Por eso los trabajos prácticos lo exigen.

> ES Modules **no es una carpeta ni una capa** del proyecto: es la **forma en que todos los archivos se conectan** entre sí. `app.js`, las rutas, los controladores, los modelos y los middlewares usan `import`/`export`.

### 1.2 Activar ES Modules

Node decide cómo leer los `.js` según el `package.json`:

```json
{
  "name": "practica-express",
  "type": "module",
  "scripts": {
    "dev": "node --watch app.js"
  }
}
```

- Con `"type": "module"` → los archivos usan `import`/`export`.
- Sin `"type"` o con `"type": "commonjs"` → los archivos usan `require`.

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

### 1.6 Equivalencias CommonJS → ESM

| CommonJS | ES Modules |
|---|---|
| `const express = require('express');` | `import express from 'express';` |
| `const { Router } = require('express');` | `import { Router } from 'express';` |
| `const { sumar } = require('./math');` | `import { sumar } from './math.js';` |
| `module.exports = { sumar, restar };` | `export const sumar = ...` / `export const restar = ...` |
| `module.exports = app;` | `export default app;` |
| `require('dotenv').config();` | `import 'dotenv/config';` |

### 1.7 Errores comunes

| Error | Causa | Solución |
|---|---|---|
| `SyntaxError: Cannot use import statement outside a module` | Falta `"type": "module"`. | Agregarlo al `package.json`. |
| `ReferenceError: require is not defined in ES module scope` | Se mezcló `require` con ESM. | Reemplazar por `import`. |
| `Error [ERR_MODULE_NOT_FOUND]` en una ruta local | Falta la extensión `.js`. | `import x from './x.js'`. |
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

## 2. Ejercicio fácil — "Migración a ES Modules"

**Qué vas a practicar:** convertir código CommonJS a ESM, exports nombrados y por defecto.

**En el proyecto real:** muchos ejemplos de internet están escritos con `require`. Tenés que saber traducirlos, porque en los TP está prohibido.

### Consigna

Este proyecto está en CommonJS. Migralo a ES Modules **sin cambiar el resultado**.

```js
// textos.js
const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
const contarPalabras = (texto) => texto.trim().split(' ').filter((p) => p !== '').length;
module.exports = { capitalizar, contarPalabras };
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
const { contarPalabras } = require('./textos');
console.log(formatearNombre('aDa', 'LOVELACE'));
console.log(contarPalabras('  hola   mundo node  '));
```

### Requisitos

1. `"type": "module"` en el `package.json`.
2. `textos.js` con **exports nombrados**.
3. `formateador.js` con **export por defecto**.
4. Todas las rutas locales con extensión `.js`.
5. Ni un solo `require` ni `module.exports`.

### Cómo probarlo

`node app.js` debe mostrar:

```
Lovelace, Ada
3
```

Y `test.js` (sin salida = todo correcto):

```js
import formatearNombre from './formateador.js';
import { capitalizar, contarPalabras } from './textos.js';

console.assert(capitalizar('jAVASCRIPT') === 'Javascript', 'capitalizar falló');
console.assert(contarPalabras(' a  b ') === 2, 'contarPalabras falló');
console.assert(formatearNombre('alan', 'turing') === 'Turing, Alan', 'formatearNombre falló');
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

`node app.js` muestra los datos sin errores. Luego creá `test.js`:

```js
import { productos } from './src/data/productos.js';
import { obtenerTodos, obtenerPorId, obtenerPorCategoria } from './src/services/productos.service.js';

console.assert(obtenerTodos().length === productos.length, 'obtenerTodos falló');
console.assert(obtenerPorId(2).id === 2, 'obtenerPorId falló');
console.assert(obtenerPorId(999) === undefined, 'obtenerPorId con id inexistente falló');
console.assert(Array.isArray(obtenerPorCategoria('cualquiera')), 'obtenerPorCategoria debe devolver un array');
console.log('Tests finalizados');
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
const os = require('node:os');

const descuento = Number(process.env.DESCUENTO);

console.log(`Puerto: ${process.env.PORT} - Sistema: ${os.platform()}`);
console.table(totalConDescuento(descuento));
```

### Pistas

- Corregí **un problema por vez**: el siguiente mensaje recién aparece cuando arreglás el anterior.
- Pensá en: la configuración del `package.json`, un paquete que nunca se instaló, una extensión faltante, un `require`, y default vs nombrado (en **dos** lugares).

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
