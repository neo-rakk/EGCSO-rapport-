import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getCategories } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = getCategories();
    if (data.length > 0) return NextResponse.json(data);
    return NextResponse.json({ error: "Fichier categories_pannes.json introuvable" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const categoriesPath = path.resolve(process.cwd(), "config/categories_pannes.json");
    fs.writeFileSync(categoriesPath, JSON.stringify(body, null, 2), "utf-8");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
