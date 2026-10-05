import { sumar, calcularIva } from "./utils/calculos.js";
import os from "node:os";

console.log(`sumar(10, 5) → esperado: 15 | obtenido: ${sumar(10, 5)}`);
console.log(`calcularIva(1000) → esperado: 1210 | obtenido: ${calcularIva(1000)}`);
console.log(`os.platform() → esperado: un texto (win32, linux...) | obtenido: ${os.platform()}`);
