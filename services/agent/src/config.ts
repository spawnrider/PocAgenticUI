const need = (k: string, d?: string) => {
  const v = process.env[k] ?? d;
  if (v === undefined) throw new Error(`variable d'environnement manquante: ${k}`);
  return v;
};
export const config = {
  port: Number(process.env.PORT ?? 4111),
  gatewayUrl: need("MCP_GATEWAY_URL", "http://localhost:3000/mcp"),
  issuer: need("KEYCLOAK_ISSUER", "http://localhost:8081/realms/poc"),
  keycloakInternal: need("KEYCLOAK_INTERNAL_URL", "http://localhost:8081/realms/poc"),
  clientId: need("AGENT_CLIENT_ID", "agent-service"),
  clientSecret: need("AGENT_CLIENT_SECRET", "agent-service-dev-secret"),
  gatewayAudience: need("GATEWAY_AUDIENCE", "agentgateway"),
  databaseUrl: need("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/agent"),
  unleashUrl: need("UNLEASH_URL", "http://localhost:4242/api"),
  unleashToken: need("UNLEASH_CLIENT_TOKEN", "default:development.unleash-insecure-client-api-token"),
  model: need("AGENT_MODEL", "anthropic/claude-sonnet-4-5"),
};
