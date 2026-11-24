import { createInterface } from "node:readline/promises";
import { loadConfig } from "./config.ts";
import { TokenManager, buildClientAssertion, OAuthError } from "./auth.ts";
import { FhirClient, patientSummary } from "./fhir.ts";

const cfg = loadConfig();
const tokens = new TokenManager(cfg);
const fhir = new FhirClient(cfg, tokens);
const rl = createInterface({ input: process.stdin, output: process.stdout });

const decode = (jwt: string) => jwt.split(".").slice(0, 2).map((s) => JSON.parse(Buffer.from(s, "base64url").toString()));

async function run(label: string, fn: () => Promise<void>) {
  try { await fn(); } catch (e) {
    console.error(`\n${label} failed: ${e instanceof OAuthError ? e.message : (e as Error).message}`);
    if (e instanceof OAuthError) console.error("Hint: check CLIENT_ID, that KID matches your hosted JWK Set, and that the key has propagated (can take a while).");
  }
}

async function main() {
  console.log(`\nSMART Backend Services demo — ${cfg.profile.name}\nFHIR base: ${cfg.profile.fhirBase}\nclient_id: ${cfg.clientId}  kid: ${cfg.kid}`);
  for (;;) {
    console.log(`
 1) Show client-assertion JWT (header + claims)
 2) Request access token
 3) Read Patient by id
 4) Search Patients (family [+ given] + birthdate)
 5) Search Patients (identifier)
 q) Quit`);
    const choice = (await rl.question("> ")).trim().toLowerCase();
    if (choice === "q") break;
    if (choice === "1") await run("Assertion", async () => {
      const { header, claims, jwt } = buildClientAssertion(cfg);
      console.log("\nheader:", header, "\nclaims:", claims, `\njwt: ${jwt.slice(0, 60)}…`);
    });
    else if (choice === "2") await run("Token request", async () => {
      const t = await tokens.get(true);
      console.log(`\ntoken_type=${t.token_type} expires_in=${t.expires_in}s scope=${t.scope ?? "-"}\naccess_token=${t.access_token.slice(0, 24)}…`);
    });
    else if (choice === "3") await run("Patient read", async () => {
      const id = (await rl.question("Patient id [erXuFYUfucBZaryVksYEcMg3 = Camila Lopez]: ")).trim() || "erXuFYUfucBZaryVksYEcMg3";
      const p = await fhir.readPatient(id);
      console.log("\n" + patientSummary(p));
      if (process.env.VERBOSE) console.log(JSON.stringify(p, null, 2));
    });
    else if (choice === "4") await run("Patient search", async () => {
      const family = (await rl.question("family [Lopez]: ")).trim() || "Lopez";
      const given = (await rl.question("given (optional, Enter to skip): ")).trim();
      const birthdate = (await rl.question("birthdate [1987-09-12] (Epic requires demographics, not just a name): ")).trim() || "1987-09-12";
      const b = await fhir.searchPatients({ family, ...(given && { given }), birthdate });
      console.log(`\n${b.total ?? b.entry?.length ?? 0} result(s)`);
      for (const e of b.entry ?? []) if (e.resource?.resourceType === "Patient") console.log(patientSummary(e.resource));
    });
    else if (choice === "5") await run("Patient search", async () => {
      const identifier = (await rl.question("identifier (system|value): ")).trim();
      const b = await fhir.searchPatients({ identifier });
      for (const e of b.entry ?? []) if (e.resource?.resourceType === "Patient") console.log(patientSummary(e.resource));
    });
  }
  rl.close();
}
main();
