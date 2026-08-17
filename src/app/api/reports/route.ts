import { NextRequest, NextResponse } from "next/server";
import { readDatabase } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const db = readDatabase();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const unit = searchParams.get("unit");
    const category = searchParams.get("category");
    const type = searchParams.get("type");
    const priority = searchParams.get("priority");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    let filtered = [...db.reports];

    if (q) {
      const query = q.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.reference.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query) ||
          r.actions.toLowerCase().includes(query) ||
          r.technicians.some((t) => t.toLowerCase().includes(query)) ||
          r.zone.toLowerCase().includes(query) ||
          r.subzone.toLowerCase().includes(query)
      );
    }
    if (unit) filtered = filtered.filter((r) => r.unitId === unit);
    if (category) filtered = filtered.filter((r) => r.categoryId === category);
    if (type) filtered = filtered.filter((r) => r.reportType === type);
    if (priority) filtered = filtered.filter((r) => r.priority === priority);
    if (status) filtered = filtered.filter((r) => r.status === status);
    if (startDate) filtered = filtered.filter((r) => r.createdAt >= startDate);
    if (endDate) filtered = filtered.filter((r) => r.createdAt <= endDate);

    const order = sortOrder === "asc" ? 1 : -1;
    const field = sortBy as string;

    filtered.sort((a: any, b: any) => {
      if (a[field] < b[field]) return -1 * order;
      if (a[field] > b[field]) return 1 * order;
      return 0;
    });

    return NextResponse.json(filtered);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { release } = await import("@/lib/storage").then((m) =>
    m.acquireDbMutex().then((rel) => ({ release: rel }))
  );
  try {
    const { readDatabase, writeDatabase, generateReference, getSettings, getResolvedStorageRoot, ensureStorageStructure } = await import("@/lib/storage");
    const { generateReportHTML } = await import("@/lib/report-html");
    const fs = await import("fs");
    const path = await import("path");

    const db = readDatabase();
    const settings = getSettings();
    const body = await request.json();

    const dateStr = body.createdAt
      ? body.createdAt.split("T")[0]
      : new Date().toISOString().split("T")[0];
    const ref = generateReference(body.unitId, body.reportType, dateStr);

    const dateObj = new Date(body.createdAt || new Date());
    const year = dateObj.getFullYear().toString();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");

    const relativeFolderPath = path.join("reports", body.unitId, year, month, ref);
    const fullFolderPath = path.join(getResolvedStorageRoot(), relativeFolderPath);

    fs.mkdirSync(path.join(fullFolderPath, "photos"), { recursive: true });
    fs.mkdirSync(path.join(fullFolderPath, "audio"), { recursive: true });

    // Save photos
    const savedPhotos: any[] = [];
    if (body.photos && Array.isArray(body.photos)) {
      body.photos.forEach((photo: any, index: number) => {
        if (photo.data && photo.data.includes("base64,")) {
          const mimeParts = photo.data.split(";");
          const ext = mimeParts[0].split("/")[1] || "png";
          const cleanBase64 = photo.data.split("base64,")[1];
          const fileName = `${photo.phase}_photo_${index + 1}.${ext}`;
          const photoPath = path.join(fullFolderPath, "photos", fileName);
          fs.writeFileSync(photoPath, Buffer.from(cleanBase64, "base64"));
          savedPhotos.push({ name: fileName, phase: photo.phase, url: `/api/reports/photo/${ref}/${fileName}` });
        } else if (photo.url) {
          const match = photo.url.match(/\/api\/reports\/photo\/([^/]+)\/([^/]+)/);
          if (match) {
            const originalRef = match[1];
            const originalName = match[2];
            const originalReport = db.reports.find((r) => r.reference === originalRef);
            if (originalReport && originalReport.folderPath) {
              const srcPath = path.join(getResolvedStorageRoot(), originalReport.folderPath, "photos", originalName);
              const destPath = path.join(fullFolderPath, "photos", photo.name);
              try {
                if (fs.existsSync(srcPath)) fs.copyFileSync(srcPath, destPath);
              } catch (copyErr) {
                console.error("Failed to copy photo:", copyErr);
              }
            }
          }
          savedPhotos.push({ name: photo.name, phase: photo.phase, url: `/api/reports/photo/${ref}/${photo.name}` });
        }
      });
    }

    // Save audio notes
    const savedAudioNotes: any[] = [];
    if (body.audioNotes && Array.isArray(body.audioNotes)) {
      body.audioNotes.forEach((audio: any, index: number) => {
        if (audio.data && audio.data.includes("base64,")) {
          const mimeParts = audio.data.split(";");
          const extMatch = mimeParts[0].match(/\/([^;]+)/);
          const ext = extMatch ? extMatch[1] : "webm";
          const cleanBase64 = audio.data.split("base64,")[1];
          const fileName = `audio_note_${index + 1}.${ext}`;
          const audioPath = path.join(fullFolderPath, "audio", fileName);
          fs.writeFileSync(audioPath, Buffer.from(cleanBase64, "base64"));
          savedAudioNotes.push({ name: fileName, url: `/api/reports/audio/${ref}/${fileName}` });
        } else if (audio.url) {
          const match = audio.url.match(/\/api\/reports\/audio\/([^/]+)\/([^/]+)/);
          if (match) {
            const originalRef = match[1];
            const originalName = match[2];
            const originalReport = db.reports.find((r) => r.reference === originalRef);
            if (originalReport && originalReport.folderPath) {
              const srcPath = path.join(getResolvedStorageRoot(), originalReport.folderPath, "audio", originalName);
              const destPath = path.join(fullFolderPath, "audio", audio.name);
              try {
                if (fs.existsSync(srcPath)) fs.copyFileSync(srcPath, destPath);
              } catch (copyErr) {
                console.error("Failed to copy audio:", copyErr);
              }
            }
          }
          savedAudioNotes.push({ name: audio.name, url: `/api/reports/audio/${ref}/${audio.name}` });
        }
      });
    }

    const newReport = {
      id: ref,
      reference: ref,
      createdAt: body.createdAt || new Date().toISOString(),
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
      author: body.author || "Technicien EGCSO",
      isValidated: body.isValidated === true,
      folderPath: relativeFolderPath,
    };

    const htmlContent = generateReportHTML(newReport, settings);
    fs.writeFileSync(path.join(fullFolderPath, "rapport.html"), htmlContent, "utf-8");
    fs.writeFileSync(path.join(fullFolderPath, "metadata.json"), JSON.stringify(newReport, null, 2), "utf-8");

    db.reports.push(newReport);
    writeDatabase(db);

    return NextResponse.json(newReport);
  } catch (err: any) {
    return NextResponse.json({ error: "Échec de création du rapport: " + err.message }, { status: 500 });
  } finally {
    release();
  }
}
