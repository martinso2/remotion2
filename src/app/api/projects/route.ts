import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readdir, readFile } from "fs/promises";
import { createHash } from "crypto";
import path from "path";

function sanitizeTitle(title: string): string {
  return title.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-") || "untitled";
}

const PROJECTS_DIR = path.join(process.cwd(), "data", "projects");
const MEDIA_DIR = path.join(process.cwd(), "data", "media");

function hashBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex").slice(0, 16);
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
    await mkdir(projectDir, { recursive: true });
    await mkdir(MEDIA_DIR, { recursive: true });

    const mediaHashKeys: string[] = [];
    const seenHashes = new Set<string>();

    for (let i = 0; i < mediaItems.length; i++) {
      const file = formData.get(`media-${i}`) as File | null;
      if (file) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const hash = hashBuffer(buffer);
        const ext = path.extname(mediaItems[i]?.fileName ?? "") || (mediaItems[i]?.type === "video" ? ".mp4" : ".jpg");
        const hashKey = `${hash}${ext}`;
        const mediaPath = path.join(MEDIA_DIR, hashKey);
        if (!seenHashes.has(hashKey)) {
          try {
            await writeFile(mediaPath, buffer, { flag: "wx" });
          } catch (e) {
            if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
          }
          seenHashes.add(hashKey);
        }
        mediaHashKeys.push(hashKey);
      }
    }

    let musicHashKey: string | null = null;
    if (musicFile && musicFile.size > 0) {
      const bytes = await musicFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const hash = hashBuffer(buffer);
      const ext = path.extname(musicFileName) || ".mp3";
      musicHashKey = `${hash}${ext}`;
      const musicPath = path.join(MEDIA_DIR, musicHashKey);
      try {
        await writeFile(musicPath, buffer, { flag: "wx" });
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      }
    }

    const projectJson = {
      title: safeTitle,
      platform,
      durationOption,
      fitToMusic,
      imagePositions,
      mediaItems: mediaItems.map((item: { order: number; type: string; durationInFrames: number; fileName: string; objectPosition: string }, i: number) => ({
        ...item,
        hashKey: mediaHashKeys[i] ?? null,
      })),
      musicFileName: musicFile ? musicFileName : null,
      musicDuration: musicFile ? musicDuration : null,
      musicHashKey,
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
