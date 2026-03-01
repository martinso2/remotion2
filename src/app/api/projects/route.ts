import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readdir, readFile, rm } from "fs/promises";
import path from "path";

function sanitizeTitle(title: string): string {
  return title.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-") || "untitled";
}

const PROJECTS_DIR = path.join(process.cwd(), "data", "projects");
function sanitizeFileName(name: string): string {
  const base = path.basename(name).trim();
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return cleaned || "file";
}

function uniqueFileName(
  requestedName: string,
  used: Set<string>
): string {
  const safeName = sanitizeFileName(requestedName);
  if (!used.has(safeName)) {
    used.add(safeName);
    return safeName;
  }

  const ext = path.extname(safeName);
  const stem = ext ? safeName.slice(0, -ext.length) : safeName;
  let n = 2;
  let candidate = `${stem}-${n}${ext}`;
  while (used.has(candidate)) {
    n++;
    candidate = `${stem}-${n}${ext}`;
  }
  used.add(candidate);
  return candidate;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title");
  try {
    if (title) {
      const projectDir = path.join(PROJECTS_DIR, sanitizeTitle(title));
      const projectPath = path.join(projectDir, "project.json");
      const data = await readFile(projectPath, "utf-8");
      const project = JSON.parse(data);
      return NextResponse.json(project);
    }
    const entries = await readdir(PROJECTS_DIR, { withFileTypes: true });
    const projects = entries
      .filter((e) => e.isDirectory())
      .map((e) => ({ title: e.name }));
    return NextResponse.json(projects);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      if (title) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      return NextResponse.json([]);
    }
    if (title && (err as Error).message?.includes("JSON")) {
      return NextResponse.json({ error: "Invalid project file" }, { status: 400 });
    }
    console.error("Project list error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load projects" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim();
  if (!title) {
    return NextResponse.json({ error: "Project title is required" }, { status: 400 });
  }

  const safeTitle = sanitizeTitle(title);
  const projectDir = path.join(PROJECTS_DIR, safeTitle);
  const projectPath = path.join(projectDir, "project.json");

  try {
    await readFile(projectPath, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete project" },
      { status: 500 }
    );
  }

  try {
    await rm(projectDir, { recursive: true, force: true });
    return NextResponse.json({ ok: true, title: safeTitle });
  } catch (err) {
    console.error("Project delete error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete project" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const title = (formData.get("title") as string)?.trim() || "untitled";
    const platform = (formData.get("platform") as string) || "tiktok";
    const durationOption = (formData.get("durationOption") as string) || "90";
    const fitToMusic = formData.get("fitToMusic") === "true";
    const imagePositions = JSON.parse(
      (formData.get("imagePositions") as string) || "[]"
    );
    const imageScales = JSON.parse(
      (formData.get("imageScales") as string) || "[]"
    );
    const mediaItems = JSON.parse(
      (formData.get("mediaItems") as string) || "[]"
    );
    const musicFile = formData.get("musicFile") as File | null;
    const musicDuration = parseFloat(
      (formData.get("musicDuration") as string) || "0"
    );
    const musicFileName = (formData.get("musicFileName") as string) || "";

    const safeTitle = sanitizeTitle(title);
    const projectDir = path.join(PROJECTS_DIR, safeTitle);
    const mediaDir = path.join(projectDir, "media");
    const musicDir = path.join(projectDir, "music");
    await mkdir(projectDir, { recursive: true });
    await mkdir(mediaDir, { recursive: true });
    await mkdir(musicDir, { recursive: true });

    const usedMediaNames = new Set<string>();
    const savedMediaItems = [];

    for (let i = 0; i < mediaItems.length; i++) {
      const file = formData.get(`media-${i}`) as File | null;
      if (file) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const item = mediaItems[i] as {
          order?: number;
          type?: "image" | "video";
          durationInFrames?: number;
          fileName?: string;
          objectPosition?: string;
        };
        const ext =
          path.extname(item?.fileName ?? file.name) ||
          (item?.type === "video" ? ".mp4" : ".jpg");
        const requestedName = item?.fileName ?? file.name ?? `media-${i}${ext}`;
        const fileName = uniqueFileName(requestedName, usedMediaNames);
        const mediaPath = path.join(mediaDir, fileName);
        await writeFile(mediaPath, buffer);
        savedMediaItems.push({
          ...item,
          fileName,
          savedPath: `media/${fileName}`,
          hashKey: null,
        });
      }
    }

    let musicSavedPath: string | null = null;
    let savedMusicFileName: string | null = null;
    if (musicFile && musicFile.size > 0) {
      const bytes = await musicFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = path.extname(musicFileName || musicFile.name) || ".mp3";
      const requestedName = musicFileName || musicFile.name || `music${ext}`;
      const fileName = sanitizeFileName(requestedName);
      const musicPath = path.join(musicDir, fileName);
      await writeFile(musicPath, buffer);
      musicSavedPath = `music/${fileName}`;
      savedMusicFileName = fileName;
    }

    const projectJson = {
      title: safeTitle,
      platform,
      durationOption,
      fitToMusic,
      imagePositions,
      imageScales,
      mediaItems: savedMediaItems,
      musicFileName: savedMusicFileName,
      musicDuration: musicFile ? musicDuration : null,
      musicSavedPath,
      musicHashKey: null,
      savedAt: new Date().toISOString(),
    };

    const projectPath = path.join(projectDir, "project.json");
    await writeFile(projectPath, JSON.stringify(projectJson, null, 2));

    return NextResponse.json({
      ok: true,
      path: `data/projects/${safeTitle}`,
    });
  } catch (err) {
    console.error("Project save error:", err);
    const code = (err as NodeJS.ErrnoException).code;
    const message =
      code === "ENOSPC"
        ? "No space left on device. Free up disk space and try again."
        : err instanceof Error
          ? err.message
          : "Failed to save project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
