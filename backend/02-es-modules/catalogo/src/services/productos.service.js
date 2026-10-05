import { productos } from "../data/productos.js";

export const obtenerTodos = () => productos;

export const obtenerPorId = (id) => productos.find((p) => p.id === id);

export const obtenerPorCategoria = (categoria) =>
  productos.filter((p) => p.categoria === categoria);
