// Tiny local server for keys/jwks.json. Epic must reach it over public HTTPS, so
// tunnel it (e.g. `cloudflared tunnel --url http://localhost:8080`) or just upload
// the file to static hosting (GitHub Pages etc.) — the tunnel URL must match your registration.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const port = Number(process.env.PORT ?? 8080);
createServer((req, res) => {
  console.log(`${req.method} ${req.url} <- ${req.headers["user-agent"] ?? "?"}`);
  res.setHeader("content-type", "application/json");
  res.end(readFileSync("keys/jwks.json"));
}).listen(port, () => console.log(`Serving keys/jwks.json on http://localhost:${port}`));
