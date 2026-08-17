import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("logo") as File;
    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const publicDir = path.resolve(process.cwd(), "public");
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Save as icon.png and app-logo.png
    fs.writeFileSync(path.join(publicDir, "icon.png"), buffer);
    fs.writeFileSync(path.join(publicDir, "app-logo.png"), buffer);

    // Also copy into standalone public directory if present
    const standalonePublic = path.resolve(process.cwd(), ".next/standalone/public");
    if (fs.existsSync(standalonePublic)) {
      try {
        fs.writeFileSync(path.join(standalonePublic, "icon.png"), buffer);
        fs.writeFileSync(path.join(standalonePublic, "app-logo.png"), buffer);
      } catch {}
    }

    return NextResponse.json({ success: true, message: "Logo mis à jour avec succès !" });
  } catch (err: any) {
    return NextResponse.json({ error: "Erreur d'enregistrement du logo: " + err.message }, { status: 500 });
  }
}
