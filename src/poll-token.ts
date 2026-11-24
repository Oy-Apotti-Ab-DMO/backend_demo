// Retries the token request until Epic accepts the key (JWK Set propagation can take up to ~1h).
// Usage: node --env-file=.env src/poll-token.ts [intervalSeconds]
import { loadConfig } from "./config.ts";
import { requestToken, OAuthError } from "./auth.ts";

const cfg = loadConfig();
const interval = Number(process.argv[2] ?? 300) * 1000;
const started = Date.now();
for (let n = 1; ; n++) {
  const mins = ((Date.now() - started) / 60000).toFixed(0);
  try {
    const t = await requestToken(cfg);
    console.log(`[${new Date().toISOString()}] attempt ${n} (+${mins}m): SUCCESS expires_in=${t.expires_in}s scope=${t.scope ?? "-"}`);
    break;
  } catch (e) {
    const msg = e instanceof OAuthError ? `HTTP ${e.status} ${e.body.replace(/\s+/g, " ")}` : (e as Error).message;
    console.log(`[${new Date().toISOString()}] attempt ${n} (+${mins}m): ${msg}`);
  }
  await new Promise((r) => setTimeout(r, interval));
}
