import { NextRequest, NextResponse } from "next/server";
import { readDatabase } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = readDatabase();
  const original = db.reports.find((r) => r.id === id);

  if (!original) {
    return NextResponse.json({ error: "Rapport d'origine introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    ...original,
    reference: "(Copie)",
    id: undefined,
    createdAt: new Date().toISOString(),
    isValidated: false,
    status: "Ouvert",
  });
}
