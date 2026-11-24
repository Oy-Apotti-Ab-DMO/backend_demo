import type { Config } from "./config.ts";
import type { TokenManager } from "./auth.ts";

export class FhirClient {
  private cfg: Config;
  private tokens: TokenManager;
  constructor(cfg: Config, tokens: TokenManager) { this.cfg = cfg; this.tokens = tokens; }

  async get(path: string, params?: Record<string, string>): Promise<any> {
    const url = new URL(`${this.cfg.profile.fhirBase}/${path}`);
    for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await this.tokens.get(attempt > 0);
      const res = await fetch(url, {
        headers: { authorization: `Bearer ${token.access_token}`, accept: "application/fhir+json" },
      });
      if (res.status === 401 && attempt === 0) continue; // token expired/revoked: refetch once
      const text = await res.text();
      if (!res.ok) throw new Error(`GET ${url.pathname} -> HTTP ${res.status}\n${text}`);
      return JSON.parse(text);
    }
  }

  readPatient(id: string) { return this.get(`Patient/${encodeURIComponent(id)}`); }
  searchPatients(params: Record<string, string>) { return this.get("Patient", params); }
}

export function patientSummary(p: any): string {
  const n = p.name?.[0];
  const name = n ? `${(n.given ?? []).join(" ")} ${n.family ?? ""}`.trim() : "(no name)";
  return `${p.id}  ${name.padEnd(28)} ${p.gender ?? "-"}  ${p.birthDate ?? "-"}`;
}
