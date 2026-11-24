"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CopilotChat } from "@copilotkit/react-ui";
import { useCopilotChat } from "@copilotkit/react-core";
import { useRenderTool } from "@copilotkit/react-core/v2";
import { z } from "zod";
import { TextMessage, Role } from "@copilotkit/runtime-client-gql";
import dynamic from "next/dynamic";
// @a2ui/* manipule des Custom Elements (HTMLElement) : rendu client uniquement.
const A2uiView = dynamic(() => import("../components/A2uiView").then((m) => m.A2uiView), { ssr: false });
import { DecisionContext } from "../lib/decision";

const BFF = process.env.NEXT_PUBLIC_BFF_URL ?? "http://localhost:4000";

function ToolSurface({ result }: { result?: string }) {
  const messages = useMemo(() => {
    try { return result ? (JSON.parse(result).a2ui as unknown[]) ?? [] : []; } catch { return []; }
  }, [result]);
  return messages.length ? <A2uiView messages={messages} /> : null;
}

export default function Home() {
  const [screen, setScreen] = useState<unknown[]>([]);
  const [decided, setDecided] = useState<Record<string, string>>({});
  const { appendMessage } = useCopilotChat();

  useEffect(() => { fetch(`${BFF}/screens/home`).then((r) => r.json()).then(setScreen).catch(() => setScreen([])); }, []);

  const decide = useCallback((actionId: string, d: "CONFIRM" | "CANCEL") => {
    setDecided((x) => ({ ...x, [actionId]: d }));
    void appendMessage(new TextMessage({ role: Role.User, content: `${d}:${actionId}` }));
  }, [appendMessage]);

  const any = z.object({}).passthrough();
  useRenderTool({ name: "show_customer_card", parameters: any, render: ({ result }: any) => <ToolSurface result={result} /> } as any);
  useRenderTool({ name: "show_confirm_action", parameters: any, render: ({ result }: any) => <ToolSurface result={result} /> } as any);

  return (
    <DecisionContext.Provider value={{ decide, decided }}>
      <main style={{ display: "grid", gridTemplateColumns: "1fr 420px", height: "100vh" }}>
        <section style={{ padding: 16 }}>
          <h1>Accueil (SDUI via BFF)</h1>
          <A2uiView messages={screen} />
        </section>
        <CopilotChat labels={{ title: "Assistant" }} />
      </main>
    </DecisionContext.Provider>
  );
}
