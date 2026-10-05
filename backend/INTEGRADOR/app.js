import http from "node:http";

const server = http.createServer((req, res) => {});

server.listen(process.env.PORT || 3000, () => {
  console.log(`Servidor en http://localhost:${process.env.PORT || 3000}`);
});
