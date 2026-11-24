import { createPrivateKey, createSign, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Config } from "./config.ts";

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

/** Step 1 of SMART Backend Services: build and sign the client-assertion JWT. */
export function buildClientAssertion(cfg: Config, now = Math.floor(Date.now() / 1000)) {
  const header: Record<string, string> = { alg: "RS384", typ: "JWT", kid: cfg.kid };
  if (cfg.jku) header.jku = cfg.jku;

  const claims = {
    iss: cfg.clientId,                  // issuer = client id
    sub: cfg.clientId,                  // subject = client id
    aud: cfg.profile.audience,          // the token endpoint
    jti: randomUUID(),                  // unique per request; Epic rejects reuse
    iat: now,
    nbf: now,
    exp: now + 4 * 60,                  // must be <= 5 minutes in the future
  };

  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const key = createPrivateKey(readFileSync(cfg.privateKeyPath));
  const sig = createSign("RSA-SHA384").update(signingInput).sign(key);
  return { jwt: `${signingInput}.${b64url(sig)}`, header, claims };
}

export interface Token {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  obtainedAt: number;
}

export class OAuthError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`Token endpoint returned HTTP ${status}: ${body}`);
    this.status = status;
    this.body = body;
  }
}

/** Step 2: exchange the assertion for an access token (client_credentials). */
export async function requestToken(cfg: Config): Promise<Token> {
  const { jwt } = buildClientAssertion(cfg);
  const form = new URLSearchParams({
    grant_type: "client_credentials",
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: jwt,
  });
  if (cfg.scope) form.set("scope", cfg.scope);

  const res = await fetch(cfg.profile.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) throw new OAuthError(res.status, text);
  return { ...JSON.parse(text), obtainedAt: Date.now() };
}

/** Caches the token and refreshes 30s before expiry (backend services get no refresh token). */
export class TokenManager {
  private token?: Token;
  private cfg: Config;
  constructor(cfg: Config) { this.cfg = cfg; }
  async get(force = false): Promise<Token> {
    const t = this.token;
    if (!force && t && Date.now() < t.obtainedAt + (t.expires_in - 30) * 1000) return t;
    return (this.token = await requestToken(this.cfg));
  }
}
