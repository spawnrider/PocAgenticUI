"use client";
import { useEffect, useState } from "react";
import { CopilotChat } from "@copilotkit/react-ui";
import { A2UIProvider, A2UIRenderer } from "@a2ui/react"; // API 1.0 à valider (docs vues : 0.x)

export default function Home() {
  const [messages, setMessages] = useState<unknown[]>([]);
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BFF_URL ?? "http://localhost:4000"}/screens/home`).then(r => r.json()).then(setMessages);
  }, []);
  return (
    <main style={{ display: "grid", gridTemplateColumns: "1fr 400px", height: "100vh" }}>
      <section style={{ padding: 16 }}>
        <h1>Accueil (SDUI via BFF)</h1>
        <A2UIProvider messages={messages as never}><A2UIRenderer surfaceId="home" /></A2UIProvider>
      </section>
      <CopilotChat labels={{ title: "Assistant" }} />
    </main>
  );
}
