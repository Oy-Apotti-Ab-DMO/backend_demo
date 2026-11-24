export interface Profile {
  name: string;
  fhirBase: string;
  tokenUrl: string;
  /** JWT `aud` — Epic requires the token endpoint URL exactly. */
  audience: string;
}

export const PROFILES: Record<string, Profile> = {
  epic: {
    name: "Epic Sandbox",
    fhirBase: "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
    tokenUrl: "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token",
    audience: "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token",
  },
  // Apotti runs Epic Interconnect, so the endpoint layout should match.
  // Verify against the sandbox's .well-known/smart-configuration before relying on it.
  apotti: {
    name: "Apotti Sandbox",
    fhirBase: "https://gw.apottiekosysteemi.fi/Interconnect-FHIR-EKO01/api/FHIR/R4",
    tokenUrl: "https://gw.apottiekosysteemi.fi/Interconnect-FHIR-EKO01/oauth2/token",
    audience: "https://gw.apottiekosysteemi.fi/Interconnect-FHIR-EKO01/oauth2/token",
  },
};

export interface Config {
  profile: Profile;
  clientId: string;
  kid: string;
  privateKeyPath: string;
  jku?: string;
  scope?: string;
}

export function loadConfig(env = process.env): Config {
  const key = env.PROFILE ?? "epic";
  const profile = PROFILES[key];
  if (!profile) throw new Error(`Unknown PROFILE "${key}". Use: ${Object.keys(PROFILES).join(", ")}`);
  const clientId = env.CLIENT_ID;
  if (!clientId) throw new Error("CLIENT_ID is not set (see .env.example)");
  // Epic authorizes per API *and version*: an app registered for the STU3 APIs gets 403 on /R4.
  // FHIR_BASE (e.g. .../api/FHIR/STU3) overrides the profile's base URL.
  const fhirBase = env.FHIR_BASE || profile.fhirBase;
  return {
    profile: { ...profile, fhirBase },
    clientId,
    kid: env.KID || "demo-key-1",
    privateKeyPath: env.PRIVATE_KEY_PATH || "keys/private.pem",
    jku: env.JKU || undefined,
    scope: env.SCOPE || undefined,
  };
}
