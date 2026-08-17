import { NextRequest, NextResponse } from "next/server";
import { getCustomSheets, saveCustomSheets, getUnits } from "@/lib/storage";
import type { CustomFollowUpSheet } from "@/types";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sheets = getCustomSheets();
    return NextResponse.json(sheets);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, unitId, unitName, zone, subzone, room, occupant, sections, createNewUnit, newUnitCode, newUnitName } = body;

    if (!title || !sections || !Array.isArray(sections) || sections.length === 0) {
      return NextResponse.json(
        { error: "Veuillez fournir un titre et au moins une section avec des éléments à vérifier." },
        { status: 400 }
      );
    }

    let finalUnitId = unitId;
    let finalUnitName = unitName;

    // Handle creation of new Unit if requested
    if (createNewUnit && newUnitCode && newUnitName) {
      const units = getUnits();
      const codeUpper = newUnitCode.trim().toUpperCase();
      const nameTrim = newUnitName.trim();
      const existing = units.find((u) => u.id === codeUpper);

      if (!existing) {
        const newUnitObj = {
          id: codeUpper,
          name: nameTrim,
          zones: zone ? [{ name: zone, subzones: subzone ? [subzone] : [] }] : [],
        };
        units.push(newUnitObj);
        const unitsPath = path.resolve(process.cwd(), "config/unites.json");
        fs.writeFileSync(unitsPath, JSON.stringify(units, null, 2), "utf-8");
      }
      finalUnitId = codeUpper;
      finalUnitName = nameTrim;
    }

    const sheets = getCustomSheets();
    const newSheet: CustomFollowUpSheet = {
      id: body.id || `SHEET-${Date.now()}`,
      title: title.trim(),
      unitId: finalUnitId || "GENERAL",
      unitName: finalUnitName || "Toutes Unités",
      zone: zone || "",
      subzone: subzone || "",
      room: room || "",
      occupant: occupant || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sections: sections.map((s: any) => ({
        title: s.title ? s.title.trim() : "Section",
        items: Array.isArray(s.items) ? s.items.filter(Boolean) : [],
      })),
    };

    const existingIdx = sheets.findIndex((s) => s.id === newSheet.id);
    if (existingIdx >= 0) {
      sheets[existingIdx] = { ...sheets[existingIdx], ...newSheet, updatedAt: new Date().toISOString() };
    } else {
      sheets.unshift(newSheet);
    }

    saveCustomSheets(sheets);
    return NextResponse.json({ success: true, sheet: newSheet });
  } catch (err: any) {
    return NextResponse.json({ error: "Échec de l'enregistrement de la fiche : " + err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Identifiant de fiche manquant." }, { status: 400 });
    }

    const sheets = getCustomSheets();
    const filtered = sheets.filter((s) => s.id !== id);
    saveCustomSheets(filtered);

    return NextResponse.json({ success: true, message: "Fiche supprimée avec succès." });
  } catch (err: any) {
    return NextResponse.json({ error: "Échec de suppression : " + err.message }, { status: 500 });
  }
}
