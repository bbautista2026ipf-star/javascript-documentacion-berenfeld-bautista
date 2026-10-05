const capitalizar = (texto) =>
  texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
const contarPalabras = (texto) =>
  texto
    .trim()
    .split(" ")
    .filter((p) => p !== "").length;

function formatearNombre(nombre, apellido) {
  return `${capitalizar(apellido)}, ${capitalizar(nombre)}`;
}

export { capitalizar, contarPalabras, formatearNombre };
