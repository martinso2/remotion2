import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const TRANSFORMS_PATH = path.join(DATA_DIR, "transforms.json");

type Transform = { position: string; scale: number };

export async function GET() {
  try {
    const data = await readFile(TRANSFORMS_PATH, "utf-8");
    const transforms = JSON.parse(data) as Transform[];
    return NextResponse.json(transforms);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json([]);
    }
    console.error("Transforms read error:", err);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const transforms = (await request.json()) as Transform[];
    if (!Array.isArray(transforms)) {
      return NextResponse.json({ error: "Expected array" }, { status: 400 });
    }
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(TRANSFORMS_PATH, JSON.stringify(transforms, null, 2));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Transforms write error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save transforms" },
      { status: 500 }
    );
  }
}
