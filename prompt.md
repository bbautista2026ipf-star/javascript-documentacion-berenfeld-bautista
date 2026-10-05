Esta plantilla asegura que la IA mantenga la consistencia técnica, respete su estructura manual y no rompa el proyecto.
* No inventes carpetas: No crees directorios, carpetas ni arquitecturas nuevas sin mi autorización previa. Debes ceñirte estrictamente a la estructura manual que ya está configurada en el espacio de trabajo.
* No modifiques configuraciones base: No alteres archivos de configuración del entorno (package.json, requirements.txt, .env.example, vite.config.ts, etc.) a menos que te lo pida explícitamente.
* Idiomas: Todo el código (nombres de variables, funciones, bases de datos y comentarios internos) debe escribirse en [Inglés] (puedes cambiarlo a Español si prefieres).
* Estilo de escritura: Usa la convención [camelCase para funciones/variables, PascalCase para componentes/clases].
* Legibilidad: Prioriza el código limpio, modular y fácil de mantener. Divide las funciones grandes en funciones pequeñas y reutilizables.
* Comentarios: No comentes lo obvio. Añade comentarios únicamente en lógica compleja o algoritmos que requieran explicación técnica.
* Manejo de excepciones: Todo código que interactúe con APIs externas, bases de datos o acciones del usuario debe incluir bloques try/catch o el manejo de errores estándar del lenguaje.
* Mensajes de error: Los errores deben registrarse internamente en la consola de manera clara y devolver un mensaje genérico y amigable al usuario final.
* Datos sensibles: Bajo ninguna circunstancia quemes (hardcodear) contraseñas, tokens, llaves de API o credenciales en el código. Usa siempre variables de entorno.
* Código completo o bloques claros: Al darme una solución, proporciona el código completo del bloque modificado o indica exactamente en qué línea e hilo del archivo debo pegarlo. No dejes comentarios como // El resto del código sigue igual si eso altera la sintaxis.
* Explicaciones cortas: Explica brevemente qué cambiaste y por qué, priorizando el código sobre el texto largo. En una hackatón el tiempo es oro.
* Paso 1: Creen su estructura manual de carpetas (según el paso 1 de "centu").
* Paso 2: Guarden este texto en la raíz del proyecto con el nombre REGLAS_IA.md.
* Paso 3: En su primer prompt con la IA (ya sea en Cursor, Claude, ChatGPT, etc.), díganle:
"Vamos a trabajar en este proyecto usando vibecoding. Lee atentamente el archivo REGLAS_IA.md adjunto en la raíz. A partir de ahora, todo el código que generes debe seguir rigurosamente estas reglas independientes de la tarea que te asigne. Confírmame que lo has entendido."