# Módulo 06 — Eliminación lógica y actualizaciones

> Material del profesor: `material/Práctica de Eliminación Lógica y Actualizaciones.pdf`

---

## 1. Conceptos principales

### 1.1 Rutas de actualización y eliminación

Para completar el CRUD de cada recurso faltan dos rutas:

| Método | Ruta | Acción |
|---|---|---|
| `PUT` | `/api/{nombre}/:id` | Actualizar un registro por id. |
| `DELETE` | `/api/{nombre}/:id` | Eliminar un registro por id. |

`{nombre}` es el recurso en plural y minúsculas: `users`, `articles`, `tags`.

Antes de actualizar o eliminar, siempre se **verifica que el registro exista** (`404` si no existe, o `400` si esa verificación la hace un `custom` de express-validator).

### 1.2 Eliminación física vs eliminación lógica

| | **Eliminación física** | **Eliminación lógica** |
|---|---|---|
| Qué pasa | La fila **se borra** de la tabla. | La fila **queda**, marcada como eliminada con una fecha en `deletedAt`. |
| ¿Se puede recuperar? | No. | Sí. |
| ¿Se conserva el historial? | No. | Sí. |
| En las consultas normales | No aparece (no existe). | No aparece (Sequelize la excluye). |

La **eliminación lógica** no borra el registro: lo marca como eliminado mediante un campo adicional, para excluirlo de las consultas **sin perder el historial**.

### 1.3 `paranoid` en Sequelize

Sequelize automatiza la eliminación lógica con la opción **`paranoid`**:

```js
export const UserModel = sequelize.define('User', {
  username: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  // ...
}, {
  timestamps: true,   // obligatorio: paranoid depende de los timestamps
  paranoid: true,     // agrega la columna deletedAt
});
```

Al activarla:
- Sequelize agrega la columna **`deletedAt`**.
- **`.destroy()` se usa igual que siempre**, pero en lugar de borrar la fila, guarda la fecha y hora de eliminación en `deletedAt`.
- Las consultas (`findAll`, `findByPk`, `findOne`) **excluyen automáticamente** los registros con `deletedAt` distinto de `null`.

```js
export const deleteUser = async (req, res) => {
  try {
    const user = await UserModel.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    await user.destroy(); // con paranoid: eliminación lógica
    return res.status(200).json({ message: 'Usuario eliminado' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};
```

**Nombres de columnas en snake_case.** Si se quiere que las columnas automáticas se llamen `created_at`, `updated_at` y `deleted_at` (como pide el TP Integrador), se agrega la opción `underscored: true`:

```js
{ timestamps: true, paranoid: true, underscored: true }
```

### 1.4 Eliminación lógica y eliminación en cascada

`onDelete: 'CASCADE'` (módulo 03) es una regla **de la base de datos**: actúa cuando una fila **se borra de verdad**.

| Si se elimina... | Con `onDelete: 'CASCADE'` en sus relaciones |
|---|---|
| Un registro **sin** `paranoid` (borrado físico) | Se borran también sus registros relacionados. |
| Un registro **con** `paranoid` (borrado lógico) | Sus registros relacionados **no cambian**: para la base de datos solo se actualizó la columna `deletedAt`. |

Ejemplo del TP Integrador: `User` tiene `paranoid` (se elimina lógicamente) y la tabla intermedia `ArticleTag` tiene cascada respecto de `Article` (al borrar un artículo, se borran sus asociaciones con etiquetas).

### 1.5 Validaciones para las rutas de actualización

En una actualización **no todos los campos son obligatorios**: el usuario puede querer cambiar solo uno. Por eso la validación es distinta a la de creación:

| | Creación (`POST`) | Actualización (`PUT`) |
|---|---|---|
| Campos | Obligatorios: `notEmpty()`. | **Opcionales**: `optional()`. |
| Unicidad | El valor no puede existir. | El valor no puede existir **en otro registro**. |
| Existencia del registro | — | El registro a editar debe existir. |

**`.optional()`**: el campo se valida **solo si viene** en el body; si se omite, no se rechaza.

```js
import { body, param } from 'express-validator';
import { Op } from 'sequelize';

export const updateUserValidations = [
  param('id')
    .isInt({ min: 1 }).withMessage('El id debe ser un entero positivo')
    .custom(async (id) => {
      const user = await UserModel.findByPk(id);
      if (!user) throw new Error('El usuario no existe');
      return true;
    }),
  body('username')
    .optional()
    .isLength({ min: 3, max: 20 }).withMessage('El username debe tener entre 3 y 20 caracteres'),
  body('email')
    .optional()
    .isEmail().withMessage('El email no es válido')
    .custom(async (email, { req }) => {
      const user = await UserModel.findOne({
        where: { email, id: { [Op.ne]: req.params.id } }, // otro usuario, no el mismo
      });
      if (user) throw new Error('El email ya está en uso');
      return true;
    }),
];
```

`Op.ne` significa "distinto de" (*not equal*): busca el email en **otro** usuario.

**`matchedData()` en el controlador:** devuelve solo los campos que el usuario **envió y pasaron la validación**. Así no llegan al modelo datos no esperados (por ejemplo, un `role` o un `id` que nadie validó).

```js
export const updateUser = async (req, res) => {
  try {
    const data = matchedData(req, { locations: ['body'] });

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'Debe enviar al menos un campo para actualizar' });
    }

    const user = await UserModel.findByPk(req.params.id);
    await user.update(data);

    return res.status(200).json({ message: 'Usuario actualizado', user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};
```

### 1.6 Unicidad y registros eliminados lógicamente

La restricción `unique` de la base de datos **sigue aplicando a los registros eliminados lógicamente** (la fila sigue existiendo). Si se elimina al usuario `ana@mail.com` y otro intenta registrarse con ese email, la base de datos lo rechaza con un error `500`.

Para responder `400` con un mensaje claro, la validación `custom` de unicidad debe buscar **también entre los eliminados**, con `paranoid: false`:

```js
const user = await UserModel.findOne({ where: { email }, paranoid: false });
```

### 1.7 Errores comunes

| Error | Causa | Solución |
|---|---|---|
| `.destroy()` borra la fila | Falta `paranoid: true` o hay `timestamps: false`. | Activar ambos. |
| No aparece la columna `deletedAt` | La tabla se creó antes de activar `paranoid`. | Volver a crear la tabla (`sync({ force: true })` en desarrollo). |
| Al eliminar lógicamente un usuario, sus artículos siguen | La eliminación lógica no dispara la cascada. | Es el comportamiento esperado (sección 1.4). |
| El `PUT` rechaza solicitudes con un solo campo | Las reglas de actualización usan `notEmpty()` sin `optional()`. | Usar `optional()` en las reglas de `PUT`. |
| El `PUT` modifica campos que no se validaron | Se usó `req.body`. | `matchedData(req, { locations: ['body'] })`. |
| Error al editar con el **mismo** email | La unicidad encuentra al propio registro. | Excluirlo con `id: { [Op.ne]: req.params.id }`. |
| `500` al crear con el email de un eliminado | La unicidad no busca entre eliminados. | `paranoid: false` en el `custom`. |

### 1.8 Dónde vas a usar esto en los trabajos prácticos

- `User` con `paranoid: true` y `DELETE /api/users/:id` como eliminación lógica.
- Cascada `Article → ArticleTag`.
- Todas las rutas `PUT` con reglas `optional()` y `matchedData(req, { locations: ['body'] })`.
- Unicidad al **editar** (`username`, `email`, `name` de las etiquetas) excluyendo el propio registro.

---

## 2. Ejercicio fácil — "Eliminación lógica con `paranoid`"

**Qué vas a practicar:** activar `paranoid`, eliminar con `.destroy()` y comprobar que el registro sigue en la base de datos pero no aparece en las consultas.

**En el proyecto real:** es el `DELETE /api/users/:id` del TP (*"Eliminación lógica de usuario"*).

### Consigna

Proyecto Express + Sequelize con la estructura habitual (`src/config`, `src/models`, `src/routes`, `src/controllers`).

Modelo `Nota`:

| Campo | Tipo |
|---|---|
| `titulo` | `STRING(100)`, obligatorio |
| `contenido` | `TEXT` |

Opciones: `timestamps: true`, `paranoid: true`, `underscored: true`.

| Método | Ruta | Respuesta |
|---|---|---|
| `POST` | `/api/notas` | `201` + la nota creada. |
| `GET` | `/api/notas` | `200` + las notas. |
| `GET` | `/api/notas/:id` | `200` + la nota, o `404`. |
| `DELETE` | `/api/notas/:id` | `200` + `{ "message": "Nota eliminada" }`, o `404`. |

### Cómo probarlo

| # | Acción | Resultado esperado |
|---|---|---|
| 1 | Crear 3 notas | `201` cada una |
| 2 | `DELETE /api/notas/1` | `200` |
| 3 | `GET /api/notas` | Solo 2 notas |
| 4 | `GET /api/notas/1` | `404` |
| 5 | `DELETE /api/notas/1` otra vez | `404` |
| 6 | Abrir la tabla en MySQL | Siguen las **3** filas; la nota 1 tiene fecha en `deleted_at` y las otras `NULL` |

---

## 3. Ejercicio medio — "Rutas de actualización con `optional()` y `matchedData()`"

**Qué vas a practicar:** reglas de validación para `PUT`, unicidad excluyendo el propio registro y `matchedData` con `locations`.

**En el proyecto real:** son todas las rutas `PUT` del TP (`/api/users/:id`, `/api/tags/:id`, `/api/articles/:id`).

### Punto de partida

El **ejercicio medio del módulo 05** (películas y directores con express-validator).

### Consigna

1. En `pelicula.validations.js` agregá `updatePeliculaValidations`:

| Campo | Reglas |
|---|---|
| `id` (param) | Entero positivo, la película debe existir. |
| `titulo` | **Opcional**. Si viene: 1-150 caracteres, y no puede usarlo **otra** película (`Op.ne`). |
| `anio` | **Opcional**. Si viene: entero entre 1888 y el año actual. |
| `director_id` | **Opcional**. Si viene: entero positivo y el director debe existir. |

2. Aplicalas en `PUT /api/peliculas/:id`.
3. En el controlador usá `matchedData(req, { locations: ['body'] })`. Si no quedó ningún campo, respondé `400` con `Debe enviar al menos un campo para actualizar`.
4. Hacé lo mismo para `PUT /api/directores/:id` (`nombre` opcional, 2-100 caracteres, único excluyendo al propio director).

### Cómo probarlo

| # | Petición | Status | Verificar |
|---|---|---|---|
| 1 | `PUT /api/peliculas/1` `{ "anio": 2018 }` | `200` | El título **no** cambió |
| 2 | `PUT /api/peliculas/1` con **su propio** título | `200` | No es un duplicado |
| 3 | `PUT /api/peliculas/1` con el título de la película 2 | `400` | |
| 4 | `PUT /api/peliculas/1` `{ "anio": 1500 }` | `400` | |
| 5 | `PUT /api/peliculas/1` `{}` | `400` | `Debe enviar al menos un campo...` |
| 6 | `PUT /api/peliculas/1` `{ "id": 99 }` | `400` | El `id` del body no se validó, no llega al modelo |
| 7 | `PUT /api/peliculas/999` `{ "anio": 2000 }` | `400` | La película no existe |
| 8 | `PUT /api/directores/1` con el nombre de otro director | `400` | |

---

## 4. Ejercicio difícil — "Eliminación lógica y en cascada en un proyecto con relaciones"

**Qué vas a practicar:** combinar `paranoid` y `onDelete: 'CASCADE'` en el mismo proyecto, entender qué se elimina y qué no, y la unicidad frente a registros eliminados.

**En el proyecto real:** es el punto 3 del TP Integrador: *"Implementar eliminación lógica: User (paranoid: true). Implementar eliminación en cascada: Article (cuando se elimina un article eliminar las asociaciones con tags que posee)"*.

### Punto de partida

El **ejercicio difícil del módulo 05** (`User`, `Profile`, `Post`, `Tag`, `PostTag` con validaciones).

### Consigna

1. **Modelos:**
   - `User` con `paranoid: true` (y `underscored: true`).
   - Relación `Post ↔ Tag` (a través de `PostTag`) con eliminación en cascada: al eliminar un post, se eliminan sus filas de `PostTag`.
2. **Rutas nuevas:**

| Método | Ruta | Comportamiento |
|---|---|---|
| `GET` | `/api/users` | Usuarios activos con su perfil (sin `password`). |
| `PUT` | `/api/users/:id` | Campos opcionales: `username`, `email`, `role`. Unicidad excluyendo al propio usuario. |
| `DELETE` | `/api/users/:id` | Eliminación **lógica**. |
| `PUT` | `/api/tags/:id` | `name` opcional, mismas reglas que al crear, único excluyendo la propia etiqueta. |
| `DELETE` | `/api/posts/:id` | Eliminación **física** del post. |
| `DELETE` | `/api/posts-tags/:id` | Quita una etiqueta de un post (borra la fila de `PostTag`). |

3. **Unicidad con eliminados:** las validaciones de `username` y `email` al **crear** un usuario deben detectar también a los usuarios eliminados lógicamente y responder `400`.

### Preguntas para responder (en un comentario en `src/models/index.js`)

1. Al eliminar un usuario, ¿qué pasa con sus posts? ¿Por qué?
2. Al eliminar un post, ¿qué pasa con sus filas en `PostTag`? ¿Y con las etiquetas?
3. ¿Por qué `Tag` **no** se elimina cuando se elimina un post?

### Cómo probarlo

Datos iniciales: 2 usuarios; el usuario 1 con 2 posts; el post 1 con 2 etiquetas.

| # | Petición | Status | Verificar |
|---|---|---|---|
| 1 | `PUT /api/users/1` `{ "role": "admin" }` | `200` | |
| 2 | `PUT /api/users/1` con el email del usuario 2 | `400` | |
| 3 | `PUT /api/tags/1` `{ "name": "con espacio" }` | `400` | |
| 4 | `DELETE /api/posts-tags/1` | `200` | El post 1 queda con 1 etiqueta |
| 5 | `DELETE /api/posts/1` | `200` | En MySQL ya no hay filas de `PostTag` con `post_id = 1`; las **etiquetas siguen** |
| 6 | `DELETE /api/users/1` | `200` | |
| 7 | `GET /api/users` | `200` | Solo el usuario 2 |
| 8 | Ver la tabla `Users` en MySQL | — | El usuario 1 sigue, con fecha en `deleted_at` |
| 9 | Ver la tabla `Posts` en MySQL | — | El post 2 del usuario 1 **sigue** (eliminación lógica: no hay cascada) |
| 10 | `POST /api/users` con el email del usuario 1 (eliminado) | `400` | No `500` |
