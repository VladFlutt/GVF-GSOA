import { NextResponse } from "next/server";
import { login, validCredentials } from "@/lib/auth";
import { getSql } from "@/lib/db";

export async function POST(req: Request) {
  if (!getSql()) return NextResponse.json({ error: "disabled" }, { status: 503 });
  const { email, password } = await req.json().catch(() => ({}));
  if (!validCredentials(email, password)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const user = await login(email, password);
  if (!user) return NextResponse.json({ error: "wrong" }, { status: 401 });
  return NextResponse.json({ user: { email: user.email, role: user.role } });
}
