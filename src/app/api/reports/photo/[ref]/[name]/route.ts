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
  const photoPath = path.join(root, report.folderPath, "photos", name);

  if (fs.existsSync(photoPath)) {
    const buffer = fs.readFileSync(photoPath);
    const ext = name.split(".").pop()?.toLowerCase();
    const contentType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "application/octet-stream";
    return new NextResponse(buffer, { headers: { "Content-Type": contentType } });
  }
  return NextResponse.json({ error: "Photo introuvable" }, { status: 404 });
}
