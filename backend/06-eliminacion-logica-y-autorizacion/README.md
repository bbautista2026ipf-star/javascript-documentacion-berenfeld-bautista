# Módulo 06 — Eliminación lógica, actualizaciones, autenticación y autorización

---

## 1. Conceptos principales

### 1.1 Eliminación física vs eliminación lógica

| | **Eliminación física (hard delete)** | **Eliminación lógica (soft delete)** |
|---|---|---|
| Qué ocurre | `DELETE FROM ...`: la fila **desaparece**. | `UPDATE ... SET deletedAt = NOW()`: la fila **queda**, marcada como eliminada. |
| Recuperable | No. | Sí (**restauración**). |
| Historial / auditoría | Se pierde. | Se conserva. |
| Integridad referencial | Puede dejar registros huérfanos o requerir cascadas. | Las relaciones siguen apuntando a una fila existente. |
| Casos de uso | Datos temporales, sin valor histórico. | Usuarios, ventas, préstamos, todo lo que tenga valor de auditoría o legal. |

### 1.2 `paranoid` en Sequelize

Sequelize automatiza la eliminación lógica con la opción **`paranoid`**:

```js
export const NoteModel = sequelize.define(
  'Note',
  { title: { type: DataTypes.STRING, allowNull: false } },
  {
    tableName: 'notes',
    timestamps: true,   // obligatorio: paranoid depende de los timestamps
    paranoid: true,     // agrega la columna deletedAt
  }
);
```

Con `paranoid: true`, el comportamiento de los métodos cambia **de forma transparente**:

| Operación | Sin `paranoid` | Con `paranoid` |
|---|---|---|
| `instancia.destroy()` / `Model.destroy({ where })` | Borra la fila. | Setea `deletedAt` con la fecha actual. |
| `findAll`, `findByPk`, `findOne`, `count` | Devuelven todo. | **Excluyen** automáticamente las filas con `deletedAt` distinto de `null`. |
| `findAll({ paranoid: false })` | — | Incluye también las eliminadas. |
| `instancia.restore()` / `Model.restore({ where })` | — | Vuelve `deletedAt` a `null`. |
| `destroy({ force: true })` | — | Eliminación **física** real. |

```js
import { Op } from 'sequelize';

// Papelera: solo las eliminadas
const deleted = await NoteModel.findAll({
  where: { deletedAt: { [Op.ne]: null } },
  paranoid: false,
});

// Restaurar
const note = await NoteModel.findByPk(id, { paranoid: false });
if (note?.deletedAt) await note.restore();
```

**Consideraciones importantes:**
- **Unicidad:** un `unique` en la base de datos **sigue aplicando** a las filas eliminadas lógicamente. Si se elimina el usuario `ada@mail.com` y otro intenta registrarse con ese email, la base de datos lo rechaza. Hay que decidir la regla de negocio (¿restaurar la cuenta?, ¿bloquear el email?) y que la validación `custom` de unicidad use `paranoid: false` para detectarlo.
- **Cascada:** `onDelete: 'CASCADE'` es una regla **de la base de datos** y solo actúa ante un `DELETE` real. Un soft delete es un `UPDATE`, así que **no se propaga** a los registros relacionados: hay que eliminarlos lógicamente a mano (idealmente dentro de una **transacción**).
- **Includes:** los registros relacionados con `paranoid` también se excluyen en los `include`, salvo que se indique `paranoid: false` en ese include.

### 1.3 Actualizaciones: PUT vs PATCH

| | **PUT** | **PATCH** |
|---|---|---|
| Semántica REST | **Reemplazo** del recurso. | Modificación **parcial**. |
| Campos | En teoría, todos. | Solo los que cambian. |
| En la práctica del curso | Se usa `PUT` con campos **opcionales** (actualización parcial). | Equivalente. |

Lo importante es la **lógica de validación**, distinta a la de creación:

| | Creación (`POST`) | Actualización (`PUT`/`PATCH`) |
|---|---|---|
| Campos | Obligatorios (`notEmpty`). | **Opcionales** (`optional()`): se validan solo si vienen. |
| Unicidad | El valor no debe existir. | El valor no debe existir **en otro registro** (`id` distinto). |
| Existencia | — | El recurso a editar **debe existir**. |
| Datos al modelo | `matchedData(req)` | `matchedData(req, { locations: ['body'] })` → solo lo enviado y validado. |

```js
export const updateUserValidations = [
  param('id').isInt({ min: 1 }).bail().custom(userExists),
  body('email')
    .optional()
    .isEmail().withMessage('Email inválido').bail()
    .custom(async (email, { req }) => {
      const user = await UserModel.findOne({
        where: { email, id: { [Op.ne]: req.params.id } },
      });
      if (user) throw new Error('El email ya está en uso');
      return true;
    }),
  body('name').optional().isLength({ min: 2 }).withMessage('Mínimo 2 caracteres'),
];

export const updateUser = async (req, res) => {
  try {
    const data = matchedData(req, { locations: ['body'] });
    const user = await UserModel.findByPk(req.params.id);
    await user.update(data);
    return res.status(200).json({ message: 'Usuario actualizado', data: user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};
```

> `matchedData` **solo incluye** los campos opcionales que el cliente efectivamente envió. Si se pasara `req.body`, el cliente podría modificar cualquier columna (`role`, `deletedAt`, `id`).

### 1.4 Autenticación vs autorización

| | **Autenticación (Authentication)** | **Autorización (Authorization)** |
|---|---|---|
| Pregunta | **¿Quién sos?** | **¿Qué podés hacer?** |
| Momento | Primero. | Después (requiere saber quién es). |
| Mecanismo | Credenciales (usuario + contraseña), tokens, biometría, 2FA. | Roles, permisos, propiedad del recurso. |
| Falla → status | `401 Unauthorized` | `403 Forbidden` |

Dos modelos de autorización frecuentes:
- **Por rol (RBAC):** el `admin` puede eliminar cualquier publicación; el `user`, no.
- **Por propiedad (ownership):** un usuario puede editar **sus** publicaciones, no las de otros.

### 1.5 Almacenamiento seguro de contraseñas: hash, cifrado y codificación

**Nunca** se guardan contraseñas en texto plano: si la base de datos se filtra, se filtran todas las contraseñas (y la gente las reutiliza en otros sitios).

| | **Hash** | **Cifrado (encriptación)** | **Codificación** |
|---|---|---|---|
| Dirección | **Unidireccional**: no se puede revertir. | Bidireccional, con **clave**. | Bidireccional, **sin clave**. |
| Objetivo | Verificar sin conocer el original. | Proteger datos que se necesita recuperar. | Transformar formato para transmitir/almacenar. |
| Seguridad | Alta (con algoritmo adecuado). | Depende de la clave. | **Ninguna**. |
| Ejemplos | bcrypt, Argon2, SHA-256 | AES, RSA | Base64, UTF-8, URL encoding |
| Uso para contraseñas | **Sí** | No | **Jamás** |

**bcrypt** es un algoritmo de hash diseñado para contraseñas:
- Incluye **salt** automáticamente (un valor aleatorio por contraseña): dos usuarios con la misma contraseña tienen hashes distintos → inutiliza las **rainbow tables**.
- Es **lento a propósito**: dificulta los ataques de **fuerza bruta**.
- El **costo** (`saltRounds`) es ajustable: entre 10 y 12 es el equilibrio recomendado.

`bcrypt` (nativo en C++, más rápido, requiere compilación) y `bcryptjs` (JavaScript puro, más portable) tienen la misma API. En el curso usamos `bcryptjs`.

```bash
npm install bcryptjs
```

```js
// src/helpers/bcrypt.helper.js
import bcrypt from 'bcryptjs';

export const hashPassword = async (password) => bcrypt.hash(password, 10);
export const comparePassword = async (password, hashed) => bcrypt.compare(password, hashed);
```

**Registro:** validar → `hashPassword` → guardar **el hash**.
**Login:** buscar por `username`/`email` (**nunca** por contraseña) → `comparePassword` → si falla, `401` con un mensaje **genérico** (`Credenciales inválidas`): no revelar si lo que falló fue el usuario o la contraseña (evita la **enumeración de usuarios**).

**No exponer el hash** en las respuestas:

```js
export const UserModel = sequelize.define('User', { /* ... */ }, {
  defaultScope: { attributes: { exclude: ['password'] } },
  scopes: { withPassword: { attributes: { include: ['password'] } } },
});

// En el login, que sí necesita el hash:
const user = await UserModel.scope('withPassword').findOne({ where: { email } });
```

### 1.6 Middlewares de autorización

La autorización se implementa como **middlewares** que se ubican entre la validación y el controlador:

```js
// Por rol: función que GENERA un middleware (closure)
export const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'No tiene permisos para esta acción' });
  }
  next();
};

// Uso
router.delete('/posts/:id', identifyUser, requireRole('admin'), deletePost);
```

`req.user` lo debe cargar un middleware previo de **identificación**. En este módulo lo vamos a **simular** con un header; en el **módulo 07** lo reemplazaremos por un **JWT en una cookie**, que es la forma segura.

> ⚠️ **Simulación didáctica:** identificar al usuario con un header `x-user-id` es **inseguro** (cualquiera puede escribir cualquier id). Se usa aquí solo para practicar la lógica de autorización de forma aislada.

### 1.7 Errores comunes

| Error | Causa | Solución |
|---|---|---|
| `destroy()` borra físicamente | Falta `paranoid: true` o `timestamps: false`. | Activar ambos. |
| No aparece la columna `deletedAt` | La tabla ya existía antes de activar `paranoid`. | `sync({ alter: true })` en desarrollo o recrear la tabla. |
| `restore()` lanza error / `findByPk` devuelve `null` | Se buscó el registro eliminado sin `paranoid: false`. | `findByPk(id, { paranoid: false })`. |
| Se elimina un usuario pero sus tareas siguen visibles | El soft delete no dispara `CASCADE`. | Eliminar lógicamente los relacionados a mano. |
| Registro con email de un usuario eliminado da `500` | La restricción `unique` de la BD ve la fila eliminada. | Validación `custom` con `paranoid: false`. |
| El `PUT` sobrescribe campos con `undefined`/`null` | Se pasó `req.body` completo o se armó el objeto a mano. | `matchedData(req, { locations: ['body'] })`. |
| El login compara `password === user.password` | Comparar texto plano contra el hash. | `bcrypt.compare`. |
| Las respuestas incluyen `password` | No se excluyó el atributo. | `defaultScope` o `attributes: { exclude }`. |
| Se responde `401` cuando el usuario no tiene permiso | Confusión autenticación/autorización. | `401` = no sé quién sos; `403` = sé quién sos, pero no podés. |

### 1.8 Cómo pensar la lógica de permisos

1. Escribir una **matriz de permisos** antes de programar: filas = acciones, columnas = roles / dueño.
2. Ordenar los middlewares de la ruta: **identificar → validar → autorizar → controlador**.
3. Reglas por **rol** → middleware genérico (`requireRole`).
4. Reglas por **propiedad** → necesitan el recurso: middleware que lo busca y compara `resource.user_id === req.user.id` (y deja pasar al admin).
5. Preguntarse por cada acción destructiva: ¿física o lógica?, ¿qué pasa con los registros relacionados?, ¿se puede restaurar?, ¿quién puede restaurar?

---

## 2. Ejercicio fácil — "Notas con papelera de reciclaje"

**Qué vas a practicar:** `paranoid`, `destroy`, `restore`, consultas con `paranoid: false` y eliminación definitiva.

### Consigna

Proyecto Express + Sequelize (estructura de carpetas habitual) con el modelo `Note`:

| Campo | Tipo |
|---|---|
| `title` | `STRING(100)`, obligatorio |
| `content` | `TEXT` |

Con `timestamps: true` y `paranoid: true`.

| Método | Ruta | Comportamiento |
|---|---|---|
| `POST` | `/api/notes` | Crea una nota → `201`. |
| `GET` | `/api/notes` | Lista solo las notas **activas** → `200`. |
| `DELETE` | `/api/notes/:id` | Eliminación **lógica** → `200` `{ "message": "Nota enviada a la papelera" }`. `404` si no existe (o ya estaba eliminada). |
| `GET` | `/api/notes/trash` | Lista solo las notas **eliminadas**, mostrando `id`, `title` y `deletedAt` → `200`. |
| `PATCH` | `/api/notes/:id/restore` | Restaura → `200`. `404` si no existe; `400` si la nota **no está** eliminada. |
| `DELETE` | `/api/notes/:id/permanent` | Elimina **físicamente** una nota que **ya esté** en la papelera → `200`. `400` si la nota está activa (primero hay que mandarla a la papelera). |

Validá los `:id` con express-validator (entero positivo).

### Pistas

- Declarar `/notes/trash` **antes** que `/notes/:id` (si no, `trash` se interpreta como id).
- Para distinguir "no existe" de "no está eliminada": `findByPk(id, { paranoid: false })` y revisar `note.deletedAt`.

### Cómo probarlo

| # | Petición | Status | Verificar |
|---|---|---|---|
| 1 | Crear 3 notas | `201` | |
| 2 | `DELETE /api/notes/1` | `200` | |
| 3 | `GET /api/notes` | `200` | Solo 2 notas |
| 4 | `GET /api/notes/trash` | `200` | La nota 1 con `deletedAt` |
| 5 | `DELETE /api/notes/1` (otra vez) | `404` | |
| 6 | `PATCH /api/notes/2/restore` | `400` | No está eliminada |
| 7 | `PATCH /api/notes/1/restore` | `200` | |
| 8 | `GET /api/notes` | `200` | 3 notas |
| 9 | `DELETE /api/notes/3/permanent` | `400` | Está activa |
| 10 | `DELETE /api/notes/3` y luego `DELETE /api/notes/3/permanent` | `200` / `200` | |
| 11 | `GET /api/notes/trash` | `200` | Vacía |

Verificá en la base de datos: la nota 1 sigue existiendo con `deletedAt = NULL`; la nota 3 ya no existe en la tabla.

---

## 3. Ejercicio medio — "Registro, login y edición de perfil"

**Qué vas a practicar:** hash de contraseñas con bcrypt, login con mensaje genérico, ocultar el hash, actualizaciones con `optional()` y `matchedData`, y unicidad excluyendo al propio registro.

### Consigna

**Modelo `User`** (`users`, con `paranoid: true`):

| Campo | Tipo | Reglas |
|---|---|---|
| `username` | `STRING(30)` | Único. |
| `email` | `STRING(100)` | Único. |
| `password` | `STRING` | Guardará el **hash**. |
| `full_name` | `STRING(80)` | Obligatorio. |
| `role` | `ENUM('user', 'admin')` | Por defecto `'user'`. |

Con `defaultScope` que excluya `password` y un scope `withPassword`.

**Endpoints:**

| Método | Ruta | Comportamiento |
|---|---|---|
| `POST` | `/api/auth/register` | Valida (`username` 3-30 alfanumérico y único, `email` válido y único, `password` mínimo 8, `full_name` obligatorio). Hashea la contraseña. **Ignora** cualquier `role` enviado (siempre `'user'`). `201` sin el hash. |
| `POST` | `/api/auth/login` | Recibe `email` y `password`. `200` `{ message: 'Login exitoso', user }` (sin hash) o `401` `{ message: 'Credenciales inválidas' }` **idéntico** si el email no existe o la contraseña es incorrecta. |
| `PUT` | `/api/users/:id` | Campos **opcionales**: `username`, `email`, `full_name`, `password`. Unicidad **excluyendo** al propio usuario. Si viene `password`, se hashea antes de guardar. Si no llega ningún campo válido → `400`. |
| `DELETE` | `/api/users/:id` | Eliminación lógica. |
| `GET` | `/api/users` | Lista usuarios activos, sin hash. |

### Reglas

- El hash se hace en el **controlador** (o en un helper), **no** en el modelo.
- La validación de unicidad de `email` y `username` en el registro debe detectar también a los usuarios **eliminados lógicamente** (`paranoid: false`) y responder `400` con `Este email pertenece a una cuenta eliminada` para ese caso.
- Un usuario eliminado lógicamente **no puede** iniciar sesión (`401`, mismo mensaje genérico).

### Cómo probarlo

| # | Petición | Status | Verificar |
|---|---|---|---|
| 1 | `POST /register` válido con `"role": "admin"` | `201` | Respuesta sin `password`; en BD `role = 'user'` y `password` empieza con `$2` |
| 2 | Registrar dos usuarios con la **misma** contraseña | `201` | En BD los hashes son **distintos** (salt) |
| 3 | `POST /login` correcto | `200` | Sin `password` |
| 4 | `POST /login` con contraseña incorrecta | `401` | `Credenciales inválidas` |
| 5 | `POST /login` con email inexistente | `401` | **Exactamente** el mismo body que el #4 |
| 6 | `PUT /api/users/1` con `{ "full_name": "Ada L." }` | `200` | El resto de los campos no cambió |
| 7 | `PUT /api/users/1` con su propio email | `200` | |
| 8 | `PUT /api/users/1` con el email del usuario 2 | `400` | |
| 9 | `PUT /api/users/1` con `{ "password": "NuevaClave123" }` y luego login con la nueva | `200` / `200` | |
| 10 | `PUT /api/users/1` con `{ "role": "admin" }` | `400` | Ningún campo válido; `role` no cambió |
| 11 | `DELETE /api/users/2` y luego login del usuario 2 | `200` / `401` | |
| 12 | `POST /register` con el email del usuario 2 | `400` | `Este email pertenece a una cuenta eliminada` |

---

## 4. Ejercicio difícil — "Blog con roles, propiedad y moderación"

**Qué vas a practicar:** autorización por **rol** y por **propiedad**, middlewares generadores (closures), eliminación lógica en cascada con transacciones y una matriz de permisos completa.

> Recordatorio: en este ejercicio la identidad se **simula** con el header `x-user-id`. En el módulo 07 vas a reemplazar **solo** el middleware de identificación por JWT y todo lo demás debería seguir funcionando igual. Diseñalo pensando en eso.

### Consigna

**Modelos** (todos con `paranoid: true`):

| Modelo | Campos | Relaciones |
|---|---|---|
| `User` | `username`, `email`, `password` (hash), `role` (`user`/`moderator`/`admin`) | 1:N `Post`, 1:N `Comment` |
| `Post` | `title`, `body`, `user_id` | pertenece a `User`, 1:N `Comment` |
| `Comment` | `content`, `user_id`, `post_id` | pertenece a `User` y a `Post` |

**Middlewares** (`src/middlewares/`):

1. `identifyUser`: lee `x-user-id`, busca el usuario **activo**. Si falta el header o el usuario no existe → `401` `{ message: 'No autenticado' }`. Si existe, lo guarda en `req.user`.
2. `requireRole(...roles)`: `403` si `req.user.role` no está en `roles`.
3. `requireOwnershipOr(Model, ...roles)`: busca el recurso por `req.params.id`; deja pasar si `resource.user_id === req.user.id` **o** si el rol del usuario está en `roles`. Si no → `403`. Si el recurso no existe → `404`. Guarda el recurso en `req.resource` para que el controlador no lo vuelva a buscar.

**Matriz de permisos:**

| Acción | Ruta | Visitante (sin header) | `user` | `moderator` | `admin` |
|---|---|---|---|---|---|
| Ver posts | `GET /api/posts` | ✅ | ✅ | ✅ | ✅ |
| Crear post | `POST /api/posts` | ❌ 401 | ✅ | ✅ | ✅ |
| Editar post | `PUT /api/posts/:id` | ❌ 401 | Solo propios | Solo propios | Solo propios |
| Eliminar post | `DELETE /api/posts/:id` | ❌ 401 | Solo propios | ✅ Cualquiera | ✅ Cualquiera |
| Comentar | `POST /api/posts/:id/comments` | ❌ 401 | ✅ | ✅ | ✅ |
| Eliminar comentario | `DELETE /api/comments/:id` | ❌ 401 | Solo propios | ✅ Cualquiera | ✅ Cualquiera |
| Ver papelera de posts | `GET /api/posts/trash` | ❌ 401 | ❌ 403 | ✅ | ✅ |
| Restaurar post | `PATCH /api/posts/:id/restore` | ❌ 401 | ❌ 403 | ❌ 403 | ✅ |
| Eliminar usuario | `DELETE /api/users/:id` | ❌ 401 | ❌ 403 | ❌ 403 | ✅ |
| Cambiar rol | `PATCH /api/users/:id/role` | ❌ 401 | ❌ 403 | ❌ 403 | ✅ (no puede cambiarse **su propio** rol) |

**Reglas de eliminación lógica en cascada** (dentro de una **transacción**):
- Eliminar un **post** → elimina lógicamente sus comentarios.
- Eliminar un **usuario** → elimina lógicamente sus posts y sus comentarios (y los comentarios de otros usuarios en sus posts).
- Restaurar un **post** → restaura los comentarios que se eliminaron **junto con él** (no los que se habían eliminado antes por separado).

```js
// Eliminar: primero el post, después sus comentarios.
// Así todo comentario eliminado "junto con" el post tiene deletedAt >= post.deletedAt.
await sequelize.transaction(async (t) => {
  await post.destroy({ transaction: t });
  await CommentModel.destroy({ where: { post_id: post.id }, transaction: t });
});
```

Pistas para restaurar:
- Con `paranoid`, `Model.destroy({ where })` **no modifica** las filas que ya estaban eliminadas: el comentario borrado antes conserva su `deletedAt` original, que es anterior al del post.
- **Guardá** `post.deletedAt` en una variable **antes** de llamar a `post.restore()`: `restore()` lo vuelve `null` y perdés la referencia.
- Restaurá solo los comentarios con `deletedAt: { [Op.gte]: fechaGuardada }`.

**Validaciones:** `PUT /api/posts/:id` con campos opcionales + `matchedData`; `PATCH /api/users/:id/role` con `role` en `isIn(['user', 'moderator', 'admin'])`.

### Cómo probarlo

Datos iniciales: `admin` (id 1), `moderator` (id 2), `ana` user (id 3), `beto` user (id 4). Ana tiene el post 1 con 2 comentarios (uno de Ana, uno de Beto).

| # | Header `x-user-id` | Petición | Status |
|---|---|---|---|
| 1 | — | `POST /api/posts` | `401` |
| 2 | `999` | `POST /api/posts` | `401` |
| 3 | `4` (beto) | `PUT /api/posts/1` | `403` |
| 4 | `3` (ana) | `PUT /api/posts/1` | `200` |
| 5 | `2` (moderator) | `PUT /api/posts/1` | `403` |
| 6 | `4` (beto) | `DELETE /api/comments/:id` (el de ana) | `403` |
| 7 | `4` (beto) | `DELETE /api/comments/:id` (el propio) | `200` |
| 8 | `2` (moderator) | `DELETE /api/posts/1` | `200` |
| 9 | — | `GET /api/posts` | `200`, sin el post 1 |
| 10 | `3` (ana) | `GET /api/posts/trash` | `403` |
| 11 | `2` (moderator) | `PATCH /api/posts/1/restore` | `403` |
| 12 | `1` (admin) | `PATCH /api/posts/1/restore` | `200`: vuelve el comentario de ana, **no** el de beto (eliminado antes) |
| 13 | `1` (admin) | `PATCH /api/users/1/role` `{"role":"user"}` | `400` o `403` (no puede cambiar su rol) |
| 14 | `1` (admin) | `DELETE /api/users/3` | `200`: ana, su post y todos sus comentarios quedan eliminados lógicamente |
| 15 | `3` (ana) | `POST /api/posts` | `401` (usuario eliminado) |
| 16 | `1` (admin) | `DELETE /api/posts/999` | `404` |

**Criterio de aprobación:** las 16 pruebas pasan, ningún controlador contiene `if (req.user.role ...)` (la autorización vive en middlewares) y en la base de datos no se borró físicamente ninguna fila.
