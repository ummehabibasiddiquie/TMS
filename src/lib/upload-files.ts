import { join, resolve } from "path";

export const UPLOAD_ROOT = join(process.cwd(), "public", "uploads");

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  ogg: "video/ogg",
  mov: "video/quicktime",
};

export function resolveUploadFilePath(segments: string[]): string | null {
  if (!segments.length || segments.some((s) => !s || s === "." || s === ".." || s.includes("\0"))) {
    return null;
  }

  const filePath = resolve(UPLOAD_ROOT, ...segments);
  if (!filePath.startsWith(resolve(UPLOAD_ROOT))) return null;
  return filePath;
}

export function mimeForUploadFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME[ext] ?? "application/octet-stream";
}

export function resolveMediaUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  return `/${trimmed}`;
}
