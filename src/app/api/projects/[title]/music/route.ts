import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import path from "path";

function sanitizeTitle(title: string): string {
  return title.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-") || "untitled";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ title: string }> }
) {
  try {
    const { title } = await params;
    const safeTitle = sanitizeTitle(title);
    const projectDir = path.join(process.cwd(), "data", "projects", safeTitle);
    const files = await readdir(projectDir);
    const musicFile = files.find(
      (f) => f.startsWith("music") && !f.endsWith(".json")
    );
    if (!musicFile) {
      return new NextResponse(null, { status: 404 });
    }
    const filePath = path.join(projectDir, musicFile);
    const buffer = await readFile(filePath);
    const ext = path.extname(musicFile).toLowerCase();
    const mime: Record<string, string> = {
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".m4a": "audio/mp4",
    };
    const contentType = mime[ext] ?? "application/octet-stream";
    return new NextResponse(buffer, {
      headers: { "Content-Type": contentType },
    });
  } catch (err) {
    return new NextResponse(null, { status: 404 });
  }
}
