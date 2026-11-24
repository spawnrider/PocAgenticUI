// BFF : Strapi (contenu) + Unleash (flags) -> écran SDUI en messages A2UI 1.0 (forme à valider).
import Fastify from "fastify";
import cors from "@fastify/cors";
import Redis from "ioredis";
import { initialize, isEnabled } from "unleash-client";

const { STRAPI_URL, STRAPI_API_TOKEN, REDIS_URL, UNLEASH_URL, UNLEASH_ADMIN_TOKEN } = process.env;
const redis = new Redis(REDIS_URL!);
initialize({ url: UNLEASH_URL!, appName: "bff", customHeaders: { Authorization: UNLEASH_ADMIN_TOKEN! } });

type Section = { id: number; component: string; props: Record<string, unknown>; flagKey?: string };

async function loadScreen(slug: string): Promise<Section[]> {
  const key = `screen:${slug}`;
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);
  const r = await fetch(`${STRAPI_URL}/api/screens?filters[slug][$eq]=${slug}&populate=sections`,
    { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` } });
  const json: any = await r.json();
  const sections: Section[] = json.data?.[0]?.sections ?? [];
  await redis.set(key, JSON.stringify(sections), "EX", 30);
  return sections;
}

const app = Fastify();
await app.register(cors, { origin: true });

app.get<{ Params: { slug: string } }>("/screens/:slug", async (req) => {
  const sections = (await loadScreen(req.params.slug))
    .filter((s) => !s.flagKey || isEnabled(s.flagKey, { userId: "demo" }));
  const surfaceId = `screen-${req.params.slug}`;
  return [
    { version: "1.0", createSurface: { surfaceId, catalogId: "poc-catalog/v1" } },
    { version: "1.0", updateComponents: { surfaceId, components: sections.map((s) => ({ id: `s${s.id}`, component: s.component, ...s.props })) } },
  ];
});

await app.listen({ port: 4000, host: "0.0.0.0" });
