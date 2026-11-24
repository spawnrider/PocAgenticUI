import pg from "pg";
import { config } from "./config.js";

// Actions d'écriture en attente de confirmation. L'état vit côté serveur : l'écriture n'est exécutée que si
// l'utilisateur authentifié a confirmé exactement cette action (décision reçue hors LLM, via le message CONFIRM:<id>).
export type Pending = { id: string; threadId: string; userId: string; tool: string; args: Record<string, unknown>; status: "pending" | "confirmed" | "cancelled" | "consumed" };

export interface ActionStore {
  create(p: Omit<Pending, "status">): Promise<void>;
  decide(id: string, userId: string, threadId: string, decision: "confirmed" | "cancelled"): Promise<boolean>;
  consume(threadId: string, userId: string, tool: string, args: Record<string, unknown>): Promise<boolean>;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export class MemoryStore implements ActionStore {
  rows = new Map<string, Pending>();
  async create(p: Omit<Pending, "status">) { this.rows.set(p.id, { ...p, status: "pending" }); }
  async decide(id: string, userId: string, threadId: string, d: "confirmed" | "cancelled") {
    const r = this.rows.get(id);
    if (!r || r.userId !== userId || r.threadId !== threadId || r.status !== "pending") return false;
    r.status = d; return true;
  }
  async consume(threadId: string, userId: string, tool: string, args: Record<string, unknown>) {
    for (const r of this.rows.values())
      if (r.status === "confirmed" && r.threadId === threadId && r.userId === userId && r.tool === tool && same(r.args, args)) { r.status = "consumed"; return true; }
    return false;
  }
}

export class PgStore implements ActionStore {
  private pool = new pg.Pool({ connectionString: config.databaseUrl });
  private ready = this.pool.query(`CREATE TABLE IF NOT EXISTS pending_actions (
    id text PRIMARY KEY, thread_id text NOT NULL, user_id text NOT NULL, tool text NOT NULL, args jsonb NOT NULL,
    status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now())`);
  async create(p: Omit<Pending, "status">) {
    await this.ready;
    await this.pool.query("INSERT INTO pending_actions(id,thread_id,user_id,tool,args) VALUES($1,$2,$3,$4,$5)", [p.id, p.threadId, p.userId, p.tool, JSON.stringify(p.args)]);
  }
  async decide(id: string, userId: string, threadId: string, d: "confirmed" | "cancelled") {
    await this.ready;
    const r = await this.pool.query("UPDATE pending_actions SET status=$1 WHERE id=$2 AND user_id=$3 AND thread_id=$4 AND status='pending'", [d, id, userId, threadId]);
    return (r.rowCount ?? 0) > 0;
  }
  async consume(threadId: string, userId: string, tool: string, args: Record<string, unknown>) {
    await this.ready;
    const r = await this.pool.query(
      "UPDATE pending_actions SET status='consumed' WHERE id=(SELECT id FROM pending_actions WHERE thread_id=$1 AND user_id=$2 AND tool=$3 AND args=$4::jsonb AND status='confirmed' LIMIT 1)",
      [threadId, userId, tool, JSON.stringify(args)]);
    return (r.rowCount ?? 0) > 0;
  }
}
