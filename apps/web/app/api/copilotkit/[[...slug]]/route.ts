import { CopilotRuntime, createCopilotRuntimeHandler } from "@copilotkit/runtime/v2";
import { HttpAgent } from "@ag-ui/client";
import { auth } from "../../../../auth";

// Le jeton Keycloak de l'utilisateur est transmis à l'agent (qui l'échange pour la gateway).
// Runtime construit par requête : un HttpAgent par utilisateur, jamais de jeton partagé.
const handler = async (req: Request) => {
  const session: any = await auth();
  if (!session?.accessToken || session.error) return new Response("unauthorized", { status: 401 });
  const runtime = new CopilotRuntime({
    agents: {
      assistant: new HttpAgent({
        url: process.env.AGENT_AGUI_URL ?? "http://localhost:4111/ag-ui/assistant",
        headers: { Authorization: `Bearer ${session.accessToken}` },
      }) as any,
    },
    identifyUser: () => ({ id: session.user?.email ?? "user" }),
  } as any);
  return createCopilotRuntimeHandler({ runtime: runtime as any, basePath: "/api/copilotkit" })(req);
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
