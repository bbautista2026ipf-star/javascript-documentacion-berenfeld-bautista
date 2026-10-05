import http from "node:http";
import "dotenv/config";

const server = http.createServer((req, res) => {
  if (req.url === "/api/personajes") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify([
        { id: 1, nombre: "Goku" },
        { id: 2, nombre: "Vegeta" },
        { id: 3, nombre: "Trunks" },
      ]),
    );
  } else if (req.url === "/") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ mensaje: "Servidor funcionando" }));
  } else {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ mensaje: "Ruta no encontrada" }));
  }
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`Servidor en http://localhost:${process.env.PORT || 3000}`);
});

// El servidor no termina como orden.js porque server.listen() lo deja escuchando
// pedidos en el puerto: el ciclo de eventos siempre tiene una tarea pendiente.
// orden.js termina cuando su cola de eventos queda vacía. El servidor solo se
// detiene si lo cortamos con Ctrl + C.
