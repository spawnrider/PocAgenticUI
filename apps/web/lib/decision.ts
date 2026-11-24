"use client";
import { createContext } from "react";

// Décision utilisateur sur ConfirmAction -> renvoyée à l'agent par la page (message "CONFIRM:<id>" / "CANCEL:<id>").
export const DecisionContext = createContext<{ decide: (actionId: string, d: "CONFIRM" | "CANCEL") => void; decided: Record<string, string> }>({
  decide: () => {},
  decided: {},
});
