import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/** GET: all completed steps of the signed-in learner. POST: record a completed step or a quiz attempt. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = (await db())!;
  const rows = await q`select course_id, step_key from step_progress where user_id = ${user.id}`;
  return NextResponse.json({ rows });
}

const KEY = /^[a-z0-9-]{1,64}(\/[a-z0-9-]{1,64})?$/;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { courseId, stepKey, kind, passed } = body as { courseId?: string; stepKey?: string; kind?: string; passed?: boolean };
  if (!courseId || !stepKey || !KEY.test(courseId) || !KEY.test(stepKey)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const q = (await db())!;
  if (kind === "done") {
    await q`insert into step_progress (user_id, course_id, step_key) values (${user.id}, ${courseId}, ${stepKey}) on conflict do nothing`;
  } else if (kind === "attempt" && typeof passed === "boolean") {
    await q`insert into quiz_attempts (user_id, course_id, step_key, passed) values (${user.id}, ${courseId}, ${stepKey}, ${passed})`;
  } else {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
