import fs from "fs";
import path from "path";
import type { Report, AppSettings, Unit, BreakdownCategory } from "@/types";

// Mutex for database operations
let dbMutexPromise = Promise.resolve();
export function acquireDbMutex(): Promise<() => void> {
  let release!: () => void;
  const nextPromise = new Promise<void>((resolve) => {
    release = resolve;
  });
  const currentPromise = dbMutexPromise;
  dbMutexPromise = dbMutexPromise.then(() => nextPromise);
  return currentPromise.then(() => release);
}

export function getSettings(): AppSettings {
  const settingsPath = path.resolve(process.cwd(), "config/settings.json");
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading settings.json:", err);
  }
  return {
    storageRoot: "C:/EGCSO_Maintenance",
    companyName: "EPIC EGCSO",
    departmentName: "Service Maintenance",
    referenceFormat: "EGCSO-[CODE_UNITE]-[TYPE]-[AAAAMMJJ]-[SEQ]",
    chiefMaintenanceName: "BOUARFA HAKIM",
  };
}

export function getResolvedStorageRoot(): string {
  const settings = getSettings();
  const targetPath = settings.storageRoot || "C:/EGCSO_Maintenance";
  if (path.isAbsolute(targetPath)) {
    return targetPath;
  }
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), targetPath);
}

export function ensureStorageStructure(): void {
  const root = getResolvedStorageRoot();
  const reportsDir = path.join(root, "reports");
  const exportsDir = path.join(root, "exports_pdf");
  const dbPath = path.join(root, "index_db.json");

  if (!fs.existsSync(/*turbopackIgnore: true*/ root)) fs.mkdirSync(/*turbopackIgnore: true*/ root, { recursive: true });
  if (!fs.existsSync(/*turbopackIgnore: true*/ reportsDir)) fs.mkdirSync(/*turbopackIgnore: true*/ reportsDir, { recursive: true });
  if (!fs.existsSync(/*turbopackIgnore: true*/ exportsDir)) fs.mkdirSync(/*turbopackIgnore: true*/ exportsDir, { recursive: true });
  if (!fs.existsSync(/*turbopackIgnore: true*/ dbPath)) {
    fs.writeFileSync(/*turbopackIgnore: true*/ dbPath, JSON.stringify({ reports: [] }, null, 2), "utf-8");
  }
}

export function reconstructIndexFromDisk(): { reports: Report[] } {
  const root = getResolvedStorageRoot();
  const reportsDir = path.join(root, "reports");
  if (!fs.existsSync(reportsDir)) return { reports: [] };

  const foundReports: Report[] = [];
  function scanDir(dir: string) {
    let files: string[] = [];
    try { files = fs.readdirSync(dir); } catch { return; }
    if (files.includes("metadata.json")) {
      try {
        const metadataPath = path.join(dir, "metadata.json");
        const report = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
        report.folderPath = path.relative(root, dir);
        foundReports.push(report);
      } catch (err) {
        console.error(`Error reading metadata in ${dir}:`, err);
      }
      return;
    }
    files.forEach((file) => {
      const fullPath = path.join(dir, file);
      try {
        if (fs.statSync(fullPath).isDirectory()) scanDir(fullPath);
      } catch {}
    });
  }

  scanDir(reportsDir);
  const data = { reports: foundReports };
  if (foundReports.length > 0) {
    writeDatabase(data);
  }
  return data;
}

// High-performance In-Memory Cache & O(1) Indexed Maps
let cachedDbData: { reports: Report[] } | null = null;
let cachedDbMtime = 0;

const idIndex = new Map<string, Report>();
const unitIndex = new Map<string, Report[]>();
const categoryIndex = new Map<string, Report[]>();
const statusIndex = new Map<string, Report[]>();

function rebuildIndexes(reports: Report[]) {
  idIndex.clear();
  unitIndex.clear();
  categoryIndex.clear();
  statusIndex.clear();

  for (const r of reports) {
    if (r.id) idIndex.set(r.id, r);
    if (r.reference) idIndex.set(r.reference, r);

    if (r.unitId) {
      const arr = unitIndex.get(r.unitId) || [];
      arr.push(r);
      unitIndex.set(r.unitId, arr);
    }
    if (r.categoryId) {
      const arr = categoryIndex.get(r.categoryId) || [];
      arr.push(r);
      categoryIndex.set(r.categoryId, arr);
    }
    if (r.status) {
      const arr = statusIndex.get(r.status) || [];
      arr.push(r);
      statusIndex.set(r.status, arr);
    }
  }
}

export function readDatabase(): { reports: Report[] } {
  ensureStorageStructure();
  const dbPath = path.join(getResolvedStorageRoot(), "index_db.json");
  try {
    if (fs.existsSync(dbPath)) {
      const stat = fs.statSync(dbPath);
      if (cachedDbData && cachedDbMtime === stat.mtimeMs) {
        return cachedDbData;
      }
      const content = fs.readFileSync(dbPath, "utf-8").trim();
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed.reports && parsed.reports.length > 0) {
          cachedDbData = parsed;
          cachedDbMtime = stat.mtimeMs;
          rebuildIndexes(parsed.reports);
          return cachedDbData!;
        }
      }
    }
  } catch (err) {
    console.error("Error reading index_db.json:", err);
  }
  return reconstructIndexFromDisk();
}

export function writeDatabase(data: { reports: Report[] }): void {
  ensureStorageStructure();
  const root = getResolvedStorageRoot();
  const dbPath = path.join(root, "index_db.json");
  const tempPath = path.join(root, `index_db.tmp.${Date.now()}`);
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempPath, dbPath);
    const stat = fs.statSync(dbPath);
    cachedDbData = data;
    cachedDbMtime = stat.mtimeMs;
    rebuildIndexes(data.reports || []);
  } catch (err) {
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch {}
    }
    console.error("Error writing index_db.json:", err);
    throw err;
  }
}

export function getReportByIdFast(idOrRef: string): Report | undefined {
  readDatabase();
  return idIndex.get(idOrRef);
}

export function getReportsByUnitFast(unitId: string): Report[] {
  readDatabase();
  return unitIndex.get(unitId) || [];
}

export function getReportsByStatusFast(status: string): Report[] {
  readDatabase();
  return statusIndex.get(status) || [];
}

export function generateReference(unitId: string, reportType: string, dateStr: string): string {
  const db = readDatabase();
  const unitCode = unitId.toUpperCase().slice(0, 3);
  const typeCode =
    reportType === "Technique" ? "TEC" : reportType === "Suivi" ? "SUI" : "CST";
  const cleanDateStr = dateStr.replace(/-/g, "").slice(0, 8);
  const prefix = `EGCSO-${unitCode}-${typeCode}-${cleanDateStr}-`;
  const todaysReports = db.reports.filter((r) => r.reference.startsWith(prefix));
  let maxSeq = 0;
  todaysReports.forEach((r) => {
    const parts = r.reference.split("-");
    const seqStr = parts[parts.length - 1];
    const seq = parseInt(seqStr, 10);
    if (!isNaN(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  });
  const nextSeq = maxSeq + 1;
  const seqStr = nextSeq.toString().padStart(3, "0");
  return `${prefix}${seqStr}`;
}

export function escapeHtml(unsafe: string): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function getUnits(): Unit[] {
  const p = path.resolve(process.cwd(), "config/unites.json");
  try {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {}
  return [];
}

export function getCategories(): BreakdownCategory[] {
  const p = path.resolve(process.cwd(), "config/categories_pannes.json");
  try {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {}
  return [];
}

export function getAppVersion(): string {
  try {
    const vPath = path.resolve(process.cwd(), "VERSION");
    if (fs.existsSync(vPath)) {
      const content = fs.readFileSync(vPath, "utf-8").trim();
      if (content) return content;
    }
  } catch {}
  return "2.3.1";
}

export function getCustomSheets(): import("@/types").CustomFollowUpSheet[] {
  const p = path.resolve(process.cwd(), "config/custom_followup_sheets.json");
  try {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading custom_followup_sheets.json:", err);
  }
  return [];
}

export function saveCustomSheets(sheets: import("@/types").CustomFollowUpSheet[]): void {
  const p = path.resolve(process.cwd(), "config/custom_followup_sheets.json");
  const tempPath = path.resolve(process.cwd(), `config/custom_followup_sheets.tmp.${Date.now()}`);
  try {
    fs.writeFileSync(tempPath, JSON.stringify(sheets, null, 2), "utf-8");
    fs.renameSync(tempPath, p);
  } catch (err) {
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch {}
    }
    console.error("Error writing custom_followup_sheets.json:", err);
    throw err;
  }
}
