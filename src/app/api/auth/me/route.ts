import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getSql } from "@/lib/db";

export async function GET() {
  if (!getSql()) return NextResponse.json({ enabled: false, user: null });
  const user = await currentUser();
  return NextResponse.json({ enabled: true, user: user && { email: user.email, role: user.role } });
}
