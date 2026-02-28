import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const MEDIA_DIR = path.join(process.cwd(), "data", "media");

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hashExt: string }> }
) {
  try {
    const { hashExt } = await params;
    const safe = path.basename(hashExt).replace(/[^a-zA-Z0-9._-]/g, "");
    if (!safe || !safe.includes(".")) return new NextResponse(null, { status: 404 });
    const filePath = path.join(MEDIA_DIR, safe);
    const buffer = await readFile(filePath);
    const ext = path.extname(safe).toLowerCase();
    const contentType = MIME[ext] ?? "application/octet-stream";
    return new NextResponse(buffer, {
      headers: { "Content-Type": contentType },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
