import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

/** Clears the session cookie. Middleware already requires a session cookie for this path. */
export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
