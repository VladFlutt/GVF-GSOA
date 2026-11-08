import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { SCHEMA } from "./schema";

let sql: NeonQueryFunction<false, false> | null | undefined;
let ready: Promise<void> | null = null;

/** Neon connection from DATABASE_URL (set by Vercel's Neon integration). Null when not configured. */
export function getSql() {
  if (sql === undefined) {
    const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    sql = url ? neon(url) : null;
  }
  return sql;
}

/** Creates the tables on first use. */
export async function db() {
  const q = getSql();
  if (!q) return null;
  if (!ready) {
    ready = (async () => {
      for (const s of SCHEMA) await q(s);
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  await ready;
  return q;
}
