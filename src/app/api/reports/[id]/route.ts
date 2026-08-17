import { NextRequest, NextResponse } from "next/server";
import { readDatabase, writeDatabase, acquireDbMutex, getSettings, getResolvedStorageRoot, ensureStorageStructure } from "@/lib/storage";
import { generateReportHTML } from "@/lib/report-html";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = readDatabase();
  const report = db.reports.find((r) => r.id === id);
  if (report) {
    return NextResponse.json(report);
  }
  return NextResponse.json({ error: "Rapport introuvable" }, { status: 404 });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const release = await acquireDbMutex();
  try {
    const { id } = await params;
    const db = readDatabase();
    const settings = getSettings();
    const body = await request.json();

    const reportIdx = db.reports.findIndex((r) => r.id === id);
    if (reportIdx === -1) {
      return NextResponse.json({ error: "Rapport introuvable" }, { status: 404 });
    }

    const existingReport = db.reports[reportIdx];
    const fullFolderPath = path.join(getResolvedStorageRoot(), existingReport.folderPath || "");

    // Process photos
    const savedPhotos: any[] = [];
    if (body.photos && Array.isArray(body.photos)) {
      body.photos.forEach((photo: any, index: number) => {
        if (photo.data && photo.data.includes("base64,")) {
          const mimeParts = photo.data.split(";");
          const ext = mimeParts[0].split("/")[1] || "png";
          const cleanBase64 = photo.data.split("base64,")[1];
          const fileName = `${photo.phase}_photo_new_${index + 1}.${ext}`;
          const photosDir = path.join(fullFolderPath, "photos");
          if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });
          const photoPath = path.join(photosDir, fileName);
          fs.writeFileSync(photoPath, Buffer.from(cleanBase64, "base64"));
          savedPhotos.push({ name: fileName, phase: photo.phase, url: `/api/reports/photo/${existingReport.reference}/${fileName}` });
        } else {
          savedPhotos.push({ name: photo.name, phase: photo.phase, url: photo.url || `/api/reports/photo/${existingReport.reference}/${photo.name}` });
        }
      });
    }

    // Process audio notes
    const savedAudioNotes: any[] = [];
    if (body.audioNotes && Array.isArray(body.audioNotes)) {
      body.audioNotes.forEach((audio: any, index: number) => {
        if (audio.data && audio.data.includes("base64,")) {
          const mimeParts = audio.data.split(";");
          const extMatch = mimeParts[0].match(/\/([^;]+)/);
          const ext = extMatch ? extMatch[1] : "webm";
          const cleanBase64 = audio.data.split("base64,")[1];
          const fileName = `audio_note_new_${index + 1}.${ext}`;
          const audioFolder = path.join(fullFolderPath, "audio");
          if (!fs.existsSync(audioFolder)) fs.mkdirSync(audioFolder, { recursive: true });
          const audioPath = path.join(audioFolder, fileName);
          fs.writeFileSync(audioPath, Buffer.from(cleanBase64, "base64"));
          savedAudioNotes.push({ name: fileName, url: `/api/reports/audio/${existingReport.reference}/${fileName}` });
        } else {
          savedAudioNotes.push({ name: audio.name, url: audio.url || `/api/reports/audio/${existingReport.reference}/${audio.name}` });
        }
      });
    }

    const updatedReport = {
      ...existingReport,
      updatedAt: new Date().toISOString(),
      unitId: body.unitId,
      unitName: body.unitName,
      zone: body.zone,
      subzone: body.subzone,
      categoryId: body.categoryId,
      categoryName: body.categoryName,
      reportType: body.reportType,
      priority: body.priority,
      status: body.status,
      technicians: Array.isArray(body.technicians) ? body.technicians : [body.technicians].filter(Boolean),
      description: body.description || "",
      actions: body.actions || "",
      parts: Array.isArray(body.parts) ? body.parts : [],
      duration: parseInt(body.duration, 10) || 0,
      cost: parseFloat(body.cost) || 0,
      photos: savedPhotos,
      audioNotes: savedAudioNotes,
      linkedReportId: body.linkedReportId || undefined,
      nextVisitDate: body.nextVisitDate || undefined,
      additionalObservations: body.additionalObservations || "",
      author: body.author || existingReport.author,
      isValidated: body.isValidated === true,
    };

    const htmlContent = generateReportHTML(updatedReport, settings);
    fs.writeFileSync(path.join(fullFolderPath, "rapport.html"), htmlContent, "utf-8");
    fs.writeFileSync(path.join(fullFolderPath, "metadata.json"), JSON.stringify(updatedReport, null, 2), "utf-8");

    db.reports[reportIdx] = updatedReport;
    writeDatabase(db);

    return NextResponse.json(updatedReport);
  } catch (err: any) {
    return NextResponse.json({ error: "Échec de mise à jour du rapport: " + err.message }, { status: 500 });
  } finally {
    release();
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = readDatabase();
  const reportIdx = db.reports.findIndex((r) => r.id === id);
  if (reportIdx === -1) {
    return NextResponse.json({ error: "Rapport introuvable" }, { status: 404 });
  }

  const report = db.reports[reportIdx];
  const fullPath = path.join(getResolvedStorageRoot(), report.folderPath || "");

  try {
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
    db.reports.splice(reportIdx, 1);
    writeDatabase(db);
    return NextResponse.json({ success: true, message: "Rapport supprimé avec succès" });
  } catch (err: any) {
    return NextResponse.json({ error: "Échec de suppression: " + err.message }, { status: 500 });
  }
}
