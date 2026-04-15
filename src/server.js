import { createServer } from "node:http";
import { app } from "./app.js";

const PORT = process.env.PORT;
const HOST = process.env.HOST;

const server = createServer((req, res) => {
  app(req, res).catch(() => {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Erro interno do servidor" }));
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
