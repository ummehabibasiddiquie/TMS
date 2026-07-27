import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-msvideo",
]);

const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
]);

const LIMITS = {
  image: 5 * 1024 * 1024,
  video: 1024 * 1024 * 1024, // 1GB — training recordings are often larger than 200MB
  document: 25 * 1024 * 1024,
} as const;

function classify(mime: string, filename: string): keyof typeof LIMITS | null {
  if (IMAGE_TYPES.has(mime)) return "image";
  if (VIDEO_TYPES.has(mime)) return "video";
  if (DOCUMENT_TYPES.has(mime)) return "document";

  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
  if (["mp4", "webm", "ogg", "mov", "avi"].includes(ext)) return "video";
  if (["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"].includes(ext)) {
    return "document";
  }
  return null;
}

export async function POST(req: Request) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const kind = classify(file.type, file.name);
    if (!kind) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Upload an image, video (MP4/WebM), PDF, or Office document.",
        },
        { status: 400 }
      );
    }

    if (file.size > LIMITS[kind]) {
      const mb = Math.round(LIMITS[kind] / (1024 * 1024));
      return NextResponse.json(
        { error: `File size exceeds ${mb}MB limit for ${kind}s.` },
        { status: 400 }
      );
    }

    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "bin";
    const uniqueFilename = `${randomUUID()}.${fileExtension}`;
    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    const filePath = join(uploadDir, uniqueFilename);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const fileUrl = `/uploads/${uniqueFilename}`;
    return NextResponse.json({
      url: fileUrl,
      filename: uniqueFilename,
      originalName: file.name,
      kind,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
