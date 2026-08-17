import { NextRequest, NextResponse } from "next/server";
import { readDatabase, getSettings, escapeHtml } from "@/lib/storage";
import type { Report, BilanData, BilanPeriod } from "@/types";

function getDateRange(period: BilanPeriod, referenceDate?: string): { start: Date; end: Date; label: string } {
  const now = referenceDate ? new Date(referenceDate) : new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (period === "hebdomadaire") {
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday start
    start.setDate(now.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    return { start, end, label: `Semaine du ${fmt(start)} au ${fmt(end)} ${now.getFullYear()}` };
  }

  if (period === "mensuel") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(start.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    const monthName = start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return { start, end, label: `Bilan mensuel — ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}` };
  }

  // Annual
  start.setMonth(0, 1);
  start.setHours(0, 0, 0, 0);
  end.setMonth(11, 31);
  end.setHours(23, 59, 59, 999);
  return { start, end, label: `Bilan annuel — ${now.getFullYear()}` };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") || "mensuel") as BilanPeriod;
    const referenceDate = searchParams.get("date") || undefined;
    const format = searchParams.get("format") || "json";

    const db = readDatabase();
    const settings = getSettings();
    const { start, end, label } = getDateRange(period, referenceDate);

    // Filter reports in the date range
    const periodReports = db.reports.filter((r: Report) => {
      const d = new Date(r.createdAt);
      return d >= start && d <= end;
    });

    // Summary calculations
    const summary = {
      total: periodReports.length,
      ouvert: periodReports.filter((r) => r.status === "Ouvert").length,
      enCours: periodReports.filter((r) => r.status === "En cours").length,
      resolu: periodReports.filter((r) => r.status === "Résolu").length,
      cloture: periodReports.filter((r) => r.status === "Clôturé").length,
      urgentCount: periodReports.filter((r) => r.priority === "Urgente").length,
      totalDuration: periodReports.reduce((s, r) => s + (r.duration || 0), 0),
      totalCost: periodReports.reduce((s, r) => s + (r.cost || 0), 0),
      validatedCount: periodReports.filter((r) => r.isValidated).length,
      constatCount: periodReports.filter((r) => r.reportType === "Constat").length,
      techniqueCount: periodReports.filter((r) => r.reportType === "Technique").length,
      suiviCount: periodReports.filter((r) => r.reportType === "Suivi").length,
    };

    // Group by unit
    const unitMap = new Map<string, { unitName: string; count: number; cost: number; duration: number; details: Report[] }>();
    periodReports.forEach((r) => {
      const existing = unitMap.get(r.unitName) || { unitName: r.unitName, count: 0, cost: 0, duration: 0, details: [] };
      existing.count++;
      existing.cost += r.cost || 0;
      existing.duration += r.duration || 0;
      existing.details.push(r);
      unitMap.set(r.unitName, existing);
    });
    const byUnit = Array.from(unitMap.values()).sort((a, b) => b.count - a.count);

    // Group by category
    const catMap = new Map<string, { categoryName: string; count: number; cost: number }>();
    periodReports.forEach((r) => {
      const existing = catMap.get(r.categoryName) || { categoryName: r.categoryName, count: 0, cost: 0 };
      existing.count++;
      existing.cost += r.cost || 0;
      catMap.set(r.categoryName, existing);
    });
    const byCategory = Array.from(catMap.values()).sort((a, b) => b.count - a.count);

    // Group by priority
    const priMap = new Map<string, number>([["Urgente", 0], ["Normale", 0], ["Basse", 0]]);
    periodReports.forEach((r) => priMap.set(r.priority, (priMap.get(r.priority) || 0) + 1));
    const byPriority = Array.from(priMap.entries()).map(([priority, count]) => ({
      priority,
      count,
      percentage: Math.round((count / (periodReports.length || 1)) * 100),
    }));

    // Group by status
    const statMap = new Map<string, number>([["Ouvert", 0], ["En cours", 0], ["Résolu", 0], ["Clôturé", 0]]);
    periodReports.forEach((r) => statMap.set(r.status, (statMap.get(r.status) || 0) + 1));
    const byStatus = Array.from(statMap.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / (periodReports.length || 1)) * 100),
    }));

    // Group by type
    const typeMap = new Map<string, number>([["Technique", 0], ["Suivi", 0], ["Constat", 0]]);
    periodReports.forEach((r) => typeMap.set(r.reportType, (typeMap.get(r.reportType) || 0) + 1));
    const byType = Array.from(typeMap.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / (periodReports.length || 1)) * 100),
    }));

    // Group by technician
    const techMap = new Map<string, { count: number; duration: number }>();
    periodReports.forEach((r) => {
      r.technicians.forEach((t) => {
        if (!t) return;
        const existing = techMap.get(t) || { count: 0, duration: 0 };
        existing.count++;
        existing.duration += r.duration || 0;
        techMap.set(t, existing);
      });
    });
    const byTechnician = Array.from(techMap.entries())
      .map(([name, v]) => ({ name, count: v.count, duration: v.duration }))
      .sort((a, b) => b.count - a.count);

    // Weekly trend (for monthly/annual)
    let weeklyTrend: { weekLabel: string; count: number }[] | undefined;
    let monthlyTrend: { monthLabel: string; count: number }[] | undefined;

    if (period === "mensuel" || period === "annuel") {
      // Group by week
      const weekBuckets = new Map<string, number>();
      periodReports.forEach((r) => {
        const d = new Date(r.createdAt);
        const weekStart = new Date(d);
        const day = d.getDay();
        const diff = day === 0 ? 6 : day - 1;
        weekStart.setDate(d.getDate() - diff);
        const key = weekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
        weekBuckets.set(key, (weekBuckets.get(key) || 0) + 1);
      });
      weeklyTrend = Array.from(weekBuckets.entries()).map(([weekLabel, count]) => ({ weekLabel, count }));
    }

    if (period === "annuel") {
      const monthBuckets = new Map<string, number>();
      periodReports.forEach((r) => {
        const d = new Date(r.createdAt);
        const key = d.toLocaleDateString("fr-FR", { month: "short" });
        monthBuckets.set(key, (monthBuckets.get(key) || 0) + 1);
      });
      monthlyTrend = Array.from(monthBuckets.entries()).map(([monthLabel, count]) => ({ monthLabel, count }));
    }

    // Separate interventions and constats
    const interventions = periodReports.filter((r) => r.reportType !== "Constat").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const constats = periodReports.filter((r) => r.reportType === "Constat").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const bilanData: BilanData = {
      period,
      periodLabel: label,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      generatedAt: new Date().toISOString(),
      companyName: settings.companyName || "EPIC EGCSO",
      departmentName: settings.departmentName || "Service Maintenance",
      summary,
      byUnit,
      byCategory,
      byPriority,
      byStatus,
      byType,
      byTechnician,
      weeklyTrend,
      monthlyTrend,
      interventions,
      constats,
    };

    if (format === "html") {
      const html = generateBilanHTML(bilanData);
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return NextResponse.json(bilanData);
  } catch (err: any) {
    return NextResponse.json({ error: "Erreur de génération du bilan: " + err.message }, { status: 500 });
  }
}


const statusColors: Record<string, string> = { "Ouvert": "#ea580c", "En cours": "#2563eb", "Résolu": "#16a34a", "Clôturé": "#4b5563" };
const priorityColors: Record<string, string> = { "Urgente": "#dc2626", "Normale": "#0d9488", "Basse": "#6b7280" };

const fmtDuration = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

const fmtCost = (c: number) => c.toLocaleString("fr-DZ") + " DZD";

function renderInterventionRow(r: Report): string {
    const pColor = priorityColors[r.priority] || '#6b7280';
    const sColor = statusColors[r.status] || '#4b5563';
    return '<tr>' +
      '<td style="font-family:monospace;font-weight:700;color:#065f46;white-space:nowrap">' + escapeHtml(r.reference) + '</td>' +
      '<td style="white-space:nowrap">' + new Date(r.createdAt).toLocaleDateString('fr-FR') + '</td>' +
      '<td>' + escapeHtml(r.unitName) + ' <span style="color:#9ca3af">· ' + escapeHtml(r.zone) + ' · ' + escapeHtml(r.subzone) + '</span></td>' +
      '<td>' + escapeHtml(r.categoryName) + '</td>' +
      '<td><span class="badge" style="background:' + pColor + '20;color:' + pColor + '">' + r.priority + '</span></td>' +
      '<td><span class="badge" style="background:' + sColor + '20;color:' + sColor + '">' + r.status + '</span></td>' +
      '<td>' + (r.technicians && r.technicians.length ? r.technicians.map(escapeHtml).join(', ') : '—') + '</td>' +
      '<td>' + fmtDuration(r.duration) + '</td>' +
      '<td>' + fmtCost(r.cost) + '</td>' +
      '</tr>';
  }

  function renderConstatRow(r: Report): string {
    const pColor = priorityColors[r.priority] || '#6b7280';
    const sColor = statusColors[r.status] || '#4b5563';
    return '<tr>' +
      '<td style="font-family:monospace;font-weight:700;color:#065f46;white-space:nowrap">' + escapeHtml(r.reference) + '</td>' +
      '<td style="white-space:nowrap">' + new Date(r.createdAt).toLocaleDateString('fr-FR') + '</td>' +
      '<td>' + escapeHtml(r.unitName) + ' <span style="color:#9ca3af">· ' + escapeHtml(r.zone) + '</span></td>' +
      '<td>' + escapeHtml(r.categoryName) + '</td>' +
      '<td><span class="badge" style="background:' + pColor + '20;color:' + pColor + '">' + r.priority + '</span></td>' +
      '<td><span class="badge" style="background:' + sColor + '20;color:' + sColor + '">' + r.status + '</span></td>' +
      '<td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(r.description) + '</td>' +
      '</tr>';
  }

  function renderReportTable(reports: Report[], columns: string[]): string {
    if (reports.length === 0) return '';
    const isIntervention = columns.includes('Durée');
    const rows = reports.map(isIntervention ? renderInterventionRow : renderConstatRow).join('');
    return '<table><thead><tr>' + columns.map(c => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>' + rows + '</tbody></table>';
  }

function generateBilanHTML(data: BilanData): string {
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(data.periodLabel)} — ${escapeHtml(data.companyName)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1f2937; background: #f3f4f6; margin: 0; padding: 40px 20px; }
    .container { max-width: 1000px; margin: 0 auto; background: #fff; padding: 50px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #065f46; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { font-size: 22px; color: #065f46; margin: 0 0 4px 0; font-weight: 800; }
    .header h2 { font-size: 13px; color: #4b5563; margin: 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .header-right { text-align: right; }
    .header-right .period-badge { font-size: 14px; font-weight: 700; color: #065f46; background: #ecfdf5; border: 1px dashed #10b981; padding: 8px 16px; border-radius: 4px; display: inline-block; }
    .header-right .gen-date { font-size: 11px; color: #6b7280; margin-top: 6px; }
    .section { margin-top: 35px; }
    .section-title { font-size: 15px; color: #065f46; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.025em; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 10px; }
    .kpi-card { background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 18px; text-align: center; }
    .kpi-card .kpi-value { font-size: 28px; font-weight: 800; color: #0f172a; }
    .kpi-card .kpi-label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 2px; }
    .kpi-card.highlight { background: #ecfdf5; border-color: #a7f3d0; }
    .kpi-card.highlight .kpi-value { color: #065f46; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
    th { background: #f3f4f6; color: #374151; text-align: left; padding: 10px; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
    td { padding: 9px 10px; border-bottom: 1px solid #f3f4f6; color: #374151; }
    tr:hover td { background: #f9fafb; }
    .badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; display: inline-block; }
    .bar-container { display: flex; align-items: center; gap: 8px; }
    .bar { height: 8px; border-radius: 4px; background: #065f46; }
    .bar-pct { font-size: 11px; color: #6b7280; font-weight: 600; min-width: 35px; text-align: right; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; }
    .no-print-toolbar { max-width: 1000px; margin: 0 auto 20px auto; background: #fff; padding: 15px 20px; border-radius: 8px; border: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .btn { background-color: #065f46; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; display: inline-flex; align-items: center; gap: 8px; }
    .btn:hover { background-color: #059669; }
    .btn-secondary { background-color: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
    .btn-secondary:hover { background-color: #e5e7eb; }
    .signatures { margin-top: 50px; display: flex; justify-content: space-between; gap: 30px; }
    .signature-box { border: 1px dashed #cbd5e1; border-radius: 6px; padding: 20px; flex: 1; background: #fafcfd; }
    .signature-title { font-size: 12px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 40px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .signature-line { border-top: 1px solid #94a3b8; margin-top: 30px; text-align: center; padding-top: 5px; font-size: 12px; color: #475569; }
    .page-break { page-break-before: always; }
    .observation-note { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 14px 18px; font-size: 13px; color: #92400e; margin-top: 15px; }
    @media print {
      body { background: #fff; color: #000; padding: 0; margin: 0; }
      .container { box-shadow: none; border: none; padding: 0; max-width: 100%; }
      .no-print-toolbar { display: none !important; }
      .kpi-card { border: 1px solid #000; background: #fff !important; }
      .kpi-card.highlight { background: #f0fdf4 !important; }
      th { background: #f3f4f6 !important; border-bottom: 2px solid #000; }
      td { border-bottom: 1px solid #ddd; }
      .signature-box { border: 1px solid #000; background: #fff !important; }
      .observation-note { border: 1px solid #000; background: #fffbeb !important; }
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <script>
    function downloadPdfBinary() {
      const element = document.querySelector('.container');
      const opt = {
        margin: [8, 8, 8, 8],
        filename: 'Bilan_Maintenance_EGCSO.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };
      if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(element).save();
      } else {
        window.print();
      }
    }
  </script>
</head>
<body>
  <div class="no-print-toolbar">
    <div><span style="font-size:14px;font-weight:700;color:#065f46;">Bilan de Maintenance EGCSO</span></div>
    <div style="display:flex;gap:10px;">
      <button onclick="downloadPdfBinary()" class="btn" style="background:#065f46;color:#fff;">📥 Télécharger le fichier PDF (.pdf)</button>
      <button onclick="window.print()" class="btn btn-secondary">🖨 Imprimer la page</button>
      <button onclick="window.close()" class="btn btn-secondary">Fermer</button>
    </div>
  </div>
  <div class="container">
    <div class="header">
      <div style="display:flex;align-items:center;gap:14px;">
        <img src="/icon.png" alt="EGCSO" style="width:48px;height:48px;object-fit:contain;border-radius:6px;border:1px solid #d1d5db;background:#fff;padding:2px;" />
        <div>
          <h1>${escapeHtml(data.companyName)}</h1>
          <h2>${escapeHtml(data.departmentName)}</h2>
          <div style="font-size:12px;color:#6b7280;font-weight:500;margin-top:2px;">Complexe Sportif d'Oran — Algérie</div>
        </div>
      </div>
      <div class="header-right">
        <div class="period-badge">${escapeHtml(data.periodLabel)}</div>
        <div class="gen-date">Généré le ${fmtDate(data.generatedAt)}</div>
      </div>
    </div>

    <!-- KPI Summary -->
    <div class="section">
      <div class="section-title">Synthèse des Activités</div>
      <div class="kpi-grid">
        <div class="kpi-card highlight"><div class="kpi-value">${data.summary.total}</div><div class="kpi-label">Total Rapports</div></div>
        <div class="kpi-card"><div class="kpi-value" style="color:#ea580c">${data.summary.ouvert}</div><div class="kpi-label">Ouverts</div></div>
        <div class="kpi-card"><div class="kpi-value" style="color:#2563eb">${data.summary.enCours}</div><div class="kpi-label">En cours</div></div>
        <div class="kpi-card"><div class="kpi-value" style="color:#16a34a">${data.summary.resolu + data.summary.cloture}</div><div class="kpi-label">Résolus / Clôturés</div></div>
      </div>
      <div class="kpi-grid" style="margin-top:12px;grid-template-columns:repeat(4,1fr);">
        <div class="kpi-card"><div class="kpi-value">${fmtDuration(data.summary.totalDuration)}</div><div class="kpi-label">Temps Total</div></div>
        <div class="kpi-card"><div class="kpi-value" style="font-size:20px">${fmtCost(data.summary.totalCost)}</div><div class="kpi-label">Coût Total</div></div>
        <div class="kpi-card"><div class="kpi-value" style="color:#dc2626">${data.summary.urgentCount}</div><div class="kpi-label">Urgentes</div></div>
        <div class="kpi-card"><div class="kpi-value">${data.summary.validatedCount}</div><div class="kpi-label">Validés</div></div>
      </div>
    </div>

    <!-- Distribution -->
    <div class="section two-col">
      <div>
        <div class="section-title">Répartition par Unité</div>
        <table><thead><tr><th>Unité</th><th style="width:60px;text-align:center">Nb</th><th>Coût</th></tr></thead><tbody>
        ${data.byUnit.map(u => `<tr><td style="font-weight:600">${escapeHtml(u.unitName)}</td><td style="text-align:center;font-weight:700">${u.count}</td><td>${fmtCost(u.cost)}</td></tr>`).join("")}
        </tbody></table>
      </div>
      <div>
        <div class="section-title">Répartition par Statut</div>
        <table><thead><tr><th>Statut</th><th style="width:60px;text-align:center">Nb</th><th>Proportion</th></tr></thead><tbody>
        ${data.byStatus.map(s => `<tr><td style="font-weight:600;color:${statusColors[s.status] || "#000"}">${s.status}</td><td style="text-align:center;font-weight:700">${s.count}</td><td><div class="bar-container"><div class="bar" style="width:${s.percentage}%;max-width:200px;"></div><span class="bar-pct">${s.percentage}%</span></div></td></tr>`).join("")}
        </tbody></table>
      </div>
    </div>

    <div class="section two-col">
      <div>
        <div class="section-title">Domaines de Panne</div>
        <table><thead><tr><th>Domaine</th><th style="width:60px;text-align:center">Nb</th><th>Coût</th></tr></thead><tbody>
        ${data.byCategory.map(c => `<tr><td style="font-weight:600">${escapeHtml(c.categoryName)}</td><td style="text-align:center;font-weight:700">${c.count}</td><td>${fmtCost(c.cost)}</td></tr>`).join("")}
        </tbody></table>
      </div>
      <div>
        <div class="section-title">Interventions par Technicien</div>
        <table><thead><tr><th>Technicien</th><th style="width:60px;text-align:center">Nb</th><th>Durée</th></tr></thead><tbody>
        ${data.byTechnician.map(t => `<tr><td style="font-weight:600">${escapeHtml(t.name)}</td><td style="text-align:center;font-weight:700">${t.count}</td><td>${fmtDuration(t.duration)}</td></tr>`).join("")}
        </tbody></table>
      </div>
    </div>

    <!-- Trend -->
    ${(data.weeklyTrend && data.weeklyTrend.length > 0) ? `
    <div class="section">
      <div class="section-title">Évolution par Semaine</div>
      <table><thead><tr><th>Semaine</th><th style="width:80px;text-align:center">Nombre</th><th>Volume</th></tr></thead><tbody>
      ${data.weeklyTrend.map(w => { const maxC = Math.max(...data.weeklyTrend!.map(x => x.count), 1); return `<tr><td style="font-weight:600">${escapeHtml(w.weekLabel)}</td><td style="text-align:center;font-weight:700">${w.count}</td><td><div class="bar-container"><div class="bar" style="width:${Math.round((w.count / maxC) * 100)}%;max-width:250px;"></div></div></td></tr>`; }).join("")}
      </tbody></table>
    </div>` : ""}

    ${(data.monthlyTrend && data.monthlyTrend.length > 0) ? `
    <div class="section">
      <div class="section-title">Évolution par Mois</div>
      <table><thead><tr><th>Mois</th><th style="width:80px;text-align:center">Nombre</th><th>Volume</th></tr></thead><tbody>
      ${data.monthlyTrend.map(w => { const maxC = Math.max(...data.monthlyTrend!.map(x => x.count), 1); return `<tr><td style="font-weight:600">${escapeHtml(w.monthLabel)}</td><td style="text-align:center;font-weight:700">${w.count}</td><td><div class="bar-container"><div class="bar" style="width:${Math.round((w.count / maxC) * 100)}%;max-width:250px;"></div></div></td></tr>`; }).join("")}
      </tbody></table>
    </div>` : ""}

    <!-- Detailed Interventions -->
    <div class="page-break"></div>
    <div class="section">
      <div class="section-title">Détail des Interventions Techniques et Suivis (${data.interventions.length})</div>
      ${data.interventions.length === 0 ? `<p style="color:#9ca3af;font-style:italic">Aucune intervention pour cette période.</p>` : `
      <table><thead><tr><th>Référence</th><th>Date</th><th>Localisation</th><th>Domaine</th><th>Priorité</th><th>Statut</th><th>Technicien(s)</th><th>Durée</th><th>Coût</th></tr></thead><tbody>
      ${data.interventions.map(r => `<tr>
        <td style="font-family:monospace;font-weight:700;color:#065f46;white-space:nowrap">${escapeHtml(r.reference)}</td>
        <td style="white-space:nowrap">${new Date(r.createdAt).toLocaleDateString("fr-FR")}</td>
        <td>${escapeHtml(r.unitName)} <span style="color:#9ca3af">· ${escapeHtml(r.zone)} · ${escapeHtml(r.subzone)}</span></td>
        <td>${escapeHtml(r.categoryName)}</td>
        <td><span class="badge" style="background:${priorityColors[r.priority] || "#6b7280"}20;color:${priorityColors[r.priority] || "#6b7280"}">${r.priority}</span></td>
        <td><span class="badge" style="background:${statusColors[r.status] || "#4b5563"}20;color:${statusColors[r.status] || "#4b5563"}">${r.status}</span></td>
        <td>${r.technicians.map(escapeHtml).join(", ") || "—"}</td>
        <td>${fmtDuration(r.duration)}</td>
        <td>${fmtCost(r.cost)}</td>
      </tr>`).join("")}
      </tbody></table>`}
    </div>

    <!-- Constats -->
    <div class="section">
      <div class="section-title">Constats Enregistrés (${data.constats.length})</div>
      ${data.constats.length === 0 ? `<p style="color:#9ca3af;font-style:italic">Aucun constat pour cette période.</p>` : `
      <table><thead><tr><th>Référence</th><th>Date</th><th>Localisation</th><th>Domaine</th><th>Priorité</th><th>Statut</th><th>Description</th></tr></thead><tbody>
      ${data.constats.map(r => `<tr>
        <td style="font-family:monospace;font-weight:700;color:#065f46;white-space:nowrap">${escapeHtml(r.reference)}</td>
        <td style="white-space:nowrap">${new Date(r.createdAt).toLocaleDateString("fr-FR")}</td>
        <td>${escapeHtml(r.unitName)} <span style="color:#9ca3af">· ${escapeHtml(r.zone)}</span></td>
        <td>${escapeHtml(r.categoryName)}</td>
        <td><span class="badge" style="background:${priorityColors[r.priority] || "#6b7280"}20;color:${priorityColors[r.priority] || "#6b7280"}">${r.priority}</span></td>
        <td><span class="badge" style="background:${statusColors[r.status] || "#4b5563"}20;color:${statusColors[r.status] || "#4b5563"}">${r.status}</span></td>
        <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.description)}</td>
      </tr>`).join("")}
      </tbody></table>`}
    </div>

    ${data.summary.urgentCount > 0 ? `<div class="observation-note">
      <strong>\u26A0 Attention :</strong> ${data.summary.urgentCount} intervention(s) classée(s) en priorité <strong>Urgente</strong> sur cette période nécessitent un suivi particulier de la direction technique.
    </div>` : ""}

    <div class="signatures">
      <div class="signature-box">
        <div class="signature-title">Le Chef de Service Maintenance</div>
        <div style="height:35px;"></div>
        <div class="signature-line">Nom, Prénom, Date et Visa</div>
      </div>
      <div class="signature-box">
        <div class="signature-title">Le Directeur Technique EGCSO</div>
        <div style="height:35px;"></div>
        <div class="signature-line">Nom, Prénom, Date et Visa</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
