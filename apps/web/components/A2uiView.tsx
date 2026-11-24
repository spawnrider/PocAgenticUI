"use client";
import { useEffect, useState } from "react";
import { MessageProcessor } from "@a2ui/web_core/v0_9";
import { A2uiSurface } from "@a2ui/react/v0_9";
import { catalog } from "../lib/catalog";

// Rend un lot de messages A2UI v0.9 (BFF ou surfaces émises par l'agent).
export function A2uiView({ messages }: { messages: unknown[] }) {
  const [surfaces, setSurfaces] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    try {
      const p = new MessageProcessor([catalog as any]);
      p.processMessages(messages as any);
      setSurfaces(Array.from(p.model.surfacesMap.values()));
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [messages]);
  if (error) return <pre style={{ color: "crimson" }}>A2UI invalide : {error}</pre>;
  return <>{surfaces.map((s) => <A2uiSurface key={s.id} surface={s} />)}</>;
}
