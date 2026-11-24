import { createServer } from "node:http";
import { readdirSync, readFileSync } from "node:fs";
// Stub minimal du registre privé : GET /v0/servers. À remplacer par ToolHive Registry Server.
const dir = "/data/servers";
createServer((req, res) => {
  if (req.url?.startsWith("/v0/servers")) {
    const servers = readdirSync(dir).filter(f => f.endsWith(".json")).map(f => JSON.parse(readFileSync(`${dir}/${f}`, "utf8")));
    res.setHeader("content-type", "application/json");
    return res.end(JSON.stringify({ servers }));
  }
  res.statusCode = 404; res.end();
}).listen(Number(process.env.PORT ?? 8090));
