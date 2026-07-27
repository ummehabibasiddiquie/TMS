import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const CONTENT_TYPES = ["VIDEO", "PDF", "SOP", "PPRT", "DOCUMENT"] as const;

const TYPE_LABELS: Record<string, string> = {
  VIDEO: "Video",
  PDF: "PDF",
  SOP: "SOP",
  PPRT: "PPRT",
  DOCUMENT: "Document",
};

export async function POST(req: Request) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId, title, contentType, contentUrl, contentBody, durationSec } =
    await req.json();

  if (!lessonId) {
    return NextResponse.json({ error: "lessonId required" }, { status: 400 });
  }

  const type = CONTENT_TYPES.includes(contentType) ? contentType : "DOCUMENT";
  const count = await prisma.topic.count({ where: { lessonId } });
  const label = TYPE_LABELS[type] ?? "Content";
  const autoTitle = title?.trim() || (count === 0 ? label : `${label} ${count + 1}`);

  const topic = await prisma.topic.create({
    data: {
      lessonId,
      title: autoTitle,
      contentType: type,
      contentUrl: contentUrl?.trim() || null,
      contentBody: contentBody?.trim() || null,
      durationSec: durationSec ?? null,
      order: count,
    },
  });
  return NextResponse.json({ topic });
}
