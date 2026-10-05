import { productos } from "./src/data/productos.js";
import {
  obtenerTodos,
  obtenerPorId,
  obtenerPorCategoria,
} from "./src/services/productos.service.js";

console.log(
  `obtenerTodos().length → esperado: ${productos.length} | obtenido: ${obtenerTodos().length}`,
);
console.log(
  `obtenerPorId(2).id → esperado: 2 | obtenido: ${obtenerPorId(2).id}`,
);
console.log(
  `obtenerPorId(67) → esperado: undefined | obtenido: ${obtenerPorId(67)}`,
);
console.log(
  `¿obtenerPorCategoria devuelve un array? → esperado: true | obtenido: ${Array.isArray(obtenerPorCategoria("cualquiera"))}`,
);
