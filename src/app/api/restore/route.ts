import { NextRequest, NextResponse } from "next/server";
import { getResolvedStorageRoot, ensureStorageStructure } from "@/lib/storage";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { zipData } = await request.json();
    if (!zipData) {
      return NextResponse.json({ error: "Données de fichier ZIP manquantes." }, { status: 400 });
    }

    const buffer = Buffer.from(zipData, "base64");
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    const hasConfig = entries.some((e) => e.entryName.startsWith("config/"));
    const hasStorage = entries.some((e) => e.entryName.startsWith("storage/"));

    if (!hasConfig && !hasStorage) {
      return NextResponse.json(
        { error: "L'archive fournie n'est pas une sauvegarde valide de l'application EGCSO." },
        { status: 400 }
      );
    }

    const targetConfigDir = path.resolve(process.cwd(), "config");
    const targetStorageDir = getResolvedStorageRoot();

    for (const entry of entries) {
      if (entry.isDirectory) continue;

      if (entry.entryName.startsWith("config/")) {
        const relativePath = entry.entryName.replace(/^config\//, "");
        const destPath = path.join(targetConfigDir, relativePath);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.writeFileSync(destPath, entry.getData());
      } else if (entry.entryName.startsWith("storage/")) {
        const relativePath = entry.entryName.replace(/^storage\//, "");
        const destPath = path.join(targetStorageDir, relativePath);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.writeFileSync(destPath, entry.getData());
      }
    }

    ensureStorageStructure();
    return NextResponse.json({ success: true, message: "Base de données et configurations restaurées avec succès !" });
  } catch (err: any) {
    return NextResponse.json({ error: "Impossible de restaurer la sauvegarde : " + err.message }, { status: 500 });
  }
}
