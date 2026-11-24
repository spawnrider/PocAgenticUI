import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "./config.js";

const jwks = createRemoteJWKSet(new URL(`${config.keycloakInternal}/protocol/openid-connect/certs`));

export type User = { sub: string; username?: string; roles: string[] };

// Valide le jeton utilisateur (signature, issuer, audience = agent-service).
export async function verifyUser(token: string): Promise<User> {
  const { payload } = await jwtVerify(token, jwks, { issuer: config.issuer, audience: config.clientId });
  return { sub: String(payload.sub), username: payload.preferred_username as string | undefined, roles: (payload.roles as string[]) ?? [] };
}

// Token exchange (RFC 8693, "standard token exchange" Keycloak 26.2+) : jeton utilisateur -> jeton à audience agentgateway.
export async function exchangeForGateway(userToken: string): Promise<string> {
  const r = await fetch(`${config.keycloakInternal}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      subject_token: userToken,
      subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
      requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
      audience: config.gatewayAudience,
    }),
  });
  if (!r.ok) throw new Error(`token exchange refusé (${r.status}): ${await r.text()}`);
  return ((await r.json()) as { access_token: string }).access_token;
}
