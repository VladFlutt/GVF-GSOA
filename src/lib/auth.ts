import "server-only";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "./db";

const COOKIE = "gvf_session";
const DAYS = 30;

export type User = { id: string; email: string; role: "learner" | "admin" };

const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);
const hash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export function validCredentials(email: unknown, password: unknown): email is string {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 && typeof password === "string" && password.length >= 8 && password.length <= 200;
}

async function startSession(userId: string) {
  const q = (await db())!;
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + DAYS * 86400_000);
  await q`insert into sessions (token_hash, user_id, expires_at) values (${hash(token)}, ${userId}, ${expires})`;
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires });
}

export async function register(email: string, password: string): Promise<User | "exists"> {
  const q = (await db())!;
  const passwordHash = await bcrypt.hash(password, 10);
  const rows = (await q`insert into users (email, password_hash) values (${email.toLowerCase()}, ${passwordHash})
    on conflict (email) do nothing returning id, email, role`) as User[];
  if (!rows[0]) return "exists";
  await startSession(rows[0].id);
  return rows[0];
}

export async function login(email: string, password: string): Promise<User | null> {
  const q = (await db())!;
  const rows = (await q`select id, email, role, password_hash from users where email = ${email.toLowerCase()}`) as (User & { password_hash: string })[];
  const u = rows[0];
  // Compare against a dummy hash when the user is unknown so timing does not reveal registered emails.
  const ok = await bcrypt.compare(password, u?.password_hash ?? DUMMY_HASH);
  if (!u || !ok) return null;
  await startSession(u.id);
  return { id: u.id, email: u.email, role: u.role };
}

export async function currentUser(): Promise<User | null> {
  const q = await db();
  const token = (await cookies()).get(COOKIE)?.value;
  if (!q || !token) return null;
  const rows = (await q`select u.id, u.email, u.role from sessions s join users u on u.id = s.user_id
    where s.token_hash = ${hash(token)} and s.expires_at > now()`) as User[];
  return rows[0] ?? null;
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  const q = await db();
  if (q && token) await q`delete from sessions where token_hash = ${hash(token)}`;
  jar.delete(COOKIE);
}
