import { sumar, restar, multiplicar, dividir } from "./operaciones.js";

console.assert(sumar(2, 3) === 5, "sumar falló");
console.assert(restar(10, 4) === 6, "restar falló");
console.assert(multiplicar(3, 4) === 12, "multiplicar falló");
console.assert(dividir(10, 2) === 5, "dividir falló");
console.assert(dividir(5, 0) === null, "dividir por cero debe devolver null");
