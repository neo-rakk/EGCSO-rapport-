import React, { useMemo, useState } from "react";
import { ClipboardList, Printer, Building2 } from "lucide-react";
import { Unit } from "../types";

interface BlankFollowUpSheetProps {
  units: Unit[];
  companyName: string;
  departmentName: string;
}

type InspectionSection = {
  title: string;
  items: string[];
};

type UnitTemplate = {
  locationLabels: {
    zone: string;
    subzone: string;
    room: string;
    occupant: string;
  };
  sections: InspectionSection[];
};

const defaultTemplate: UnitTemplate = {
  locationLabels: {
    zone: "Zone / bloc",
    subzone: "Sous-zone / niveau",
    room: "Local / espace",
    occupant: "Responsable du local"
  },
  sections: [
    {
      title: "Électricité",
      items: ["Éclairage LED", "Interrupteurs", "Prises électriques", "Tableau électrique", "Coffrets / disjoncteurs", "Câblage apparent", "Éclairage de secours", "Observation électrique"]
    },
    {
      title: "Plomberie / réseaux",
      items: ["Robinetterie", "Évacuation", "Fuite d'eau", "Canalisation bouchée", "Sanitaires", "Flexibles", "Vannes", "Observation plomberie"]
    },
    {
      title: "Bâtiment et équipements",
      items: ["Porte", "Fenêtre", "Serrure / poignée", "Sol", "Murs / peinture", "Plafond", "Mobilier fixe", "Observation générale"]
    },
    {
      title: "Sécurité et exploitation",
      items: ["Extincteur", "Signalisation", "Issues de secours", "Propreté", "Accès technique", "Protection usagers", "Anomalie à signaler", "Priorité maintenance"]
    }
  ]
};

const unitTemplates: Record<string, UnitTemplate> = {
  VIL: {
    locationLabels: {
      zone: "Nom de bloc",
      subzone: "Étage",
      room: "N° de chambre / local",
      occupant: "Occupant / responsable du local"
    },
    sections: [
      {
        title: "Électricité chambre / bloc",
        items: ["TV", "Climatiseur", "Frigo", "Lampes", "Interrupteurs", "Prises électriques", "Tableau électrique", "Télécommande / accessoires"]
      },
      {
        title: "Plomberie chambre / sanitaires",
        items: ["Évier / lavabo", "WC", "Douche", "Flexibles", "Robinetterie", "Fuite d'eau", "Canalisation bouchée", "Siphon / évacuation"]
      },
      {
        title: "Mobilier et menuiserie",
        items: ["Bureau", "Rangement / placard", "Lit", "Matelas", "Fenêtre", "Porte", "Serrure / poignée", "Chaise / fauteuil"]
      },
      {
        title: "Sécurité et propreté",
        items: ["Détecteur / alarme", "Extincteur", "Signalisation", "Rideaux / stores", "Murs / peinture", "Sol", "Plafond", "Observation générale"]
      }
    ]
  },
  PIS: {
    locationLabels: {
      zone: "Bassin / zone technique",
      subzone: "Sous-zone / local",
      room: "N° local / équipement",
      occupant: "Responsable d'exploitation"
    },
    sections: [
      {
        title: "Bassins et plages",
        items: ["Bassin olympique", "Bassin d'échauffement", "Déversoir / goulotte", "Bassin tampon", "Plots de départ", "Échelles / accès bassin", "Lignes d'eau", "Carrelage / revêtement"]
      },
      {
        title: "Local moteur et traitement d'eau",
        items: ["Moteurs / pompes", "Local moteur", "Filtration", "Vannes", "Manomètres", "Chloration", "Régulation pH", "Fuite local technique"]
      },
      {
        title: "Électricité et éclairage piscine",
        items: ["LEDs bassin", "Projecteurs", "Tableau électrique", "Coffrets de commande", "Arrêt d'urgence", "Câblage", "Mise à la terre", "Éclairage de secours"]
      },
      {
        title: "Vestiaires, sécurité et exploitation",
        items: ["Douches", "Sanitaires", "Vestiaires", "Infirmerie", "Poste MNS", "Signalisation sécurité", "Extincteurs", "Propreté des plages"]
      }
    ]
  },
  OMN: {
    locationLabels: {
      zone: "Zone / plateau",
      subzone: "Sous-zone / local",
      room: "N° local / équipement",
      occupant: "Responsable de salle"
    },
    sections: [
      {
        title: "Aire de jeu et équipements sportifs",
        items: ["Revêtement aire de jeu", "Traçage", "Paniers / buts / filets", "Tribunes", "Gradins", "Table de marque", "Protections murales", "Matériel sportif"]
      },
      {
        title: "Électricité, LED et régies",
        items: ["LEDs aire de jeu", "Projecteurs", "Tableau électrique", "Régie éclairage", "Régie sonorisation", "Prises techniques", "Éclairage de secours", "Coffrets de commande"]
      },
      {
        title: "Vestiaires et sanitaires",
        items: ["Douches", "WC", "Lavabos", "Robinetterie", "Fuite d'eau", "Évacuation bouchée", "Bancs / casiers", "Portes / serrures"]
      },
      {
        title: "Sécurité et accès",
        items: ["Issues de secours", "Signalisation", "Extincteurs", "Accès public", "Accès équipes", "Infirmerie", "Propreté", "Observation générale"]
      }
    ]
  },
  ATH: {
    locationLabels: {
      zone: "Zone sportive",
      subzone: "Aire / secteur",
      room: "Équipement / local",
      occupant: "Responsable terrain"
    },
    sections: [
      {
        title: "Piste et aires sportives",
        items: ["Revêtement piste", "Couloirs / traçage", "Aire saut longueur", "Aire saut hauteur", "Aire perche", "Aire lancer poids", "Aire lancer disque / javelot", "Pelouse centrale"]
      },
      {
        title: "Éclairage et alimentation",
        items: ["Projecteurs", "LEDs extérieures", "Mâts d'éclairage", "Tableau électrique", "Coffrets extérieurs", "Câbles apparents", "Prises techniques", "Éclairage de sécurité"]
      },
      {
        title: "Équipements et locaux",
        items: ["Tribunes", "Vestiaires", "Local matériel", "Bancs", "Clôtures", "Portails", "Signalisation", "Arrosage"]
      },
      {
        title: "Sécurité et exploitation",
        items: ["Issues / accès", "Extincteurs", "Cheminements", "Propreté", "Drainage", "Zones dangereuses", "Observation générale", "Priorité maintenance"]
      }
    ]
  },
  STD: {
    locationLabels: {
      zone: "Secteur / tribune",
      subzone: "Sous-zone / local",
      room: "N° local / équipement",
      occupant: "Responsable secteur"
    },
    sections: [
      {
        title: "Aire de jeu et réseaux terrain",
        items: ["Pelouse", "Arrosage automatique", "Drainage", "Bouches / regards", "Bancs de touche", "Accès terrain", "Filets / buts", "Revêtement périphérique"]
      },
      {
        title: "Électricité, LEDs et affichage",
        items: ["Projecteurs / mâts", "LEDs tribunes", "Tableau d'affichage", "Écran géant", "Sonorisation", "Tableaux électriques", "Groupe électrogène", "Éclairage de secours"]
      },
      {
        title: "Tribunes, loges et locaux",
        items: ["Sièges tribunes", "Loges", "Vestiaires équipes", "Vestiaires arbitres", "Salle de presse", "Sanitaires", "Portes / serrures", "Fenêtres / vitrages"]
      },
      {
        title: "Sécurité, accès et exploitation",
        items: ["Issues de secours", "Signalisation", "Extincteurs", "Vidéosurveillance", "Billetterie", "Parkings", "Clôtures / portails", "Propreté secteur"]
      }
    ]
  }
};

const states = ["Neuf", "Normal", "Dégradé", "En panne"];

export default function BlankFollowUpSheet({ units, companyName, departmentName }: BlankFollowUpSheetProps) {
  const [selectedUnitId, setSelectedUnitId] = useState(units[0]?.id || "");
  const selectedUnit = useMemo(
    () => units.find(unit => unit.id === selectedUnitId) || units[0],
    [selectedUnitId, units]
  );
  const template = selectedUnit ? (unitTemplates[selectedUnit.id] || defaultTemplate) : defaultTemplate;

  return (
    <div className="space-y-6" id="blank-follow-up-screen">
      <div className="no-print bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Fiche de suivi</h2>
            <p className="text-sm text-slate-500 font-medium max-w-2xl">
              Imprimez une fiche à vide adaptée à l'unité sélectionnée pour contrôler les locaux et équipements réellement présents. La fiche peut être remplie manuellement puis transmise au chef service maintenance.
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
            <Printer className="w-4.5 h-4.5" /> Imprimer la fiche
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
            <div className="text-lg font-extrabold text-slate-900 uppercase">Fiche de suivi</div>
            <div className="text-sm font-bold text-emerald-800">Unité : {selectedUnit?.name || "À renseigner"}</div>
            <div className="text-xs text-slate-500">Date : ____ / ____ / ______</div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 text-sm mb-5">
          <div className="field-line"><span>Unité</span><strong>{selectedUnit?.name || ""}</strong></div>
          <div className="field-line"><span>{template.locationLabels.zone}</span><em></em></div>
          <div className="field-line"><span>{template.locationLabels.subzone}</span><em></em></div>
          <div className="field-line"><span>{template.locationLabels.room}</span><em></em></div>
          <div className="field-line col-span-2"><span>{template.locationLabels.occupant}</span><em></em></div>
        </section>

        <div className="space-y-4">
          {template.sections.map(section => (
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
