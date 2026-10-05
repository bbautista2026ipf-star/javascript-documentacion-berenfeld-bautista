import formatearNombre from "./formateador.js";
import { capitalizar, contarPalabras } from "./textos.js";

console.log(
  `capitalizar('jAVASCRIPT') → esperado: Javascript | obtenido: ${capitalizar("jAVASCRIPT")}`,
);
console.log(
  `contarPalabras(' a  b ') → esperado: 2 | obtenido: ${contarPalabras(" a  b ")}`,
);
console.log(
  `formatearNombre('alan', 'turing') → esperado: Turing, Alan | obtenido: ${formatearNombre("alan", "turing")}`,
);
