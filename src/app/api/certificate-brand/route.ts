import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { mergeCertificateBrand } from "@/lib/certificate-brand";
import {
  getCertificateBrandSettings,
  saveCertificateBrandSettings,
} from "@/lib/certificate-settings";

/** Any signed-in user can read branding (needed to render certificates). */
export async function GET() {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const brand = await getCertificateBrandSettings();
    return NextResponse.json({ brand });
  } catch (err) {
    console.error("GET /api/certificate-brand:", err);
    return NextResponse.json(
      { error: "Failed to load certificate design" },
      { status: 500 }
    );
  }
}

/** Admin only — update certificate design / signature / copy. */
export async function PUT(req: Request) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const current = await getCertificateBrandSettings();
    const next = mergeCertificateBrand({ ...current, ...body });
    const saved = await saveCertificateBrandSettings(next, user.id);
    return NextResponse.json({ brand: saved });
  } catch (err) {
    console.error("PUT /api/certificate-brand:", err);
    const msg = err instanceof Error ? err.message : "Failed to save";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
