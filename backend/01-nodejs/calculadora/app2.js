import node from "node:http";
import {sumar, restar, multiplifcar, dividir } from "./operaciones.js";

const menu = {sumar, restar, multiplicar, dividir};

const server = node.createServer((req, res) => {
  // Lógica del servidor
});


const url = 