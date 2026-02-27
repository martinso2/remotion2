import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

function sanitizeTitle(title: string): string {
  return title.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-") || "untitled";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ title: string; filename: string }> }
) {
  try {
    const { title, filename } = await params;
    const safeTitle = sanitizeTitle(title);
    const safeFilename = path.basename(filename);
    const filePath = path.join(
      process.cwd(),
      "data",
      "projects",
      safeTitle,
      "media",
      safeFilename
    );
    const buffer = await readFile(filePath);
    const ext = path.extname(safeFilename).toLowerCase();
    const mime: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
    };
    const contentType = mime[ext] ?? "application/octet-stream";
    return new NextResponse(buffer, {
      headers: { "Content-Type": contentType },
    });
  } catch (err) {
    return new NextResponse(null, { status: 404 });
  }
}
