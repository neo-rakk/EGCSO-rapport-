import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSettings, ensureStorageStructure } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getSettings());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const settingsPath = path.resolve(process.cwd(), "config/settings.json");
    const current = getSettings();
    const updated = { ...current, ...body };

    const parentDir = path.dirname(settingsPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(settingsPath, JSON.stringify(updated, null, 2), "utf-8");
    ensureStorageStructure();
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Impossible de sauvegarder les paramètres: " + err.message },
      { status: 500 }
    );
  }
}
