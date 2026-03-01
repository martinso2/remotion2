import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
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
    const projectJsonPath = path.join(projectDir, "project.json");
    const projectRaw = await readFile(projectJsonPath, "utf-8");
    const project = JSON.parse(projectRaw) as {
      musicSavedPath?: string | null;
      musicFileName?: string | null;
    };

    const relativeMusicPath = project.musicSavedPath
      ? project.musicSavedPath
      : project.musicFileName
        ? `music/${project.musicFileName}`
        : null;
    if (!relativeMusicPath) {
      return new NextResponse(null, { status: 404 });
    }
    const filePath = path.join(projectDir, relativeMusicPath);
    const buffer = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
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
