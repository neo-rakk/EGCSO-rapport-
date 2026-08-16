import React, { useMemo, useState } from "react";
import { ClipboardList, Printer, Building2 } from "lucide-react";
import { Unit } from "../types";

interface BlankFollowUpSheetProps {
  units: Unit[];
  companyName: string;
  departmentName: string;
}

const inspectionSections = [
  {
    title: "Électricité",
    items: ["TV", "Climatiseur", "Frigo", "Lampes", "Interrupteurs", "Prises électriques", "Tableau électrique", "Télécommande / accessoires"]
  },
  {
    title: "Plomberie",
    items: ["Évier / Lavabo", "WC", "Douche", "Flexibles", "Robinetterie", "Fuite d'eau", "Canalisation bouchée", "Siphon / évacuation"]
  },
  {
    title: "Mobilier et menuiserie",
    items: ["Bureau", "Rangement / placard", "Lit", "Matelas", "Fenêtre", "Porte", "Serrure / poignée", "Chaise / fauteuil"]
  },
  {
    title: "Sécurité et propreté",
    items: ["Détecteur / alarme", "Extincteur", "Signalisation", "Rideaux / stores", "Murs / peinture", "Sol", "Plafond", "Observation générale"]
  }
];

const states = ["Neuf", "Normal", "Dégradé", "En panne"];

export default function BlankFollowUpSheet({ units, companyName, departmentName }: BlankFollowUpSheetProps) {
  const [selectedUnitId, setSelectedUnitId] = useState(units[0]?.id || "");
  const selectedUnit = useMemo(
    () => units.find(unit => unit.id === selectedUnitId) || units[0],
    [selectedUnitId, units]
  );

  return (
    <div className="space-y-6" id="blank-follow-up-screen">
      <div className="no-print bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Fiche vierge de suivi</h2>
            <p className="text-sm text-slate-500 font-medium max-w-2xl">
              Imprimez une fiche à vide par unité pour le contrôle des chambres, blocs, étages et équipements. La fiche peut être remplie manuellement puis transmise au chef service maintenance.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="space-y-1 min-w-72">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Unité à imprimer
            </label>
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800"
            >
              {units.map(unit => (
                <option key={unit.id} value={unit.id}>{unit.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4.5 h-4.5" /> Imprimer la fiche vierge
          </button>
        </div>
      </div>

      <div className="print-sheet bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-slate-900">
        <header className="border-b-4 border-emerald-800 pb-4 mb-5 flex justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-emerald-900">{companyName || "EPIC EGCSO"}</h1>
            <p className="text-sm font-bold uppercase tracking-wide text-slate-600">{departmentName || "Service Maintenance"}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Traçabilité des contrôles et interventions</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-extrabold text-slate-900 uppercase">Fiche vierge de suivi</div>
            <div className="text-sm font-bold text-emerald-800">Unité : {selectedUnit?.name || "À renseigner"}</div>
            <div className="text-xs text-slate-500">Date : ____ / ____ / ______</div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 text-sm mb-5">
          <div className="field-line"><span>Unité</span><strong>{selectedUnit?.name || ""}</strong></div>
          <div className="field-line"><span>Nom de bloc / zone</span><em></em></div>
          <div className="field-line"><span>Étage / sous-zone</span><em></em></div>
          <div className="field-line"><span>N° de chambre / local</span><em></em></div>
          <div className="field-line col-span-2"><span>Occupant / responsable du local</span><em></em></div>
        </section>

        <div className="space-y-4">
          {inspectionSections.map(section => (
            <section key={section.title} className="avoid-break">
              <h2 className="section-heading">Section {section.title}</h2>
              <table className="check-table">
                <thead>
                  <tr>
                    <th>Élément à vérifier</th>
                    {states.map(state => <th key={state}>{state}</th>)}
                    <th>Observation / problème constaté</th>
                  </tr>
                </thead>
                <tbody>
                  {section.items.map(item => (
                    <tr key={item}>
                      <td className="item-cell">{item}</td>
                      {states.map(state => <td key={state} className="box-cell"><span aria-label={state}></span></td>)}
                      <td className="observation-cell"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>

        <section className="mt-5 avoid-break">
          <h2 className="section-heading">Suite à donner / intervention demandée</h2>
          <div className="notes-box"></div>
        </section>

        <footer className="signature-grid avoid-break">
          <div className="signature-card">
            <div className="signature-title">Visa Chef service suivi</div>
            <div className="signature-line">Nom, date et signature</div>
          </div>
          <div className="signature-card">
            <div className="signature-title">Visa Chef d'unité</div>
            <div className="signature-line">Nom, date et signature</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
