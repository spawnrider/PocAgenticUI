"use client";
import { useContext } from "react";
import { DecisionContext } from "./decision";
import { z } from "zod";
import { Catalog, CommonSchemas } from "@a2ui/web_core/v0_9";
import { createComponentImplementation } from "@a2ui/react/v0_9";

export const CATALOG_ID = "poc/design-catalog/v1";


const box: React.CSSProperties = { border: "1px solid #d0d7de", borderRadius: 8, padding: 12, margin: "8px 0", background: "#fff" };

export const Column = createComponentImplementation(
  { name: "Column", schema: z.object({ children: CommonSchemas.ChildList }) },
  ({ props, buildChild }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {(props.children ?? []).map((c: any, i: number) => buildChild(typeof c === "string" ? c : c.id, i as any))}
    </div>
  ),
);

export const Text = createComponentImplementation(
  { name: "Text", schema: z.object({ text: CommonSchemas.DynamicString }) },
  ({ props }) => <p style={{ margin: 0 }}>{props.text}</p>,
);

export const Banner = createComponentImplementation(
  { name: "Banner", schema: z.object({ title: CommonSchemas.DynamicString, body: CommonSchemas.DynamicString }) },
  ({ props }) => (
    <div data-testid="banner" style={{ ...box, background: "#fff8c5", borderColor: "#d4a72c" }}>
      <strong>{props.title}</strong>
      <div>{props.body}</div>
    </div>
  ),
);

export const CustomerCard = createComponentImplementation(
  { name: "CustomerCard", schema: z.object({ name: CommonSchemas.DynamicString, email: CommonSchemas.DynamicString, tier: CommonSchemas.DynamicString }) },
  ({ props }) => (
    <div data-testid="customer-card" style={box}>
      <strong>{props.name}</strong> <span style={{ float: "right" }}>{props.tier}</span>
      <div>{props.email}</div>
    </div>
  ),
);

export const ConfirmAction = createComponentImplementation(
  {
    name: "ConfirmAction",
    schema: z.object({ actionId: z.string(), summary: CommonSchemas.DynamicString, confirmLabel: CommonSchemas.DynamicString, cancelLabel: CommonSchemas.DynamicString }),
  },
  ({ props }) => {
    const { decide, decided } = useContext(DecisionContext);
    const done = decided[props.actionId as string];
    return (
      <div data-testid="confirm-action" style={{ ...box, borderColor: "#cf222e" }}>
        <div>{props.summary}</div>
        {done ? (
          <em>{done === "CONFIRM" ? "Confirmé" : "Annulé"}</em>
        ) : (
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={() => decide(props.actionId as string, "CONFIRM")}>{props.confirmLabel}</button>
            <button onClick={() => decide(props.actionId as string, "CANCEL")}>{props.cancelLabel}</button>
          </div>
        )}
      </div>
    );
  },
);

export const catalog = new Catalog(CATALOG_ID, "v0.9", [Column, Text, Banner, CustomerCard, ConfirmAction] as any, []);
