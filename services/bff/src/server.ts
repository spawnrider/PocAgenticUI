import express from "express";
import cors from "cors";
import { initialize } from "unleash-client";
import { Redis } from "ioredis";
import { filterSections, toA2ui, type Section } from "./toA2ui.js";

const { STRAPI_URL, STRAPI_API_TOKEN, REDIS_URL, UNLEASH_URL, UNLEASH_CLIENT_TOKEN } = process.env;
const unleash = initialize({ url: UNLEASH_URL!, appName: "bff", customHeaders: { Authorization: UNLEASH_CLIENT_TOKEN ?? "" } });
const redis = new Redis(REDIS_URL!);

// Cache 30 s par slug : contenu brut Strapi, indépendant de l'utilisateur. Le filtrage par flag se fait APRÈS.
async function loadSections(slug: string): Promise<Section[] | null> {
  const key = `screen:${slug}`;
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);
  const url = `${STRAPI_URL}/api/screens?filters[slug][$eq]=${encodeURIComponent(slug)}&populate[sections][populate]=*`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` } });
  if (!r.ok) throw new Error(`strapi ${r.status}`);
  const json: any = await r.json();
  const screen = json.data?.[0];
  if (!screen) return null;
  const sections: Section[] = screen.sections ?? [];
  await redis.set(key, JSON.stringify(sections), "EX", 30);
  return sections;
}

const app = express();
app.use(cors());
app.get("/screens/:slug", async (req, res) => {
  try {
    const sections = await loadSections(req.params.slug);
    if (!sections) { res.status(404).json({ error: "screen not found" }); return; }
    const ctx = { userId: String(req.query.userId ?? "") };
    res.json(toA2ui(req.params.slug, filterSections(sections, (k) => unleash.isEnabled(k, ctx))));
  } catch (e) {
    res.status(502).json({ error: String(e) });
  }
});
app.get("/healthz", (_q, r) => { r.send("ok"); });
app.listen(Number(process.env.PORT ?? 4000), () => console.log("bff up"));
