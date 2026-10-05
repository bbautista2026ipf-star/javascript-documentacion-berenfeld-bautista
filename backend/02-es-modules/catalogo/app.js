import "dotenv/config";
import os from "node:os";
import {
  obtenerTodos,
  obtenerPorId,
} from "./src/services/productos.service.js";

console.log(`App: ${process.env.APP_NAME}`);
console.log(`Sistema operativo: ${os.platform()}`);
console.log(`Cantidad de productos: ${obtenerTodos().length}`);
console.log("Producto con id 2:", obtenerPorId(2));
