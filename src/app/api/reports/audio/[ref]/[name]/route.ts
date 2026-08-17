import { NextRequest, NextResponse } from "next/server";
import { readDatabase, getResolvedStorageRoot } from "@/lib/storage";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ ref: string; name: string }> }) {
  const { ref, name } = await params;
  const db = readDatabase();
  const report = db.reports.find((r) => r.reference === ref);

  if (!report || !report.folderPath) {
    return NextResponse.json({ error: "Rapport introuvable" }, { status: 404 });
  }

  const root = getResolvedStorageRoot();
  const audioPath = path.join(root, report.folderPath, "audio", name);

  if (fs.existsSync(audioPath)) {
    const buffer = fs.readFileSync(audioPath);
    const ext = name.split(".").pop()?.toLowerCase();
    const contentType = ext === "mp3" ? "audio/mpeg" : ext === "wav" ? "audio/wav" : ext === "ogg" ? "audio/ogg" : "audio/webm";
    return new NextResponse(buffer, { headers: { "Content-Type": contentType } });
  }
  return NextResponse.json({ error: "Note vocale introuvable" }, { status: 404 });
}
