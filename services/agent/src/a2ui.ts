// Surfaces A2UI v0.9 émises par l'agent (catalogue poc/design-catalog/v1).
export const CATALOG_ID = "poc/design-catalog/v1";
const V = "v0.9";

export const customerCardSurface = (c: { name: string; email: string; tier: string }) => [
  { version: V, createSurface: { surfaceId: "customer", catalogId: CATALOG_ID } },
  { version: V, updateComponents: { surfaceId: "customer", components: [{ id: "root", component: "CustomerCard", name: c.name, email: c.email, tier: c.tier }] } },
];

export const confirmSurface = (actionId: string, summary: string) => [
  { version: V, createSurface: { surfaceId: `confirm-${actionId}`, catalogId: CATALOG_ID } },
  { version: V, updateComponents: { surfaceId: `confirm-${actionId}`, components: [
    { id: "root", component: "ConfirmAction", actionId, summary, confirmLabel: "Confirmer", cancelLabel: "Annuler" } ] } },
];
