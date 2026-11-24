import "@copilotkit/react-ui/styles.css";
import { CopilotKit } from "@copilotkit/react-core";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (<html lang="fr"><body>
    {/* Désactiver le middleware A2UI intégré (parle 0.9) : le rendu passe par @a2ui/react. */}
    <CopilotKit runtimeUrl="/api/copilotkit" agent="assistant">{children}</CopilotKit>
  </body></html>);
}
