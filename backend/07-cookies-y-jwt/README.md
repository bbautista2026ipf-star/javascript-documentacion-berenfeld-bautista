# Módulo 07 — Cookies, sesiones y JWT: autenticación real

---

## 1. Conceptos principales

### 1.1 El problema: HTTP no tiene memoria

HTTP es un protocolo **sin estado (stateless)**: cada petición es independiente y el servidor **no recuerda** las anteriores. Después de un login exitoso (módulo 06), la siguiente petición llega sin ningún dato de quién es el usuario. En el módulo 06 lo "resolvimos" con un header `x-user-id` que cualquiera puede falsificar.

Hace falta un mecanismo para que, tras autenticarse **una vez**, el cliente pueda **demostrar su identidad** en cada petición sin reenviar la contraseña. Existen dos enfoques:

| | **Sesiones (stateful)** | **JWT (stateless)** |
|---|---|---|
| Dónde vive el estado | En el **servidor** (memoria, Redis, BD). | En el **token**, que guarda el cliente. |
| Qué recibe el cliente | Un **ID de sesión** opaco (aleatorio, sin datos). | Un **token firmado** con datos (claims). |
| Verificación | Buscar el ID en el almacén de sesiones. | Verificar la **firma** criptográfica (sin consultar nada). |
| Cerrar sesión / revocar | Inmediato: se borra la sesión del servidor. | Difícil: el token es válido hasta que **expira**. |
| Escalabilidad | Requiere almacén compartido entre servidores. | Cualquier servidor con la clave puede verificar. |
| Librería típica en Express | `express-session` | `jsonwebtoken` |

En el curso usamos **JWT transportado en una cookie `httpOnly`**, que combina la verificación sin estado del JWT con la protección del almacenamiento en cookie.

### 1.2 Cookies

Una **cookie** es un dato pequeño (≈4 KB) que el **servidor** le pide guardar al **navegador** mediante el header `Set-Cookie`. El navegador la **reenvía automáticamente** en cada petición posterior al mismo dominio (header `Cookie`).

```mermaid
sequenceDiagram
    participant N as Navegador
    participant S as Servidor
    N->>S: POST /api/auth/login (email, password)
    S->>S: Verifica credenciales (bcrypt)
    S->>S: Genera JWT firmado
    S-->>N: 200 + Set-Cookie: token=eyJ...; HttpOnly
    N->>S: GET /api/profile (Cookie: token=eyJ...)
    S->>S: authMiddleware verifica firma y expiración
    S-->>N: 200 + datos del usuario
    N->>S: POST /api/auth/logout
    S-->>N: 200 + Set-Cookie: token=; Expires=pasado
```

**Atributos de seguridad:**

| Atributo | Qué hace | Protege contra |
|---|---|---|
| `httpOnly: true` | JavaScript del navegador **no puede leerla** (`document.cookie` no la muestra). | **XSS**: un script inyectado no puede robar el token. |
| `secure: true` | Solo se envía por **HTTPS**. | Intercepción en redes inseguras. (`false` en desarrollo local con HTTP) |
| `sameSite: 'strict' \| 'lax' \| 'none'` | Controla si se envía en peticiones originadas en **otros sitios**. | **CSRF** (falsificación de peticiones). |
| `maxAge` / `expires` | Tiempo de vida (ms) / fecha de expiración. | Sesiones eternas. |
| `path` / `domain` | En qué rutas / dominios es válida. | Envío innecesario. |

### 1.3 JWT (JSON Web Token)

**JWT** (RFC 7519) es un estándar para transmitir información entre partes como un objeto JSON **firmado digitalmente**. Tiene tres partes en **Base64URL** separadas por puntos:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 . eyJpZCI6Mywicm9sZSI6InVzZXIiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDAwMzYwMH0 . 4fXk...firma
└───────────── HEADER ──────────────┘   └──────────────────────────── PAYLOAD ────────────────────────────────────┘   └ SIGNATURE ┘
```

| Parte | Contenido |
|---|---|
| **Header** | Algoritmo de firma y tipo: `{ "alg": "HS256", "typ": "JWT" }`. |
| **Payload** | Los **claims** (datos): los tuyos (`id`, `role`) y los registrados (`iat` = emitido en, `exp` = expira en). |
| **Signature** | `HMAC-SHA256(header + "." + payload, JWT_SECRET)`. |

**La distinción más importante del módulo:**

> El payload está **codificado**, **NO cifrado**. Cualquiera puede leerlo (pegá un token en jwt.io). La **firma** no oculta los datos: garantiza que **nadie los modificó**. Si alguien cambia `"role":"user"` por `"role":"admin"`, la firma deja de coincidir y `jwt.verify` lo rechaza.

Consecuencias:
- **Nunca** poner en el payload contraseñas, hashes ni datos sensibles. Solo lo mínimo para identificar y autorizar: `id`, `role`, quizás `username`.
- La seguridad depende de que `JWT_SECRET` sea **largo, aleatorio y secreto** (en `.env`, nunca en el código ni en Git).

### 1.4 Implementación en Express

```bash
npm install jsonwebtoken cookie-parser cors bcryptjs
```

```env
JWT_SECRET=una_clave_larga_y_aleatoria_que_nadie_conoce
JWT_EXPIRES_IN=1h
```

**Helpers JWT:**

```js
// src/helpers/jwt.helper.js
import jwt from 'jsonwebtoken';

export const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);
```

| Función | Qué hace | Si falla |
|---|---|---|
| `jwt.sign(payload, secret, options)` | Crea y **firma** el token. | — |
| `jwt.verify(token, secret)` | Verifica **firma y expiración**; devuelve el payload. | Lanza `JsonWebTokenError` (firma inválida / malformado) o `TokenExpiredError`. |
| `jwt.decode(token)` | Lee el payload **sin verificar**. | **Nunca** usarlo para autenticar. |

**Configuración del servidor:**

```js
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();
app.use(express.json());
app.use(cookieParser());                 // crea req.cookies
app.use(cors({
  origin: 'http://localhost:5173',       // origen exacto del frontend (NO '*')
  credentials: true,                     // permite enviar/recibir cookies
}));
```

**Login:**

```js
export const login = async (req, res) => {
  try {
    const { email, password } = matchedData(req);
    const user = await UserModel.scope('withPassword').findOne({ where: { email } });

    if (!user || !(await comparePassword(password, user.password))) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = generateToken({ id: user.id, role: user.role });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60, // 1 hora, coherente con expiresIn
    });

    return res.status(200).json({ message: 'Login exitoso' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};
```

**Middleware de autenticación:**

```js
export const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: 'No autenticado' });
  }
  try {
    req.user = verifyToken(token);   // { id, role, iat, exp }
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};
```

> Un token inválido o expirado es un problema de **autenticación** → `401`, no `500`. El `500` se reserva para fallas inesperadas del servidor.

**Rutas protegidas, perfil y logout:**

```js
authRoutes.post('/auth/login', loginValidations, validator, login);
authRoutes.get('/auth/profile', authMiddleware, profile);
authRoutes.post('/auth/logout', authMiddleware, logout);

export const logout = (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
  return res.status(200).json({ message: 'Logout exitoso' });
};
```

`clearCookie` debe recibir las **mismas opciones** (`path`, `domain`, `sameSite`, `secure`) con que se creó la cookie; si no, el navegador la considera otra cookie y no la borra.

### 1.5 Autorización con el token

El `req.user` que antes cargaba el header simulado ahora lo carga `authMiddleware` desde el token verificado. Los middlewares de autorización del módulo 06 (`requireRole`, `requireOwnershipOr`) **no cambian**:

```js
router.delete('/posts/:id', authMiddleware, idValidations, validator, requireOwnershipOr(PostModel, 'admin'), deletePost);
```

**Tensión JWT vs datos actuales:** el token guarda el `role` **del momento del login**. Si un admin le quita el rol a alguien, el token viejo sigue diciendo `admin` hasta que expire. Soluciones: expiración corta, o que `authMiddleware` consulte el usuario en la base de datos en cada petición (pierde parte de la ventaja stateless, pero permite detectar usuarios eliminados o con rol modificado).

### 1.6 Frontend: `fetch` con cookies

Por defecto, `fetch` **no envía ni guarda** cookies entre orígenes distintos. Hay que indicarlo explícitamente:

```js
const API_URL = 'http://localhost:3000/api';

export const login = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',            // CRUCIAL: recibir y guardar la cookie
    body: JSON.stringify({ email, password }),
  });
  return response.json();
};

export const getProfile = async () => {
  const response = await fetch(`${API_URL}/auth/profile`, { credentials: 'include' });
  if (response.status === 401) throw new Error('Sesión expirada');
  return response.json();
};
```

Las **dos puntas** deben coincidir: `credentials: 'include'` en el cliente **y** `cors({ origin: '<origen exacto>', credentials: true })` en el servidor. Con `origin: '*'` el navegador **rechaza** las credenciales.

### 1.7 Errores comunes

| Error | Causa | Solución |
|---|---|---|
| `req.cookies` es `undefined` | Falta `app.use(cookieParser())`. | Registrarlo antes de las rutas. |
| `secretOrPrivateKey must have a value` | `JWT_SECRET` no está cargado. | `import 'dotenv/config'` al inicio + variable en `.env`. |
| El navegador no guarda la cookie | Falta `credentials: 'include'` en `fetch` o `credentials: true` en `cors`. | Configurar ambos extremos. |
| Error CORS con credenciales | `origin: '*'` con `credentials: true`. | Origen explícito. |
| La cookie no se guarda en `http://localhost` | `secure: true` sin HTTPS. | `secure: false` en desarrollo. |
| El logout "no funciona" | `clearCookie` con opciones distintas a las de creación. | Mismas opciones. |
| Token expirado responde `500` | No se distingue el error de JWT. | `try/catch` en el middleware → `401`. |
| Se usó `jwt.decode` para autenticar | `decode` no verifica la firma. | Siempre `jwt.verify`. |
| Datos sensibles en el payload | Confundir codificación con cifrado. | Solo `id` y `role`. |
| Se confía en `req.body.user_id` para la propiedad | El cliente puede enviar cualquier id. | La identidad sale **solo** de `req.user` (token verificado). |

### 1.8 Cómo pensar el flujo de autenticación

1. **Registro:** validar → hashear → guardar. (No genera sesión necesariamente.)
2. **Login:** validar → buscar → comparar hash → firmar token con datos mínimos → cookie `httpOnly`.
3. **Cada petición protegida:** cookie → `verify` → `req.user` → autorización → controlador.
4. **Identidad = `req.user`.** Nunca un id que venga del body, params o headers controlados por el cliente.
5. **Logout:** borrar la cookie (con las mismas opciones).
6. **Expiración:** coherente entre `expiresIn` (token) y `maxAge` (cookie).

---

## 2. Ejercicio fácil — "Laboratorio de tokens"

**Qué vas a practicar:** firmar, decodificar y verificar JWT, entender qué protege la firma y qué no, y la expiración. **Sin servidor:** un script de pruebas.

### Consigna

1. Proyecto ESM con `jsonwebtoken` y `dotenv`. En `.env`: `JWT_SECRET` con al menos 32 caracteres.
2. Creá `src/helpers/jwt.helper.js` con:
   - `generateToken(payload, expiresIn = '1h')`.
   - `verifyToken(token)`: devuelve el payload o lanza el error de `jsonwebtoken`.
   - `readPayload(token)`: devuelve el payload **sin verificar**, decodificando a mano la segunda parte del token con `Buffer.from(parte, 'base64url').toString()` y `JSON.parse` (sin usar `jwt.decode`).
3. Creá `src/lab.js` que demuestre y verifique con `console.assert`:

```js
import 'dotenv/config';
import { generateToken, verifyToken, readPayload } from './helpers/jwt.helper.js';

// 1. Un token tiene 3 partes
const token = generateToken({ id: 7, role: 'user' });
console.assert(token.split('.').length === 3, 'El token debe tener 3 partes');

// 2. El payload se puede LEER sin la clave (no está cifrado)
const leido = readPayload(token);
console.assert(leido.role === 'user', 'readPayload debe leer el rol sin la clave');
console.assert(typeof leido.exp === 'number', 'El token debe tener exp');

// 3. verifyToken devuelve el payload si el token es válido
console.assert(verifyToken(token).id === 7, 'verifyToken debe devolver el id');

// 4. Un token MANIPULADO es rechazado
// TODO: construí un token falso: mismo header, payload con role 'admin' codificado
// en base64url, y la firma original. verifyToken debe lanzar JsonWebTokenError.

// 5. Un token firmado con OTRA clave es rechazado
// TODO

// 6. Un token expirado es rechazado
// TODO: generá un token con expiresIn '1s', esperá 1.5 segundos y verificá
// que verifyToken lance un error con name === 'TokenExpiredError'.

console.log('Laboratorio finalizado');
```

4. Completá los `TODO` 4, 5 y 6.
5. Al final de `lab.js`, escribí en un comentario **con tus palabras**: ¿por qué el punto 2 demuestra que nunca hay que poner la contraseña en el payload? ¿qué demuestra el punto 4 sobre la firma?

### Pistas

- Para el punto 4: `const [header, , signature] = token.split('.');` y `Buffer.from(JSON.stringify({...})).toString('base64url')`.
- Para esperar: `await new Promise((r) => setTimeout(r, 1500));` (top-level await en ESM).

### Cómo probarlo

`node src/lab.js` → solo debe imprimirse `Laboratorio finalizado`. Cualquier `Assertion failed` indica un punto incompleto.

---

## 3. Ejercicio medio — "Autenticación completa con cookie"

**Qué vas a practicar:** login con JWT en cookie `httpOnly`, middleware de autenticación, ruta protegida, logout, y probarlo como lo haría un navegador.

### Punto de partida

El **ejercicio medio del módulo 06** (registro y login con bcrypt).

### Consigna

1. Instalá `jsonwebtoken` y `cookie-parser`. Agregá `JWT_SECRET` y `JWT_EXPIRES_IN=1h` al `.env` (y las claves vacías a `.env.example`).
2. Creá `src/helpers/jwt.helper.js` y `src/middlewares/auth.middleware.js`.
3. Modificá `POST /api/auth/login`: además de verificar las credenciales, genera el token con `{ id, role }` y lo envía en una cookie `token` (`httpOnly`, `sameSite: 'strict'`, `maxAge` de 1 hora). El body de la respuesta **no** incluye el token.
4. Nuevas rutas:

| Método | Ruta | Protección | Respuesta |
|---|---|---|---|
| `GET` | `/api/auth/profile` | `authMiddleware` | `200` con los datos del usuario **consultados en la BD** a partir de `req.user.id` (sin hash). Si el usuario fue eliminado: `401`. |
| `POST` | `/api/auth/logout` | `authMiddleware` | `200` + borra la cookie. |
| `PUT` | `/api/auth/profile` | `authMiddleware` | Edita **el propio** perfil (`full_name`, `email`, opcionales). El id sale de `req.user`, **no** de la URL. |
| `PUT` | `/api/auth/password` | `authMiddleware` | Recibe `currentPassword` y `newPassword`. Verifica la actual con bcrypt (`400` si no coincide), valida que la nueva tenga 8+ caracteres y sea **distinta** de la actual. Al cambiarla, **cierra la sesión** (borra la cookie). |

5. Protegé `DELETE /api/users/:id` y `GET /api/users` con `authMiddleware` + `requireRole('admin')` (reutilizá el middleware del módulo 06).
6. `authMiddleware` debe responder `401` diferenciando: sin token → `No autenticado`; token inválido → `Token inválido`; token expirado → `Sesión expirada`.

### Cómo probarlo

Con `curl` y un archivo de cookies (simula al navegador): `-c` guarda las cookies recibidas, `-b` las envía.

```bash
# Login: guarda la cookie en cookies.txt
curl -i -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" -d "{\"email\":\"ada@mail.com\",\"password\":\"Clave1234\"}"

# Perfil: envía la cookie
curl -i -b cookies.txt http://localhost:3000/api/auth/profile
```

| # | Petición | Status | Verificar |
|---|---|---|---|
| 1 | `GET /api/auth/profile` sin cookie | `401` | `No autenticado` |
| 2 | `POST /login` correcto | `200` | Header `Set-Cookie` con `HttpOnly`; el body **no** tiene token |
| 3 | `GET /api/auth/profile` con cookie | `200` | Sin `password` |
| 4 | Editá a mano un carácter del token en `cookies.txt` y repetí #3 | `401` | `Token inválido` |
| 5 | Con `JWT_EXPIRES_IN=10s`, login, esperar 11 s, perfil | `401` | `Sesión expirada` |
| 6 | `GET /api/users` con cookie de un `user` | `403` | |
| 7 | `GET /api/users` con cookie de un `admin` | `200` | |
| 8 | `PUT /api/auth/password` con `currentPassword` incorrecta | `400` | |
| 9 | `PUT /api/auth/password` correcto | `200` | La respuesta trae `Set-Cookie` que expira la cookie |
| 10 | `POST /api/auth/logout` y luego perfil | `200` / `401` | |
| 11 | Admin elimina al usuario X; X (con su cookie aún válida) pide su perfil | `401` | |

---

## 4. Ejercicio difícil — "Blog seguro: del header simulado al JWT + cliente web"

**Qué vas a practicar:** reemplazar la identificación simulada por JWT sin romper la autorización, diseñar una arquitectura donde las piezas son intercambiables, configurar CORS con credenciales y consumir la API desde un frontend HTML/CSS/JS.

### Punto de partida

El **ejercicio difícil del módulo 06** (blog con roles, propiedad y moderación).

### Consigna — Backend

1. Agregá `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout` y `GET /api/auth/me`.
2. **Reemplazá `identifyUser` por `authMiddleware`** (JWT en cookie). Objetivo de diseño: `requireRole` y `requireOwnershipOr` **no se modifican ni una línea**. Si tenés que tocarlos, tu diseño del módulo 06 estaba acoplado: refactorizalo y anotá por qué en un comentario.
3. `authMiddleware` consulta al usuario en la base de datos para usar su `role` **actual** (no el del token) y rechazar usuarios eliminados.
4. **Rutas públicas con usuario opcional:** `GET /api/posts` es público, pero si hay una sesión válida, cada post incluye `canEdit: true/false` y `canDelete: true/false` según la matriz de permisos del módulo 06. Creá un middleware `optionalAuth` que cargue `req.user` si hay un token válido y, si no, **siga sin error**.
5. **Limitación de intentos de login:** después de **5 intentos fallidos** para un mismo email en 15 minutos, responder `429 Too Many Requests` hasta que pase el tiempo (implementación en memoria con un `Map`; no hace falta librería).
6. CORS: `origin` desde `process.env.CLIENT_URL`, `credentials: true`.
7. **Ningún** controlador usa `req.body.user_id` ni un id de usuario de la URL para decidir la autoría: el autor de un post o comentario nuevo es siempre `req.user.id`.

### Consigna — Frontend (`client/`)

Una página simple (`index.html`, `style.css`, `app.js` como módulo ES) servida con Live Server. Abrila en **`http://localhost:5500`** (no en `127.0.0.1`) y usá ese mismo valor en `CLIENT_URL`.

> Por qué `localhost` y no `127.0.0.1`: para `sameSite`, `localhost:5500` y `localhost:3000` son el **mismo sitio** (el puerto no cuenta), así que la cookie `strict` viaja. `127.0.0.1` y `localhost` son sitios **distintos**: la cookie no se enviaría. (Para CORS, en cambio, el puerto **sí** cuenta: por eso igual hace falta configurar `cors`.)

1. **Formulario de login** y botón de **logout**. Al iniciar sesión, mostrar `Hola, <username> (<role>)` usando `GET /api/auth/me`.
2. **Listado de posts** con autor y comentarios. Los botones **Editar** y **Eliminar** solo se muestran si `canEdit` / `canDelete` son `true`.
3. **Formulario para crear post** (solo visible con sesión).
4. Mostrar los mensajes de error de la API (validación `400`, `401`, `403`, `429`) en un área visible, no solo en la consola.
5. Todas las peticiones con `credentials: 'include'`, centralizadas en una función `apiFetch(path, options)`.

### Cómo probarlo

**Backend** (con `curl -c/-b`): repetí la tabla de 16 pruebas del módulo 06, reemplazando el header `x-user-id` por la cookie de cada usuario. Los resultados deben ser **idénticos**. Además:

| # | Prueba | Resultado esperado |
|---|---|---|
| 17 | `GET /api/posts` sin cookie | `200`, sin `canEdit`/`canDelete` (o en `false`) |
| 18 | `GET /api/posts` con cookie de beto | `canEdit: true` solo en posts de beto |
| 19 | `GET /api/posts` con cookie de moderator | `canDelete: true` en todos |
| 20 | `POST /api/posts` con body `{ "title": "...", "body": "...", "user_id": 1 }` usando la cookie de beto | `201`, el autor es **beto** |
| 21 | 6 logins fallidos seguidos con el mismo email | Los primeros 5 → `401`, el 6.º → `429` |
| 22 | Admin cambia el rol de beto a `moderator`; beto (misma cookie) elimina un post ajeno | `200` (se usa el rol actual de la BD) |

**Frontend** (en el navegador):

| # | Prueba | Resultado esperado |
|---|---|---|
| 23 | Login y luego, en la consola del navegador, `document.cookie` | **No** aparece `token` (`httpOnly`) |
| 24 | DevTools → Application → Cookies | Aparece `token` con `HttpOnly` ✓ |
| 25 | Recargar la página con sesión iniciada | Sigue logueado (la cookie persiste) |
| 26 | Logout | Desaparecen los botones protegidos y el formulario de creación |
| 27 | Cambiar `CLIENT_URL` en el `.env` a otro puerto y reiniciar | El login falla por **CORS** (y entendés por qué) |

**Criterio de aprobación:** las 27 pruebas pasan y los middlewares de autorización del módulo 06 no fueron modificados (o el refactor está justificado).
