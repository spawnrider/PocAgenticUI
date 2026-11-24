// Faux LLM déterministe (AGENT_MODEL=mock) pour tester la chaîne complète sans clé API. NE PAS utiliser en production.
type Part = { type: string; [k: string]: any };
type Msg = { role: string; content: string | Part[] };

const textOf = (m?: Msg) => (typeof m?.content === "string" ? m.content : (m?.content ?? []).filter((p) => p.type === "text").map((p) => p.text).join(""));
const calls = (msgs: Msg[]) => msgs.flatMap((m) => (Array.isArray(m.content) ? m.content.filter((p) => p.type === "tool-call") : []));
const results = (msgs: Msg[]) => msgs.flatMap((m) => (Array.isArray(m.content) ? m.content.filter((p) => p.type === "tool-result") : []));
const resultText = (r: Part) => {
  const o = r.output ?? r.result;
  const v = o && typeof o === "object" && "value" in o ? o.value : o;
  return typeof v === "string" ? v : JSON.stringify(v);
};

export function decide(prompt: Msg[]): { tool: string; input: unknown } | { text: string } {
  const lastUserIdx = prompt.map((m) => m.role).lastIndexOf("user");
  const t = textOf(prompt[lastUserIdx]);
  const after = prompt.slice(lastUserIdx + 1);
  const doneAfter = (name: string) => results(after).some((r) => r.toolName === name);
  const lastCall = (name: string) => [...calls(prompt)].reverse().find((c) => c.toolName === name);

  if (/^CONFIRM:/.test(t)) {
    if (doneAfter("crm_update_email")) return { text: "Email mis à jour." };
    const c = lastCall("show_confirm_action");
    const input = typeof c?.input === "string" ? JSON.parse(c.input) : c?.input;
    return { tool: "crm_update_email", input: input.args };
  }
  if (/^CANCEL:/.test(t)) return { text: "Action annulée." };
  if (/email/i.test(t)) {
    if (doneAfter("show_confirm_action")) return { text: "Merci de confirmer ci-dessus." };
    return { tool: "show_confirm_action", input: { summary: "Changer l'email de c1 en nouveau@example.com", tool: "crm_update_email", args: { id: "c1", email: "nouveau@example.com" } } };
  }
  if (/client/i.test(t)) {
    if (!doneAfter("crm_get_customer")) return { tool: "crm_get_customer", input: { id: "c1" } };
    if (!doneAfter("show_customer_card")) {
      const r = results(after).find((x) => x.toolName === "crm_get_customer")!;
      const txt = resultText(r);
      let c: any = {};
      try { const j = JSON.parse(txt); c = j?.content?.[0]?.text ? JSON.parse(j.content[0].text) : j; } catch { /* ignore */ }
      return { tool: "show_customer_card", input: { name: c.name ?? "?", email: c.email ?? "?", tier: c.tier ?? "?" } };
    }
    return { text: "Voici la fiche client." };
  }
  return { text: "Je peux afficher un client ou modifier son email." };
}

const usage = { inputTokens: 1, outputTokens: 1, totalTokens: 2 };

export const mockModel: any = {
  specificationVersion: "v2",
  provider: "mock",
  modelId: "scripted",
  supportedUrls: {},
  async doGenerate(opts: { prompt: Msg[] }) {
    const d = decide(opts.prompt);
    return "tool" in d
      ? { content: [{ type: "tool-call", toolCallId: `c${Date.now()}`, toolName: d.tool, input: JSON.stringify(d.input) }], finishReason: "tool-calls", usage, warnings: [] }
      : { content: [{ type: "text", text: d.text }], finishReason: "stop", usage, warnings: [] };
  },
  async doStream(opts: { prompt: Msg[] }) {
    const d = decide(opts.prompt);
    const parts: Part[] = [{ type: "stream-start", warnings: [] }];
    if ("tool" in d) {
      parts.push({ type: "tool-call", toolCallId: `c${Date.now()}${Math.random().toString(36).slice(2, 6)}`, toolName: d.tool, input: JSON.stringify(d.input) });
      parts.push({ type: "finish", finishReason: "tool-calls", usage });
    } else {
      parts.push({ type: "text-start", id: "t" }, { type: "text-delta", id: "t", delta: d.text }, { type: "text-end", id: "t" });
      parts.push({ type: "finish", finishReason: "stop", usage });
    }
    return { stream: new ReadableStream({ start(c) { parts.forEach((p) => c.enqueue(p)); c.close(); } }) };
  },
};
