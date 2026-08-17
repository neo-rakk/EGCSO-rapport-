import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getUnits } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = getUnits();
    if (data.length > 0) return NextResponse.json(data);
    return NextResponse.json({ error: "Fichier unites.json introuvable" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const unitesPath = path.resolve(process.cwd(), "config/unites.json");
    fs.writeFileSync(unitesPath, JSON.stringify(body, null, 2), "utf-8");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
