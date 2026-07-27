import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { listHrmsProjects } from "@/lib/hrms";

/** Read-only HRMS project list (no local create/edit/delete). */
export async function GET(req: Request) {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("activeOnly") !== "false";

  const result = await listHrmsProjects({ activeOnly });
  return NextResponse.json(result);
}
