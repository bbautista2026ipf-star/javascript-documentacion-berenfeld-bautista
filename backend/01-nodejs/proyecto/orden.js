import fs from "node:fs";

console.log("1. inicio");

const contenido = fs.readFileSync("./datos.txt", "utf-8");
console.log("2. lectura bloqueante terminada");

fs.readFile("./datos.txt", "utf-8", () => {
  console.log("3. Lectura NO bloqueante terminada");
});

setTimeout(() => {
  console.log("4. pasaron 0 ms");
}, 0);

console.log("5. fin del script");
