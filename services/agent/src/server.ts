import express from "express";
import { EventEncoder } from "@ag-ui/encoder";
import { MastraAgent } from "@ag-ui/mastra";
import { EventType } from "@ag-ui/core";
import { RunAgentInputSchema } from "@ag-ui/core/schemas";
import { buildAgent } from "./agent.js";
import { exchangeForGateway, verifyUser } from "./auth.js";
import { config } from "./config.js";
import { flag } from "./flags.js";
import { mockModel } from "./mock-model.js";
import { PgStore, type ActionStore } from "./store.js";

export function createApp(store: ActionStore, opts: { model?: any; skipExchange?: boolean } = {}) {
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use((req, res, next) => {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-headers", "authorization, content-type, accept");
    if (req.method === "OPTIONS") { res.sendStatus(204); return; }
    next();
  });
  app.get("/healthz", (_q, r) => { r.send("ok"); });

  app.post("/ag-ui/assistant", async (req, res) => {
    const bearer = /^Bearer (.+)$/.exec(req.header("authorization") ?? "")?.[1];
    if (!bearer) { res.status(401).json({ error: "jeton manquant" }); return; }
    let user;
    try { user = await verifyUser(bearer); } catch (e) { res.status(401).json({ error: `jeton invalide: ${e}` }); return; }
    if (!flag("agent.enabled", user.sub)) { res.status(403).json({ error: "agent désactivé (flag agent.enabled)" }); return; }
    const parsed = RunAgentInputSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const input = parsed.data;

    // Décision utilisateur sur une action en attente : message "CONFIRM:<id>" / "CANCEL:<id>" (envoyé par les boutons ConfirmAction).
    const last = [...input.messages].reverse().find((m) => m.role === "user");
    const m = typeof last?.content === "string" ? /^(CONFIRM|CANCEL):([\w-]+)/.exec(last.content) : null;
    if (m) await store.decide(m[2], user.sub, input.threadId, m[1] === "CONFIRM" ? "confirmed" : "cancelled");

    let built;
    try {
      const gatewayToken = opts.skipExchange ? bearer : await exchangeForGateway(bearer);
      built = await buildAgent({
        userId: user.sub, threadId: input.threadId, gatewayToken, store, model: opts.model ?? (config.model === "mock" ? mockModel : undefined),
        toolEnabled: (name) => flag(`agent.tool.${name}`, user.sub),
      });
    } catch (e) { res.status(502).json({ error: String(e) }); return; }

    const encoder = new EventEncoder({ accept: req.header("accept") ?? undefined });
    res.writeHead(200, { "content-type": encoder.getContentType(), "cache-control": "no-cache", connection: "keep-alive" });
    const agui = new MastraAgent({ agent: built.agent as any, resourceId: user.sub, agentId: "assistant", threadId: input.threadId } as any);
    agui.run(input).subscribe({
      next: (ev) => res.write(encoder.encode(ev)),
      error: (e) => { res.write(encoder.encode({ type: EventType.RUN_ERROR, message: String(e) } as any)); res.end(); void built.close(); },
      complete: () => { res.end(); void built.close(); },
    });
  });
  return app;
}

if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  createApp(new PgStore()).listen(config.port, () => console.log(`agent up :${config.port}`));
}
