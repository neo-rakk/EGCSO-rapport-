import { NextRequest, NextResponse } from "next/server";
import { readDatabase, getResolvedStorageRoot } from "@/lib/storage";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = readDatabase();
  const report = db.reports.find((r) => r.id === id);

  if (!report || !report.folderPath) {
    return NextResponse.json({ error: "Rapport introuvable" }, { status: 404 });
  }

  const root = getResolvedStorageRoot();
  const htmlPath = path.join(root, report.folderPath, "rapport.html");

  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, "utf-8");
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  return NextResponse.json({ error: "Fichier HTML de rapport introuvable" }, { status: 404 });
}
