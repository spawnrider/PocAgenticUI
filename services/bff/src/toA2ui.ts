// Strapi sections -> messages A2UI v0.9 (le renderer @a2ui/react installé ne parle que v0.9 / v0.8).
export const CATALOG_ID = "poc/design-catalog/v1";
export const A2UI_VERSION = "v0.9";

export type Section = { __component: string; title?: string; body?: string; text?: string; flagKey?: string | null };

export function filterSections(sections: Section[], isEnabled: (flagKey: string) => boolean): Section[] {
  return sections.filter((s) => !s.flagKey || isEnabled(s.flagKey));
}

export function toA2ui(slug: string, sections: Section[]) {
  const surfaceId = slug;
  const children = sections.map((s, i) => {
    const id = `s${i}`;
    return s.__component === "sections.banner"
      ? { id, component: "Banner", title: s.title ?? "", body: s.body ?? "" }
      : { id, component: "Text", text: s.text ?? "" };
  });
  return [
    { version: A2UI_VERSION, createSurface: { surfaceId, catalogId: CATALOG_ID } },
    {
      version: A2UI_VERSION,
      updateComponents: {
        surfaceId,
        components: [{ id: "root", component: "Column", children: children.map((c) => c.id) }, ...children],
      },
    },
  ];
}
