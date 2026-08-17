import { NextResponse } from "next/server";
import { getResolvedStorageRoot, writeDatabase, ensureStorageStructure } from "@/lib/storage";
import fs from "fs";
import path from "path";
import type { Report } from "@/types";

export const dynamic = "force-dynamic";

export async function POST() {
  const root = getResolvedStorageRoot();
  const reportsDir = path.join(root, "reports");

  if (!fs.existsSync(reportsDir)) {
    return NextResponse.json({ success: true, count: 0, message: "Dossier de rapports vide" });
  }

  const foundReports: Report[] = [];

  function scanDir(dir: string) {
    const files = fs.readdirSync(dir);

    if (files.includes("metadata.json")) {
      try {
        const metadataPath = path.join(dir, "metadata.json");
        const report = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
        const relative = path.relative(root, dir);
        report.folderPath = relative;
        foundReports.push(report);
      } catch (err) {
        console.error(`Error reading metadata in ${dir}:`, err);
      }
      return;
    }

    files.forEach((file) => {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        scanDir(fullPath);
      }
    });
  }

  try {
    scanDir(reportsDir);
    writeDatabase({ reports: foundReports });
    return NextResponse.json({
      success: true,
      count: foundReports.length,
      message: `Index reconstruit avec succès : ${foundReports.length} rapports indexés.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Échec de la reconstruction de l'index : " + err.message }, { status: 500 });
  }
}
