import "dotenv/config";

console.log(`Puerto: ${process.env.PORT || 3000}`);
console.log(`Aplicación: ${process.env.APP_NAME}`);
console.log(`Modo: ${process.env.MODO}`);

// 1. node_modules/ tiene el código de las dependencias instaladas. Va en .gitignore
//    porque pesa mucho y se puede regenerar ejecutando npm install.
// 2. Al borrar node_modules/ y ejecutar npm install, npm lee qué paquetes hacen falta
//    (package.json) y sus versiones exactas (package-lock.json), y los vuelve a descargar.
// 3. .env tiene información sensible y no se publica. .env.example es una plantilla
//    con las mismas claves sin valores: quien clona el repo la copia como .env y la completa.
