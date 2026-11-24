// Generates an RSA-2048 key pair and the public JWK Set you must host at the
// "Non-Production JWK Set URL" registered on fhir.epic.com.
import { generateKeyPairSync } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";

const kid = process.argv[2] ?? "demo-key-1";
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });

mkdirSync("keys", { recursive: true });
writeFileSync("keys/private.pem", privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });

const jwk = publicKey.export({ format: "jwk" });
// Epic's JWK Set: kty/n/e plus kid, alg, use.
const jwks = { keys: [{ ...jwk, kid, alg: "RS384", use: "sig" }] };
writeFileSync("keys/jwks.json", JSON.stringify(jwks, null, 2) + "\n");

console.log(`Wrote keys/private.pem (keep secret) and keys/jwks.json (kid=${kid}).`);
console.log("Host keys/jwks.json at your registered JWK Set URL (HTTPS, public), then set KID in .env.");
