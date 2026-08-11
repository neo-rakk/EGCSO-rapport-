import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

// Interfaces for structured reports
interface Report {
  id: string; // unique reference ex: EGCSO-VIL-TEC-20260811-001
  reference: string;
  createdAt: string;
  updatedAt: string;
  unitId: string;
  unitName: string;
  zone: string;
  subzone: string;
  categoryId: string;
  categoryName: string;
  reportType: "Technique" | "Suivi" | "Constat";
  priority: "Urgente" | "Normale" | "Basse";
  status: "Ouvert" | "En cours" | "Résolu" | "Clôturé";
  technicians: string[];
  description: string;
  actions: string;
  parts: Array<{ name: string; quantity: number }>;
  duration: number; // in minutes
  cost: number; // in DZD
  photos: Array<{ name: string; phase: "before" | "after"; url: string }>;
  linkedReportId?: string;
  nextVisitDate?: string;
  additionalObservations?: string;
  author: string;
  isValidated: boolean;
  folderPath?: string;
}

const app = express();
const PORT = 3000;

// Increase body limit for base64 photo uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Dynamic helper to get current storage paths
function getSettings() {
  const settingsPath = path.resolve(process.cwd(), "config/settings.json");
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading settings.json, returning defaults:", err);
  }
  return {
    storageRoot: "./EGCSO_Maintenance",
    companyName: "EPIC EGCSO",
    departmentName: "Service Maintenance",
    referenceFormat: "EGCSO-[CODE_UNITE]-[TYPE]-[AAAAMMJJ]-[SEQ]"
  };
}

function getResolvedStorageRoot() {
  const settings = getSettings();
  return path.resolve(process.cwd(), settings.storageRoot);
}

function ensureStorageStructure() {
  const root = getResolvedStorageRoot();
  const reportsDir = path.join(root, "reports");
  const exportsDir = path.join(root, "exports_pdf");
  const dbPath = path.join(root, "index_db.json");

  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ reports: [] }, null, 2), "utf-8");
  }
}

// Ensure the storage structure is built on startup
ensureStorageStructure();

// Helper to read database
function readDatabase(): { reports: Report[] } {
  ensureStorageStructure();
  const dbPath = path.join(getResolvedStorageRoot(), "index_db.json");
  try {
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading index_db.json:", err);
  }
  return { reports: [] };
}

// Helper to write database
function writeDatabase(data: { reports: Report[] }) {
  ensureStorageStructure();
  const dbPath = path.join(getResolvedStorageRoot(), "index_db.json");
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
}

// API Routes

// Settings endpoints
app.get("/api/settings", (req, res) => {
  res.json(getSettings());
});

app.post("/api/settings", (req, res) => {
  const settingsPath = path.resolve(process.cwd(), "config/settings.json");
  const current = getSettings();
  const updated = { ...current, ...req.body };
  
  // Ensure the directory exists if we changed the root
  try {
    const parentDir = path.dirname(settingsPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(settingsPath, JSON.stringify(updated, null, 2), "utf-8");
    ensureStorageStructure();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "Impossible de sauvegarder les paramètres: " + err.message });
  }
});

// Config lists endpoints
app.get("/api/config/unites", (req, res) => {
  const unitesPath = path.resolve(process.cwd(), "config/unites.json");
  try {
    if (fs.existsSync(unitesPath)) {
      return res.json(JSON.parse(fs.readFileSync(unitesPath, "utf-8")));
    }
    res.status(404).json({ error: "Fichier unites.json introuvable" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/config/unites", (req, res) => {
  const unitesPath = path.resolve(process.cwd(), "config/unites.json");
  try {
    fs.writeFileSync(unitesPath, JSON.stringify(req.body, null, 2), "utf-8");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/config/categories", (req, res) => {
  const categoriesPath = path.resolve(process.cwd(), "config/categories_pannes.json");
  try {
    if (fs.existsSync(categoriesPath)) {
      return res.json(JSON.parse(fs.readFileSync(categoriesPath, "utf-8")));
    }
    res.status(404).json({ error: "Fichier categories_pannes.json introuvable" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/config/categories", (req, res) => {
  const categoriesPath = path.resolve(process.cwd(), "config/categories_pannes.json");
  try {
    fs.writeFileSync(categoriesPath, JSON.stringify(req.body, null, 2), "utf-8");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Photo retrieval endpoint
app.get("/api/reports/photo/:ref/:name", (req, res) => {
  const { ref, name } = req.params;
  const db = readDatabase();
  const report = db.reports.find((r) => r.reference === ref);
  
  if (!report || !report.folderPath) {
    return res.status(404).json({ error: "Rapport introuvable" });
  }
  
  const root = getResolvedStorageRoot();
  const photoPath = path.join(root, report.folderPath, "photos", name);
  
  if (fs.existsSync(photoPath)) {
    res.sendFile(photoPath);
  } else {
    res.status(404).json({ error: "Photo introuvable" });
  }
});

// HTML view / download endpoint
app.get("/api/reports/:id/html", (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const report = db.reports.find((r) => r.id === id);
  
  if (!report || !report.folderPath) {
    return res.status(404).json({ error: "Rapport introuvable" });
  }
  
  const root = getResolvedStorageRoot();
  const htmlPath = path.join(root, report.folderPath, "rapport.html");
  
  if (fs.existsSync(htmlPath)) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.sendFile(htmlPath);
  } else {
    res.status(404).json({ error: "Fichier HTML de rapport introuvable" });
  }
});

// Search and filter endpoints
app.get("/api/reports", (req, res) => {
  const db = readDatabase();
  const { q, unit, category, type, priority, status, startDate, endDate, sortBy, sortOrder } = req.query;
  
  let filtered = [...db.reports];
  
  if (q) {
    const query = (q as string).toLowerCase();
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
  
  if (unit) {
    filtered = filtered.filter((r) => r.unitId === unit);
  }
  
  if (category) {
    filtered = filtered.filter((r) => r.categoryId === category);
  }
  
  if (type) {
    filtered = filtered.filter((r) => r.reportType === type);
  }
  
  if (priority) {
    filtered = filtered.filter((r) => r.priority === priority);
  }
  
  if (status) {
    filtered = filtered.filter((r) => r.status === status);
  }
  
  if (startDate) {
    filtered = filtered.filter((r) => r.createdAt >= (startDate as string));
  }
  
  if (endDate) {
    filtered = filtered.filter((r) => r.createdAt <= (endDate as string));
  }
  
  // Sort
  const order = sortOrder === "asc" ? 1 : -1;
  const field = (sortBy as string) || "createdAt";
  
  filtered.sort((a: any, b: any) => {
    if (a[field] < b[field]) return -1 * order;
    if (a[field] > b[field]) return 1 * order;
    return 0;
  });
  
  res.json(filtered);
});

// Get single report metadata
app.get("/api/reports/:id", (req, res) => {
  const db = readDatabase();
  const report = db.reports.find((r) => r.id === req.params.id);
  if (report) {
    res.json(report);
  } else {
    res.status(404).json({ error: "Rapport introuvable" });
  }
});

// Helper: generate HTML representation of a report
function generateReportHTML(report: Report, settings: any): string {
  const statusColors = {
    "Ouvert": { bg: "#fff7ed", text: "#ea580c", border: "#ffedd5" },
    "En cours": { bg: "#eff6ff", text: "#2563eb", border: "#dbeafe" },
    "Résolu": { bg: "#f0fdf4", text: "#16a34a", border: "#dcfce7" },
    "Clôturé": { bg: "#f9fafb", text: "#4b5563", border: "#f3f4f6" }
  };
  
  const priorityColors = {
    "Urgente": { bg: "#fef2f2", text: "#dc2626", border: "#fee2e2" },
    "Normale": { bg: "#f0fdfa", text: "#0d9488", border: "#ccfbf1" },
    "Basse": { bg: "#f9fafb", text: "#6b7280", border: "#f3f4f6" }
  };

  const statusStyle = statusColors[report.status] || statusColors["Ouvert"];
  const priorityStyle = priorityColors[report.priority] || priorityColors["Normale"];

  // Format parts table
  const partsRows = report.parts.length > 0 
    ? report.parts.map(p => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #374151;">${p.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #374151; text-align: center;">${p.quantity}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="2" style="padding: 15px; text-align: center; color: #9ca3af; font-style: italic;">Aucune pièce de rechange utilisée</td></tr>`;

  // Format photos
  const beforePhotos = report.photos.filter(p => p.phase === "before");
  const afterPhotos = report.photos.filter(p => p.phase === "after");

  const renderPhotosSection = (title: string, photos: typeof report.photos) => {
    if (photos.length === 0) return "";
    return `
      <div style="margin-top: 20px;">
        <h4 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #4b5563; margin-bottom: 10px; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px;">${title}</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
          ${photos.map(p => `
            <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px; background-color: #fafafa; text-align: center;">
              <img src="/api/reports/photo/${report.reference}/${p.name}" style="max-width: 100%; max-height: 200px; border-radius: 4px; object-fit: contain;" alt="${p.name}" />
              <div style="font-size: 11px; color: #6b7280; margin-top: 5px; font-weight: 500;">${p.name}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  };

  const formattedDate = new Date(report.createdAt).toLocaleString("fr-FR", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
  });

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport de Maintenance - ${report.reference}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f3f4f6;
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      border: 1px solid #e5e7eb;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #065f46;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    .header-left h1 {
      font-size: 24px;
      color: #065f46;
      margin: 0 0 5px 0;
      font-weight: 800;
    }
    .header-left h2 {
      font-size: 14px;
      color: #4b5563;
      margin: 0;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .header-right {
      text-align: right;
    }
    .ref-badge {
      font-size: 16px;
      font-weight: 700;
      color: #065f46;
      background-color: #ecfdf5;
      border: 1px dashed #10b981;
      padding: 6px 12px;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 8px;
    }
    .report-type-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 700;
      color: #ffffff;
      background-color: #065f46;
      padding: 3px 8px;
      border-radius: 3px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 30px;
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 6px;
      border: 1px solid #f3f4f6;
    }
    .meta-item {
      font-size: 13px;
    }
    .meta-label {
      font-weight: 600;
      color: #4b5563;
      display: inline-block;
      width: 150px;
    }
    .meta-value {
      color: #111827;
      font-weight: 500;
    }
    .section-title {
      font-size: 16px;
      color: #065f46;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 6px;
      margin-top: 30px;
      margin-bottom: 15px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }
    .text-content {
      background-color: #fefefe;
      border: 1px solid #f3f4f6;
      padding: 15px;
      border-radius: 6px;
      font-size: 14px;
      white-space: pre-wrap;
      color: #374151;
    }
    .badge {
      font-size: 12px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 12px;
      display: inline-block;
    }
    .parts-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-top: 10px;
    }
    .parts-table th {
      background-color: #f3f4f6;
      color: #374151;
      text-align: left;
      padding: 10px;
      font-weight: 600;
      border-bottom: 2px solid #e5e7eb;
    }
    .duration-cost {
      display: flex;
      justify-content: space-between;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 15px 25px;
      margin-top: 20px;
    }
    .duration-cost-item {
      text-align: center;
    }
    .duration-cost-label {
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
    }
    .duration-cost-value {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 4px;
    }
    .signatures {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
      gap: 30px;
    }
    .signature-box {
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      padding: 20px;
      flex: 1;
      background-color: #fafcfd;
    }
    .signature-title {
      font-size: 12px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 40px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    .signature-line {
      border-top: 1px solid #94a3b8;
      margin-top: 30px;
      text-align: center;
      padding-top: 5px;
      font-size: 12px;
      color: #475569;
    }
    .no-print-toolbar {
      max-width: 800px;
      margin: 0 auto 20px auto;
      background-color: #ffffff;
      padding: 15px 20px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .btn {
      background-color: #065f46;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      transition: background-color 0.2s;
    }
    .btn:hover {
      background-color: #059669;
    }
    .btn-secondary {
      background-color: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
    }
    .btn-secondary:hover {
      background-color: #e5e7eb;
    }
    
    @media print {
      body {
        background-color: #ffffff;
        color: #000000;
        padding: 0;
        margin: 0;
      }
      .container {
        box-shadow: none;
        border: none;
        padding: 0;
        max-width: 100%;
      }
      .no-print-toolbar {
        display: none !important;
      }
      .meta-grid {
        background-color: #ffffff !important;
        border: 1px solid #000000 !important;
      }
      .text-content {
        border: 1px solid #cccccc !important;
        background-color: #ffffff !important;
      }
      .duration-cost {
        background-color: #ffffff !important;
        border: 1px solid #000000 !important;
      }
      .signature-box {
        background-color: #ffffff !important;
        border: 1px solid #000000 !important;
      }
    }
  </style>
</head>
<body>
  
  <div class="no-print-toolbar">
    <div>
      <span style="font-size: 14px; font-weight: 500; color: #475569;">Rapport de Maintenance</span>
    </div>
    <div style="display: flex; gap: 10px;">
      <button onclick="window.print()" class="btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5"/><rect width="12" height="8" x="6" y="14" rx="1"/></svg>
        Imprimer / Exporter PDF
      </button>
      <button onclick="window.close()" class="btn btn-secondary">Fermer l'onglet</button>
    </div>
  </div>

  <div class="container">
    <div class="header">
      <div class="header-left">
        <h1>${settings.companyName || "EPIC EGCSO"}</h1>
        <h2>${settings.departmentName || "Service Maintenance"}</h2>
        <div style="font-size: 12px; color: #6b7280; font-weight: 500; margin-top: 5px;">Complexe Sportif d'Oran - Algérie</div>
      </div>
      <div class="header-right">
        <div class="ref-badge">${report.reference}</div>
        <div>
          <span class="report-type-label">${report.reportType === "Technique" ? "RAPPORT TECHNIQUE" : report.reportType === "Suivi" ? "RAPPORT DE SUIVI" : "CONSTAT"}</span>
        </div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">Date de rédaction:</span>
        <span class="meta-value">${formattedDate}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Unité du Complexe:</span>
        <span class="meta-value">${report.unitName}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Zone / Bloc:</span>
        <span class="meta-value">${report.zone}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Sous-zone / Étage:</span>
        <span class="meta-value">${report.subzone}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Domaine / Catégorie:</span>
        <span class="meta-value">${report.categoryName}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Priorité d'intervention:</span>
        <span class="badge" style="background-color: ${priorityStyle.bg}; color: ${priorityStyle.text}; border: 1px solid ${priorityStyle.border};">${report.priority}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Statut du dossier:</span>
        <span class="badge" style="background-color: ${statusStyle.bg}; color: ${statusStyle.text}; border: 1px solid ${statusStyle.border};">${report.status}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Rédacteur:</span>
        <span class="meta-value">${report.author}</span>
      </div>
      <div class="meta-item" style="grid-column: span 2;">
        <span class="meta-label" style="width: 150px;">Technicien(s):</span>
        <span class="meta-value">${report.technicians.join(", ") || "Non spécifié"}</span>
      </div>
      ${report.linkedReportId ? `
      <div class="meta-item" style="grid-column: span 2; border-top: 1px dashed #e5e7eb; padding-top: 10px; margin-top: 5px;">
        <span class="meta-label" style="width: 150px;">Rapport d'origine lié:</span>
        <span class="meta-value" style="color: #2563eb; font-weight: 600;">${report.linkedReportId}</span>
      </div>
      ` : ""}
      ${report.nextVisitDate ? `
      <div class="meta-item" style="grid-column: span 2;">
        <span class="meta-label" style="width: 150px;">Prochaine visite prévue:</span>
        <span class="meta-value" style="color: #ea580c; font-weight: 600;">${new Date(report.nextVisitDate).toLocaleDateString("fr-FR")}</span>
      </div>
      ` : ""}
    </div>

    <div class="section-title">Description de la Panne / Constat</div>
    <div class="text-content">${report.description || "Aucune description fournie."}</div>

    ${report.reportType !== "Constat" ? `
    <div class="section-title">Actions Réalisées et Solutions Apportées</div>
    <div class="text-content">${report.actions || "Aucune action documentée."}</div>
    ` : ""}

    ${report.reportType !== "Constat" ? `
    <div class="section-title">Pièces de Rechange et Matériel Utilisés</div>
    <table class="parts-table">
      <thead>
        <tr>
          <th>Désignation de la pièce / matériel</th>
          <th style="width: 120px; text-align: center;">Quantité</th>
        </tr>
      </thead>
      <tbody>
        ${partsRows}
      </tbody>
    </table>
    ` : ""}

    ${report.reportType !== "Constat" ? `
    <div class="duration-cost">
      <div class="duration-cost-item">
        <div class="duration-cost-label">Durée d'intervention</div>
        <div class="duration-cost-value">
          ${Math.floor(report.duration / 60) > 0 ? `${Math.floor(report.duration / 60)}h ` : ""}${report.duration % 60} min
        </div>
      </div>
      <div class="duration-cost-item" style="border-left: 1px solid #cbd5e1; padding-left: 40px;">
        <div class="duration-cost-label">Coût estimé du matériel</div>
        <div class="duration-cost-value">${report.cost.toLocaleString("fr-DZ")} DZD</div>
      </div>
    </div>
    ` : ""}

    ${beforePhotos.length > 0 || afterPhotos.length > 0 ? `
    <div class="section-title">Documentation Photographique</div>
    ${renderPhotosSection("Photographies Avant Intervention / Constat", beforePhotos)}
    ${renderPhotosSection("Photographies Après Intervention", afterPhotos)}
    ` : ""}

    ${report.additionalObservations ? `
    <div class="section-title">Observations Complémentaires</div>
    <div class="text-content">${report.additionalObservations}</div>
    ` : ""}

    <div class="signatures">
      <div class="signature-box">
        <div class="signature-title">Le Rédacteur / Technicien</div>
        <div style="font-size: 14px; font-weight: 600; color: #065f46; margin-bottom: 5px;">${report.author}</div>
        <div style="font-size: 12px; color: #16a34a; font-weight: 600; display: flex; align-items: center; gap: 4px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          Signature électronique validée
        </div>
        <div class="signature-line">Date: ${new Date(report.createdAt).toLocaleDateString("fr-FR")}</div>
      </div>
      <div class="signature-box">
        <div class="signature-title">Validation Direction Technique / EGCSO</div>
        <div style="height: 35px;"></div>
        <div class="signature-line">Nom, Date et Visa</div>
      </div>
    </div>
  </div>

</body>
</html>`;
}

// Generate unique reference ID
function generateReference(unitId: string, reportType: string, dateStr: string): string {
  const db = readDatabase();
  const unitCode = unitId.toUpperCase().slice(0, 3);
  
  const typeCode = 
    reportType === "Technique" ? "TEC" : 
    reportType === "Suivi" ? "SUI" : "CST";
    
  // Clean YYYYMMDD string
  const cleanDateStr = dateStr.replace(/-/g, "").slice(0, 8);
  
  // Find all reports of today
  const prefix = `EGCSO-${unitCode}-${typeCode}-${cleanDateStr}-`;
  const todaysReports = db.reports.filter(r => r.reference.startsWith(prefix));
  
  let maxSeq = 0;
  todaysReports.forEach(r => {
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

// Create new report
app.post("/api/reports", (req, res) => {
  const db = readDatabase();
  const settings = getSettings();
  const body = req.body;
  
  const dateStr = body.createdAt ? body.createdAt.split("T")[0] : new Date().toISOString().split("T")[0];
  const ref = generateReference(body.unitId, body.reportType, dateStr);
  
  const dateObj = new Date(body.createdAt || new Date());
  const year = dateObj.getFullYear().toString();
  const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
  
  // Get folders setup
  const relativeFolderPath = path.join("reports", body.unitId, year, month, ref);
  const fullFolderPath = path.join(getResolvedStorageRoot(), relativeFolderPath);
  
  try {
    // Create directory
    fs.mkdirSync(path.join(fullFolderPath, "photos"), { recursive: true });
    
    // Save photos & resolve paths
    const savedPhotos: Report["photos"] = [];
    if (body.photos && Array.isArray(body.photos)) {
      body.photos.forEach((photo: any, index: number) => {
        if (photo.data && photo.data.includes("base64,")) {
          const mimeParts = photo.data.split(";");
          const ext = mimeParts[0].split("/")[1] || "png";
          const cleanBase64 = photo.data.split("base64,")[1];
          const fileName = `${photo.phase}_photo_${index + 1}.${ext}`;
          
          const photoPath = path.join(fullFolderPath, "photos", fileName);
          fs.writeFileSync(photoPath, Buffer.from(cleanBase64, "base64"));
          
          savedPhotos.push({
            name: fileName,
            phase: photo.phase,
            url: `/api/reports/photo/${ref}/${fileName}`
          });
        } else if (photo.url) {
          // If copying existing photo
          savedPhotos.push({
            name: photo.name,
            phase: photo.phase,
            url: `/api/reports/photo/${ref}/${photo.name}`
          });
        }
      });
    }
    
    const newReport: Report = {
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
      linkedReportId: body.linkedReportId || undefined,
      nextVisitDate: body.nextVisitDate || undefined,
      additionalObservations: body.additionalObservations || "",
      author: body.author || "Technicien EGCSO",
      isValidated: body.isValidated === true,
      folderPath: relativeFolderPath
    };
    
    // Write index HTML file
    const htmlContent = generateReportHTML(newReport, settings);
    fs.writeFileSync(path.join(fullFolderPath, "rapport.html"), htmlContent, "utf-8");
    
    // Write metadata JSON
    fs.writeFileSync(path.join(fullFolderPath, "metadata.json"), JSON.stringify(newReport, null, 2), "utf-8");
    
    // Append to index_db.json
    db.reports.push(newReport);
    writeDatabase(db);
    
    res.json(newReport);
  } catch (err: any) {
    console.error("Error creating report:", err);
    res.status(500).json({ error: "Échec de création du rapport: " + err.message });
  }
});

// Update report
app.put("/api/reports/:id", (req, res) => {
  const db = readDatabase();
  const settings = getSettings();
  const { id } = req.params;
  const body = req.body;
  
  const reportIdx = db.reports.findIndex((r) => r.id === id);
  if (reportIdx === -1) {
    return res.status(404).json({ error: "Rapport introuvable" });
  }
  
  const existingReport = db.reports[reportIdx];
  const fullFolderPath = path.join(getResolvedStorageRoot(), existingReport.folderPath || "");
  
  try {
    // Process photos
    const savedPhotos: Report["photos"] = [];
    if (body.photos && Array.isArray(body.photos)) {
      body.photos.forEach((photo: any, index: number) => {
        if (photo.data && photo.data.includes("base64,")) {
          // New uploaded photo
          const mimeParts = photo.data.split(";");
          const ext = mimeParts[0].split("/")[1] || "png";
          const cleanBase64 = photo.data.split("base64,")[1];
          const fileName = `${photo.phase}_photo_new_${index + 1}.${ext}`;
          
          if (!fs.existsSync(path.join(fullFolderPath, "photos"))) {
            fs.mkdirSync(path.join(fullFolderPath, "photos"), { recursive: true });
          }
          
          const photoPath = path.join(fullFolderPath, "photos", fileName);
          fs.writeFileSync(photoPath, Buffer.from(cleanBase64, "base64"));
          
          savedPhotos.push({
            name: fileName,
            phase: photo.phase,
            url: `/api/reports/photo/${existingReport.reference}/${fileName}`
          });
        } else {
          // Existing kept photo
          savedPhotos.push({
            name: photo.name,
            phase: photo.phase,
            url: photo.url || `/api/reports/photo/${existingReport.reference}/${photo.name}`
          });
        }
      });
    }
    
    const updatedReport: Report = {
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
      linkedReportId: body.linkedReportId || undefined,
      nextVisitDate: body.nextVisitDate || undefined,
      additionalObservations: body.additionalObservations || "",
      author: body.author || existingReport.author,
      isValidated: body.isValidated === true
    };
    
    // Re-write index HTML file
    const htmlContent = generateReportHTML(updatedReport, settings);
    fs.writeFileSync(path.join(fullFolderPath, "rapport.html"), htmlContent, "utf-8");
    
    // Re-write metadata JSON
    fs.writeFileSync(path.join(fullFolderPath, "metadata.json"), JSON.stringify(updatedReport, null, 2), "utf-8");
    
    // Update in database
    db.reports[reportIdx] = updatedReport;
    writeDatabase(db);
    
    res.json(updatedReport);
  } catch (err: any) {
    console.error("Error updating report:", err);
    res.status(500).json({ error: "Échec de mise à jour du rapport: " + err.message });
  }
});

// Delete report
app.delete("/api/reports/:id", (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  
  const reportIdx = db.reports.findIndex((r) => r.id === id);
  if (reportIdx === -1) {
    return res.status(404).json({ error: "Rapport introuvable" });
  }
  
  const report = db.reports[reportIdx];
  const fullPath = path.join(getResolvedStorageRoot(), report.folderPath || "");
  
  try {
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
    
    db.reports.splice(reportIdx, 1);
    writeDatabase(db);
    res.json({ success: true, message: "Rapport supprimé avec succès" });
  } catch (err: any) {
    res.status(500).json({ error: "Échec de suppression: " + err.message });
  }
});

// Duplicate report endpoint
app.post("/api/reports/duplicate/:id", (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const original = db.reports.find((r) => r.id === id);
  
  if (!original) {
    return res.status(404).json({ error: "Rapport d'origine introuvable" });
  }
  
  res.json({
    ...original,
    reference: "(Copie)",
    id: undefined,
    createdAt: new Date().toISOString(),
    isValidated: false,
    status: "Ouvert"
  });
});

// Convert Constat to Intervention (Rapport Technique)
app.post("/api/reports/convert-constat/:id", (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const original = db.reports.find((r) => r.id === id);
  
  if (!original) {
    return res.status(404).json({ error: "Constat introuvable" });
  }
  
  res.json({
    ...original,
    reportType: "Technique",
    reference: "(Nouveau)",
    id: undefined,
    createdAt: new Date().toISOString(),
    linkedReportId: original.reference,
    status: "Ouvert",
    actions: `Suite au constat ${original.reference} : \n\n`,
    isValidated: false
  });
});

// Reconstruct database index by scanning file tree
app.post("/api/reports/reconstruct", (req, res) => {
  const root = getResolvedStorageRoot();
  const reportsDir = path.join(root, "reports");
  
  if (!fs.existsSync(reportsDir)) {
    return res.json({ success: true, count: 0, message: "Dossier de rapports vide" });
  }
  
  const foundReports: Report[] = [];
  
  function scanDir(dir: string) {
    const files = fs.readdirSync(dir);
    
    if (files.includes("metadata.json")) {
      try {
        const metadataPath = path.join(dir, "metadata.json");
        const report = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
        
        // Ensure accurate folder path
        const relative = path.relative(root, dir);
        report.folderPath = relative;
        
        foundReports.push(report);
      } catch (err) {
        console.error(`Error reading metadata in ${dir}:`, err);
      }
      return;
    }
    
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        scanDir(fullPath);
      }
    });
  }
  
  try {
    scanDir(reportsDir);
    writeDatabase({ reports: foundReports });
    res.json({ success: true, count: foundReports.length, message: `Index reconstruit avec succès : ${foundReports.length} rapports indexés.` });
  } catch (err: any) {
    res.status(500).json({ error: "Échec de la reconstruction de l'index : " + err.message });
  }
});

// Start the server or link Vite development server
async function startServer() {
  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
