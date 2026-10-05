import { sumar, calcularIva } from "./utils/calculos.js";
import os from "node:os";

console.log(`Sistema: ${os.platform()}`);
console.log(`Suma: ${sumar(10, 5)}`);
console.log(`Precio con IVA: ${calcularIva(1000)}`);
