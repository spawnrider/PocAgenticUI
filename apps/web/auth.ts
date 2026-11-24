import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

const issuer = process.env.KEYCLOAK_ISSUER ?? "http://localhost:8081/realms/poc";

async function refresh(token: any) {
  try {
    const r = await fetch(`${issuer}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", client_id: "web-app", refresh_token: token.refreshToken }),
    });
    const j = await r.json();
    if (!r.ok) throw j;
    return { ...token, accessToken: j.access_token, refreshToken: j.refresh_token ?? token.refreshToken, expiresAt: Math.floor(Date.now() / 1000) + j.expires_in, error: undefined };
  } catch {
    return { ...token, error: "RefreshFailed" };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  // Client public Keycloak "web-app" : PKCE (S256), pas de secret.
  providers: [Keycloak({ clientId: "web-app", issuer, client: { token_endpoint_auth_method: "none" }, checks: ["pkce", "state"] })],
  callbacks: {
    async jwt({ token, account }) {
      if (account) return { ...token, accessToken: account.access_token, refreshToken: account.refresh_token, expiresAt: account.expires_at };
      if (token.expiresAt && Date.now() / 1000 < (token.expiresAt as number) - 30) return token;
      return token.refreshToken ? refresh(token) : token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken; // lu côté serveur uniquement (route /api/copilotkit)
      (session as any).error = token.error;
      return session;
    },
  },
});
