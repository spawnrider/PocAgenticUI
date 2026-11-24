import "@copilotkit/react-ui/styles.css";
import { redirect } from "next/navigation";
import { auth } from "../auth";
import { CopilotKit } from "@copilotkit/react-core";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/api/auth/signin?callbackUrl=/");
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui" }}>
        {/* Pas de middleware A2UI intégré de CopilotKit (0.9) : le rendu passe par @a2ui/react (A2uiView). */}
        <CopilotKit runtimeUrl="/api/copilotkit" agent="assistant">{children}</CopilotKit>
      </body>
    </html>
  );
}
