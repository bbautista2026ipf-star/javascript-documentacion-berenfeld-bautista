import { capitalizar } from "./textos.js";

function formatearNombre(nombre, apellido) {
  return `${capitalizar(apellido)}, ${capitalizar(nombre)}`;
}

export default formatearNombre;
