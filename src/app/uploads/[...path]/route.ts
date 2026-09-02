import { readFile, stat } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { mimeForUploadFilename, resolveUploadFilePath } from "@/lib/upload-files";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: { path: string[] } }
) {
  const filePath = resolveUploadFilePath(context.params.path);
  if (!filePath) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) {
      return new NextResponse("Not found", { status: 404 });
    }

    const data = await readFile(filePath);
    const filename = context.params.path[context.params.path.length - 1] ?? "file";

    return new NextResponse(data, {
      headers: {
        "Content-Type": mimeForUploadFilename(filename),
        "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
