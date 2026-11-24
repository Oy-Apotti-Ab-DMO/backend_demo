# SMART Backend Services demo (TypeScript)

Character-based demo of Epic's "Backend OAuth 2.0" (SMART Backend Services, `private_key_jwt` + `client_credentials`).
Zero runtime dependencies: Node 22.18+/24 runs the `.ts` files directly.

## Setup
1. `npm install`
2. `npm run keygen [kid]` → `keys/private.pem` (secret) + `keys/jwks.json` (public).
3. Publish `keys/jwks.json` at the **Non-Production JWK Set URL** registered for your app on fhir.epic.com
   (public HTTPS; `npm run serve-jwks` + a tunnel works, or any static host). Epic may take a while to pick up a new/changed key set.
4. `cp .env.example .env`, set `CLIENT_ID` (Non-Production Client ID) and `KID`.
5. `node --env-file=.env src/index.ts`

## Flow (src/auth.ts)
- JWT header: `alg=RS384, typ=JWT, kid` (+ optional `jku`)
- Claims: `iss=sub=client_id`, `aud=token URL`, unique `jti`, `exp` ≤ 5 min
- POST token URL, form-encoded: `grant_type=client_credentials`, `client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer`, `client_assertion=<jwt>`
- Use `Authorization: Bearer <token>` on FHIR calls; there is no refresh token, so request a new one on expiry (TokenManager does this).

## Apotti
Set `PROFILE=apotti`. Endpoints in `src/config.ts` are assumed to follow the Epic layout; confirm via the sandbox's `.well-known/smart-configuration`.
