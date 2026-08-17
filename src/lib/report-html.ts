import type { Report, AppSettings } from "@/types";
import { escapeHtml } from "@/lib/storage";

export function generateReportHTML(report: Report, settings: AppSettings): string {
  const statusColors = {
    Ouvert: { bg: "#fff7ed", text: "#ea580c", border: "#ffedd5" },
    "En cours": { bg: "#eff6ff", text: "#2563eb", border: "#dbeafe" },
    Résolu: { bg: "#f0fdf4", text: "#16a34a", border: "#dcfce7" },
    Clôturé: { bg: "#f9fafb", text: "#4b5563", border: "#f3f4f6" },
  };

  const priorityColors = {
    Urgente: { bg: "#fef2f2", text: "#dc2626", border: "#fee2e2" },
    Normale: { bg: "#f0fdfa", text: "#0d9488", border: "#ccfbf1" },
    Basse: { bg: "#f9fafb", text: "#6b7280", border: "#f3f4f6" },
  };

  const statusStyle = statusColors[report.status] || statusColors["Ouvert"];
  const priorityStyle = priorityColors[report.priority] || priorityColors["Normale"];

  const partsRows =
    report.parts.length > 0
      ? report.parts
          .map(
            (p) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #374151;">${escapeHtml(p.name)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #374151; text-align: center;">${p.quantity}</td>
        </tr>`
          )
          .join("")
      : `<tr><td colspan="2" style="padding: 15px; text-align: center; color: #9ca3af; font-style: italic;">Aucune pièce de rechange utilisée</td></tr>`;

  const beforePhotos = report.photos.filter((p) => p.phase === "before");
  const afterPhotos = report.photos.filter((p) => p.phase === "after");

  const renderPhotosSection = (
    title: string,
    photos: typeof report.photos
  ) => {
    if (photos.length === 0) return "";
    return `
      <div style="margin-top: 20px;">
        <h4 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #4b5563; margin-bottom: 10px; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px;">${title}</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
          ${photos
            .map(
              (p) => `
            <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px; background-color: #fafafa; text-align: center;">
              <img src="/api/reports/photo/${report.reference}/${p.name}" style="max-width: 100%; max-height: 200px; border-radius: 4px; object-fit: contain;" alt="${p.name}" />
              <div style="font-size: 11px; color: #6b7280; margin-top: 5px; font-weight: 500;">${escapeHtml(p.name)}</div>
            </div>`
            )
            .join("")}
        </div>
      </div>`;
  };

  const renderAudioSection = () => {
    if (!report.audioNotes || report.audioNotes.length === 0) return "";
    return `
      <div class="section-title">Notes Vocales / Enregistrements techniques</div>
      <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
        ${report.audioNotes
          .map(
            (audio) => `
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 16px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 15px;">
            <div style="font-size: 13px; font-weight: 700; color: #065f46; display: flex; align-items: center; gap: 10px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #065f46; flex-shrink: 0;"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
              <span>Note Vocale / Enregistrement Audio joint au rapport</span>
            </div>
            <div class="no-print" style="flex: 1; max-width: 300px;">
              <audio controls src="/api/reports/audio/${report.reference}/${audio.name}" style="width: 100%; height: 34px;"></audio>
            </div>
            <div class="only-print" style="font-size: 11px; color: #047857; font-style: italic; font-weight: 600;">
              Enregistrement audio joint disponible dans l'application
            </div>
          </div>`
          )
          .join("")}
      </div>`;
  };

  const formattedDate = new Date(report.createdAt).toLocaleString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const chiefName = settings.chiefMaintenanceName || "BOUARFA HAKIM";
  const techNames = report.technicians && report.technicians.length > 0
    ? report.technicians.join(", ")
    : (report.author || "Technicien EGCSO");

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport de Maintenance - ${report.reference}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f3f4f6; margin: 0; padding: 40px 20px; }
    .container { max-width: 800px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); border: 1px solid #e5e7eb; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #065f46; padding-bottom: 20px; margin-bottom: 25px; }
    .header-left h1 { font-size: 24px; color: #065f46; margin: 0 0 5px 0; font-weight: 800; }
    .header-left h2 { font-size: 14px; color: #4b5563; margin: 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .header-right { text-align: right; }
    .ref-badge { font-size: 16px; font-weight: 700; color: #065f46; background-color: #ecfdf5; border: 1px dashed #10b981; padding: 6px 12px; border-radius: 4px; display: inline-block; margin-bottom: 8px; }
    .report-type-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: #ffffff; background-color: #065f46; padding: 3px 8px; border-radius: 3px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; background-color: #f9fafb; padding: 20px; border-radius: 6px; border: 1px solid #f3f4f6; }
    .meta-item { font-size: 13px; }
    .meta-label { font-weight: 600; color: #4b5563; display: inline-block; width: 150px; }
    .meta-value { color: #111827; font-weight: 500; }
    .section-title { font-size: 16px; color: #065f46; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin-top: 30px; margin-bottom: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.025em; }
    .text-content { background-color: #fefefe; border: 1px solid #f3f4f6; padding: 15px; border-radius: 6px; font-size: 14px; white-space: pre-wrap; color: #374151; }
    .badge { font-size: 12px; font-weight: 600; padding: 3px 8px; border-radius: 12px; display: inline-block; }
    .parts-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px; }
    .parts-table th { background-color: #f3f4f6; color: #374151; text-align: left; padding: 10px; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
    .duration-cost { display: flex; justify-content: space-between; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px 25px; margin-top: 20px; }
    .duration-cost-item { text-align: center; }
    .duration-cost-label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .duration-cost-value { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 4px; }
    .signatures { margin-top: 40px; display: flex; justify-content: space-between; gap: 30px; }
    .signature-box { border: 1px dashed #cbd5e1; border-radius: 6px; padding: 20px; flex: 1; background-color: #fafcfd; }
    .signature-title { font-size: 12px; text-transform: uppercase; font-weight: 800; color: #065f46; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .signature-line { border-top: 1px solid #94a3b8; margin-top: 35px; text-align: center; padding-top: 5px; font-size: 11px; color: #475569; }
    .no-print-toolbar { max-width: 800px; margin: 0 auto 20px auto; background-color: #ffffff; padding: 15px 20px; border-radius: 8px; border: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .btn { background-color: #065f46; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 13px; display: inline-flex; align-items: center; gap: 8px; text-decoration: none; transition: background-color 0.2s; }
    .btn:hover { background-color: #059669; }
    .btn-secondary { background-color: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
    .btn-secondary:hover { background-color: #e5e7eb; }
    .only-print { display: none !important; }
    @media print {
      body { background-color: #ffffff; color: #000000; padding: 0; margin: 0; }
      .container { box-shadow: none; border: none; padding: 0; max-width: 100%; }
      .no-print-toolbar, .no-print { display: none !important; }
      .only-print { display: block !important; }
      .meta-grid { background-color: #ffffff !important; border: 1px solid #000000 !important; }
      .text-content { border: 1px solid #cccccc !important; background-color: #ffffff !important; }
      .duration-cost { background-color: #ffffff !important; border: 1px solid #000000 !important; }
      .signature-box { background-color: #ffffff !important; border: 1px solid #000000 !important; }
    }
  </style>
  <script>
    function downloadPdfBinary() {
      const element = document.querySelector('.container');
      const toolbar = document.querySelector('.no-print-toolbar');
      if (toolbar) toolbar.style.display = 'none';
      
      const opt = {
        margin: 8,
        filename: 'Rapport_${report.reference}.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(element).save().then(() => {
          if (toolbar) toolbar.style.display = 'flex';
        });
      } else {
        window.print();
        if (toolbar) toolbar.style.display = 'flex';
      }
    }
  </script>
</head>
<body>
  <div class="no-print-toolbar">
    <div><span style="font-size: 14px; font-weight: 700; color: #065f46;">Rapport de Maintenance Officiel</span></div>
    <div style="display: flex; gap: 10px;">
      <button onclick="downloadPdfBinary()" class="btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
        Télécharger Vrai PDF (.pdf)
      </button>
      <button onclick="window.print()" class="btn btn-secondary">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5"/><rect width="12" height="8" x="6" y="14" rx="1"/></svg>
        Imprimer (Papier)
      </button>
      <button onclick="window.close()" class="btn btn-secondary">Fermer</button>
    </div>
  </div>
  <div class="container">
    <div class="header">
      <div style="display: flex; align-items: center; gap: 15px;">
        <img src="/icon.png" style="width: 52px; height: 52px; object-fit: contain; border-radius: 8px; border: 1px solid #d1d5db;" alt="EGCSO" />
        <div class="header-left">
          <h1>${settings.companyName || "EPIC EGCSO"}</h1>
          <h2>${settings.departmentName || "Service Maintenance"}</h2>
          <div style="font-size: 12px; color: #6b7280; font-weight: 500; margin-top: 2px;">Complexe Sportif d'Oran - Algérie</div>
        </div>
      </div>
      <div class="header-right">
        <div class="ref-badge">${report.reference}</div>
        <div><span class="report-type-label">${report.reportType === "Technique" ? "RAPPORT TECHNIQUE" : report.reportType === "Suivi" ? "RAPPORT DE SUIVI" : "CONSTAT"}</span></div>
      </div>
    </div>
    <div class="meta-grid">
      <div class="meta-item"><span class="meta-label">Date de rédaction:</span><span class="meta-value">${formattedDate}</span></div>
      <div class="meta-item"><span class="meta-label">Unité du Complexe:</span><span class="meta-value">${escapeHtml(report.unitName)}</span></div>
      <div class="meta-item"><span class="meta-label">Zone / Bloc:</span><span class="meta-value">${escapeHtml(report.zone)}</span></div>
      <div class="meta-item"><span class="meta-label">Sous-zone / Étage:</span><span class="meta-value">${escapeHtml(report.subzone)}</span></div>
      <div class="meta-item"><span class="meta-label">Domaine / Catégorie:</span><span class="meta-value">${escapeHtml(report.categoryName)}</span></div>
      <div class="meta-item"><span class="meta-label">Priorité d'intervention:</span><span class="badge" style="background-color: ${priorityStyle.bg}; color: ${priorityStyle.text}; border: 1px solid ${priorityStyle.border};">${report.priority}</span></div>
      <div class="meta-item"><span class="meta-label">Statut du dossier:</span><span class="badge" style="background-color: ${statusStyle.bg}; color: ${statusStyle.text}; border: 1px solid ${statusStyle.border};">${report.status}</span></div>
      <div class="meta-item"><span class="meta-label">Rédacteur:</span><span class="meta-value">${escapeHtml(report.author)}</span></div>
      <div class="meta-item" style="grid-column: span 2;"><span class="meta-label" style="width: 150px;">Technicien(s):</span><span class="meta-value">${escapeHtml(techNames)}</span></div>
      ${report.linkedReportId ? `<div class="meta-item" style="grid-column: span 2; border-top: 1px dashed #e5e7eb; padding-top: 10px; margin-top: 5px;"><span class="meta-label" style="width: 150px;">Rapport d'origine lié:</span><span class="meta-value" style="color: #2563eb; font-weight: 600;">${escapeHtml(report.linkedReportId)}</span></div>` : ""}
      ${report.nextVisitDate ? `<div class="meta-item" style="grid-column: span 2;"><span class="meta-label" style="width: 150px;">Prochaine visite prévue:</span><span class="meta-value" style="color: #ea580c; font-weight: 600;">${new Date(report.nextVisitDate).toLocaleDateString("fr-FR")}</span></div>` : ""}
    </div>
    <div class="section-title">Description de la Panne / Constat</div>
    <div class="text-content">${escapeHtml(report.description) || "Aucune description fournie."}</div>
    ${report.reportType !== "Constat" ? `<div class="section-title">Actions Réalisées et Solutions Apportées</div><div class="text-content">${escapeHtml(report.actions) || "Aucune action documentée."}</div>` : ""}
    ${report.reportType !== "Constat" ? `<div class="section-title">Pièces de Rechange et Matériel Utilisés</div><table class="parts-table"><thead><tr><th>Désignation de la pièce / matériel</th><th style="width: 120px; text-align: center;">Quantité</th></tr></thead><tbody>${partsRows}</tbody></table>` : ""}
    ${report.reportType !== "Constat" ? `<div class="duration-cost"><div class="duration-cost-item"><div class="duration-cost-label">Durée d'intervention</div><div class="duration-cost-value">${Math.floor(report.duration / 60) > 0 ? `${Math.floor(report.duration / 60)}h ` : ""}${report.duration % 60} min</div></div><div class="duration-cost-item" style="border-left: 1px solid #cbd5e1; padding-left: 40px;"><div class="duration-cost-label">Coût estimé du matériel</div><div class="duration-cost-value">${report.cost.toLocaleString("fr-DZ")} DZD</div></div></div>` : ""}
    ${beforePhotos.length > 0 || afterPhotos.length > 0 ? `<div class="section-title">Documentation Photographique</div>${renderPhotosSection("Photographies Avant Intervention / Constat", beforePhotos)}${renderPhotosSection("Photographies Après Intervention", afterPhotos)}` : ""}
    ${renderAudioSection()}
    ${report.additionalObservations ? `<div class="section-title">Observations Complémentaires</div><div class="text-content">${escapeHtml(report.additionalObservations)}</div>` : ""}
    <div class="signatures">
      <div class="signature-box">
        <div class="signature-title">Techniciens</div>
        <div style="font-size: 14px; font-weight: 700; color: #065f46; margin-bottom: 5px;">${escapeHtml(techNames)}</div>
        <div style="font-size: 11px; color: #16a34a; font-weight: 600; display: flex; align-items: center; gap: 4px; margin-top: 6px;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>Signature des intervenants validée</div>
        <div class="signature-line">Date: ${new Date(report.createdAt).toLocaleDateString("fr-FR")}</div>
      </div>
      <div class="signature-box">
        <div class="signature-title">VISA CHEF SERVICE MAINTENANCE</div>
        <div style="font-size: 14px; font-weight: 800; color: #065f46; margin-top: 4px; margin-bottom: 25px;">${escapeHtml(chiefName)}</div>
        <div class="signature-line">Nom, Date et Visa</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
