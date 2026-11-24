import { describe, expect, it } from "vitest";
import { filterSections, toA2ui, type Section } from "./toA2ui.js";

const sections: Section[] = [
  { __component: "sections.banner", title: "Offre", body: "-20%", flagKey: "screen.home.offer-banner" },
  { __component: "sections.text", text: "Bonjour", flagKey: null },
];

describe("toA2ui", () => {
  it("émet createSurface puis updateComponents avec un root Column", () => {
    const [create, update] = toA2ui("home", sections) as any[];
    expect(create).toEqual({ version: "v0.9", createSurface: { surfaceId: "home", catalogId: "poc/design-catalog/v1" } });
    const comps = update.updateComponents.components;
    expect(comps[0]).toEqual({ id: "root", component: "Column", children: ["s0", "s1"] });
    expect(comps[1]).toEqual({ id: "s0", component: "Banner", title: "Offre", body: "-20%" });
    expect(comps[2]).toEqual({ id: "s1", component: "Text", text: "Bonjour" });
  });
  it("ids uniques", () => {
    const comps = (toA2ui("home", sections)[1] as any).updateComponents.components;
    expect(new Set(comps.map((c: any) => c.id)).size).toBe(comps.length);
  });
});

describe("filterSections", () => {
  it("omet la section dont le flag est désactivé", () => {
    expect(filterSections(sections, () => false)).toHaveLength(1);
    expect(filterSections(sections, () => true)).toHaveLength(2);
  });
});
