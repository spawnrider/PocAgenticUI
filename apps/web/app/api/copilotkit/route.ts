import { CopilotRuntime, ExperimentalEmptyAdapter, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";
import { NextRequest } from "next/server";

const runtime = new CopilotRuntime({
  agents: { assistant: new HttpAgent({ url: process.env.AGENT_AGUI_URL ?? "http://localhost:4111/ag-ui/assistant" }) },
});
export const POST = async (req: NextRequest) =>
  copilotRuntimeNextJSAppRouterEndpoint({ runtime, serviceAdapter: new ExperimentalEmptyAdapter(), endpoint: "/api/copilotkit" }).handleRequest(req);
