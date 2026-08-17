import { NextResponse } from "next/server";
import { getResolvedStorageRoot, ensureStorageStructure } from "@/lib/storage";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const zip = new AdmZip();
    const configPath = path.resolve(process.cwd(), "config");
    if (fs.existsSync(configPath)) {
      zip.addLocalFolder(configPath, "config");
    }
    const storageRoot = getResolvedStorageRoot();
    if (fs.existsSync(storageRoot)) {
      zip.addLocalFolder(storageRoot, "storage");
    }
    const buffer = zip.toBuffer();
    const dateStr = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Disposition": `attachment; filename=egcso_sauvegarde_${dateStr}.zip`,
        "Content-Type": "application/zip",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Impossible de créer la sauvegarde : " + err.message }, { status: 500 });
  }
}
