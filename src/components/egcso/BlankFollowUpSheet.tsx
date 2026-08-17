'use client';

import { useMemo, useState, useEffect } from 'react';
import { Printer, Building2, ClipboardList, Plus, Trash2, CheckCircle2, ChevronRight, ChevronLeft, Sparkles, Layers, FileSpreadsheet, Edit3, Bookmark, Save } from 'lucide-react';
import type { Unit, CustomFollowUpSheet, CustomFollowUpSection } from '@/types';

type InspectionSection = { title: string; items: string[] };
type UnitTemplate = {
  locationLabels: { zone: string; subzone: string; room: string; occupant: string };
  sections: InspectionSection[];
};

const defaultTemplate: UnitTemplate = {
  locationLabels: { zone: 'Zone / bloc', subzone: 'Sous-zone / niveau', room: 'Local / espace', occupant: 'Responsable du local' },
  sections: [
    { title: 'Électricité', items: ['Éclairage LED', 'Interrupteurs', 'Prises électriques', 'Tableau électrique', 'Coffrets / disjoncteurs', 'Câblage apparent', 'Éclairage de secours', 'Observation électrique'] },
    { title: 'Plomberie / réseaux', items: ['Robinetterie', 'Évacuation', 'Fuite d\'eau', 'Canalisation bouchée', 'Sanitaires', 'Flexibles', 'Vannes', 'Observation plomberie'] },
    { title: 'Bâtiment et équipements', items: ['Porte', 'Fenêtre', 'Serrure / poignée', 'Sol', 'Murs / peinture', 'Plafond', 'Mobilier fixe', 'Observation générale'] },
    { title: 'Sécurité et exploitation', items: ['Extincteur', 'Signalisation', 'Issues de secours', 'Propreté', 'Accès technique', 'Protection usagers', 'Anomalie à signaler', 'Priorité maintenance'] },
  ],
};

const unitTemplates: Record<string, UnitTemplate> = {
  VIL: {
    locationLabels: { zone: 'Nom de bloc', subzone: 'Étage', room: 'N° de chambre / local', occupant: 'Occupant / responsable du local' },
    sections: [
      { title: 'Électricité chambre / bloc', items: ['TV', 'Climatiseur', 'Frigo', 'Lampes', 'Interrupteurs', 'Prises électriques', 'Tableau électrique', 'Télécommande / accessoires'] },
      { title: 'Plomberie chambre / sanitaires', items: ['Évier / lavabo', 'WC', 'Douche', 'Flexibles', 'Robinetterie', 'Fuite d\'eau', 'Canalisation bouchée', 'Siphon / évacuation'] },
      { title: 'Mobilier et menuiserie', items: ['Bureau', 'Rangement / placard', 'Lit', 'Matelas', 'Fenêtre', 'Porte', 'Serrure / poignée', 'Chaise / fauteuil'] },
      { title: 'Sécurité et propreté', items: ['Détecteur / alarme', 'Extincteur', 'Signalisation', 'Rideaux / stores', 'Murs / peinture', 'Sol', 'Plafond', 'Observation générale'] },
    ],
  },
  PIS: {
    locationLabels: { zone: 'Bassin / zone technique', subzone: 'Sous-zone / local', room: 'N° local / équipement', occupant: 'Responsable d\'exploitation' },
    sections: [
      { title: 'Bassins et plages', items: ['Bassin olympique', 'Bassin d\'échauffement', 'Déversoir / goulotte', 'Bassin tampon', 'Plots de départ', 'Échelles', 'Lignes d\'eau', 'Carrelage / revêtement'] },
      { title: 'Local moteur et traitement d\'eau', items: ['Moteurs / pompes', 'Local moteur', 'Filtration', 'Vannes', 'Manomètres', 'Chloration', 'Régulation pH', 'Fuite local technique'] },
      { title: 'Électricité et éclairage piscine', items: ['LEDs bassin', 'Projecteurs', 'Tableau électrique', 'Coffrets de commande', 'Arrêt d\'urgence', 'Câblage', 'Mise à la terre', 'Éclairage de secours'] },
      { title: 'Vestiaires, sécurité et exploitation', items: ['Douches', 'Sanitaires', 'Vestiaires', 'Infirmerie', 'Poste MNS', 'Signalisation sécurité', 'Extincteurs', 'Propreté des plages'] },
    ],
  },
  OMN: {
    locationLabels: { zone: 'Zone / plateau', subzone: 'Sous-zone / local', room: 'N° local / équipement', occupant: 'Responsable de salle' },
    sections: [
      { title: 'Aire de jeu et équipements sportifs', items: ['Revêtement aire de jeu', 'Traçage', 'Paniers / buts / filets', 'Tribunes', 'Gradins', 'Table de marque', 'Protections murales', 'Matériel sportif'] },
      { title: 'Électricité, LED et régies', items: ['LEDs aire de jeu', 'Projecteurs', 'Tableau électrique', 'Régie éclairage', 'Régie sonorisation', 'Prises techniques', 'Éclairage de secours', 'Coffrets de commande'] },
      { title: 'Vestiaires et sanitaires', items: ['Douches', 'WC', 'Lavabos', 'Robinetterie', 'Fuite d\'eau', 'Évacuation bouchée', 'Bancs / casiers', 'Portes / serrures'] },
      { title: 'Sécurité et accès', items: ['Issues de secours', 'Signalisation', 'Extincteurs', 'Accès public', 'Accès équipes', 'Infirmerie', 'Propreté', 'Observation générale'] },
    ],
  },
};

const presetTemplatesList = [
  { label: 'Chambre / Hébergement (VIL)', template: unitTemplates.VIL },
  { label: 'Piscine & Traitement Eau (PIS)', template: unitTemplates.PIS },
  { label: 'Palais des Sports & Gymnase (OMN)', template: unitTemplates.OMN },
  { label: 'Technique Standard', template: defaultTemplate },
];

const states = ['Neuf', 'Normal', 'Dégradé', 'En panne'];

export default function BlankFollowUpSheet({ units: initialUnits, companyName, departmentName }: { units: Unit[]; companyName: string; departmentName: string }) {
  const [activeTab, setActiveTab] = useState<'standard' | 'wizard' | 'saved'>('standard');
  const [unitsList, setUnitsList] = useState<Unit[]>(initialUnits);
  const [customSheets, setCustomSheets] = useState<CustomFollowUpSheet[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState(initialUnits[0]?.id || '');
  const [selectedCustomSheetId, setSelectedCustomSheetId] = useState<string | null>(null);

  // Wizard state
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [sheetTitle, setSheetTitle] = useState('');
  const [wizardUnitId, setWizardUnitId] = useState(initialUnits[0]?.id || '');
  const [createNewUnit, setCreateNewUnit] = useState(false);
  const [newUnitCode, setNewUnitCode] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [zone, setZone] = useState('');
  const [subzone, setSubzone] = useState('');
  const [room, setRoom] = useState('');
  const [occupant, setOccupant] = useState('');

  const [sections, setSections] = useState<CustomFollowUpSection[]>([
    { title: 'Électricité & Éclairage', items: ['Projecteurs LED', 'Interrupteurs', 'Prises de courant', 'Tableau électrique', 'Coffret de protection', 'Câblage', 'Observation électrique'] },
    { title: 'Plomberie & Réseaux', items: ['Robinetterie', 'WC / Sanitaires', 'Fuite d\'eau', 'Évacuation', 'Vannes de coupure', 'Flexible', 'Observation plomberie'] },
    { title: 'Bâtiment & Menuiserie', items: ['Porte / Serrure', 'Fenêtre / Vitrage', 'Revêtement Sol', 'Murs & Peinture', 'Plafond', 'Mobilier fixe', 'Observation générale'] },
    { title: 'Sécurité & Propreté', items: ['Extincteurs', 'Issues de secours', 'Signalisation', 'Propreté des lieux', 'Accès technique', 'Aération / CTA', 'Remarques'] },
  ]);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Fetch custom sheets on load
  const fetchCustomSheets = async () => {
    try {
      const res = await fetch('/api/config/followup-sheets');
      if (res.ok) {
        const data = await res.json();
        setCustomSheets(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchCustomSheets();
  }, []);

  const selectedUnit = useMemo(() => unitsList.find((u) => u.id === selectedUnitId) || unitsList[0], [selectedUnitId, unitsList]);
  const activeCustomSheet = useMemo(() => customSheets.find((s) => s.id === selectedCustomSheetId) || null, [selectedCustomSheetId, customSheets]);

  // Compute template to render for printing
  const displayTemplate = useMemo(() => {
    if (activeTab === 'saved' && activeCustomSheet) {
      return {
        locationLabels: { zone: 'Zone / bloc', subzone: 'Sous-zone', room: 'Local', occupant: 'Responsable' },
        sections: activeCustomSheet.sections,
      };
    }
    if (activeTab === 'wizard') {
      return {
        locationLabels: { zone: 'Zone / bloc', subzone: 'Sous-zone', room: 'Local', occupant: 'Responsable' },
        sections: sections,
      };
    }
    return selectedUnit ? (unitTemplates[selectedUnit.id] || defaultTemplate) : defaultTemplate;
  }, [activeTab, activeCustomSheet, selectedUnit, sections]);

  // Section manipulation helpers
  const handleAddSection = () => {
    setSections([...sections, { title: `Nouvelle Section ${sections.length + 1}`, items: ['Point de contrôle 1', 'Point de contrôle 2'] }]);
  };

  const handleRemoveSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const handleSectionTitleChange = (index: number, newTitle: string) => {
    const next = [...sections];
    next[index].title = newTitle;
    setSections(next);
  };

  const handleAddItem = (sectionIdx: number) => {
    const next = [...sections];
    next[sectionIdx].items.push(`Élément ${next[sectionIdx].items.length + 1}`);
    setSections(next);
  };

  const handleRemoveItem = (sectionIdx: number, itemIdx: number) => {
    const next = [...sections];
    next[sectionIdx].items = next[sectionIdx].items.filter((_, i) => i !== itemIdx);
    setSections(next);
  };

  const handleItemChange = (sectionIdx: number, itemIdx: number, val: string) => {
    const next = [...sections];
    next[sectionIdx].items[itemIdx] = val;
    setSections(next);
  };

  const applyPreset = (preset: typeof defaultTemplate) => {
    setSections(preset.sections.map((s) => ({ title: s.title, items: [...s.items] })));
    setFeedback({ type: 'success', msg: 'Modèle appliqué avec succès !' });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSaveWizard = async () => {
    if (!sheetTitle.trim()) {
      setFeedback({ type: 'error', msg: 'Veuillez donner un titre à votre fiche de suivi.' });
      return;
    }

    setSaving(true);
    try {
      const targetUnit = unitsList.find((u) => u.id === wizardUnitId);
      const res = await fetch('/api/config/followup-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: sheetTitle,
          unitId: wizardUnitId,
          unitName: targetUnit?.name || 'Général',
          zone,
          subzone,
          room,
          occupant,
          sections,
          createNewUnit,
          newUnitCode,
          newUnitName,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFeedback({ type: 'success', msg: 'Fiche de suivi enregistrée avec succès !' });
        await fetchCustomSheets();
        if (createNewUnit && newUnitCode) {
          setUnitsList([...unitsList, { id: newUnitCode.toUpperCase(), name: newUnitName, zones: [] }]);
        }
        setSelectedCustomSheetId(data.sheet.id);
        setActiveTab('saved');
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', msg: err.error || 'Erreur lors de la sauvegarde.' });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Impossible d\'enregistrer la fiche de suivi.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSheet = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette fiche de suivi personnalisée ?')) return;
    try {
      const res = await fetch(`/api/config/followup-sheets?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCustomSheets(customSheets.filter((s) => s.id !== id));
        if (selectedCustomSheetId === id) setSelectedCustomSheetId(null);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="no-print bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-800 text-white rounded-xl shadow-sm"><ClipboardList className="w-5 h-5" /></div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 leading-tight">Fiches de Suivi & Contrôle</h2>
            <p className="text-xs text-slate-500 font-medium">Générez, personnalisez et réimprimez vos fiches de suivi pour chaque unité et zone.</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-bold w-full md:w-auto">
          <button onClick={() => setActiveTab('standard')} className={`flex-1 md:flex-none px-3.5 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'standard' ? 'bg-white text-emerald-900 shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}>
            <FileSpreadsheet className="w-4 h-4" /> Standard par Unité
          </button>
          <button onClick={() => setActiveTab('saved')} className={`flex-1 md:flex-none px-3.5 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'saved' ? 'bg-white text-emerald-900 shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}>
            <Bookmark className="w-4 h-4" /> Mes Fiches Sauvegardées ({customSheets.length})
          </button>
          <button onClick={() => setActiveTab('wizard')} className={`flex-1 md:flex-none px-3.5 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'wizard' ? 'bg-emerald-800 text-white shadow-sm font-extrabold' : 'text-emerald-800 hover:bg-emerald-50'}`}>
            <Sparkles className="w-4 h-4" /> Assistant Création (Wizard)
          </button>
        </div>
      </div>

      {/* FEEDBACK ALERT */}
      {feedback && (
        <div className={`no-print p-4 rounded-xl border font-semibold text-xs flex items-center justify-between ${feedback.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedback.msg}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
        </div>
      )}

      {/* MODE 1: STANDARD UNIT SELECTOR */}
      {activeTab === 'standard' && (
        <div className="no-print bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-slate-500" />
            <div className="space-y-0.5">
              <label className="text-xs font-bold text-slate-700">Sélectionner l'Unité du Complexe</label>
              <select value={selectedUnitId} onChange={(e) => setSelectedUnitId(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-800">
                {unitsList.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <button onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-lg text-xs shadow-sm transition-all">
            <Printer className="w-4 h-4" /> Imprimer cette fiche (2 pages A4)
          </button>
        </div>
      )}

      {/* MODE 2: SAVED CUSTOM SHEETS */}
      {activeTab === 'saved' && (
        <div className="no-print bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-emerald-800" /> Fiches de suivi personnalisées enregistrées
          </h3>

          {customSheets.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <ClipboardList className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-bold text-slate-600">Aucune fiche sur-mesure enregistrée pour le moment.</p>
              <p className="text-[11px] text-slate-400 mt-1">Utilisez l'Assistant Création (Wizard) pour créer et sauvegarder vos fiches par zone.</p>
              <button onClick={() => setActiveTab('wizard')} className="mt-4 inline-flex items-center gap-2 bg-emerald-800 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm">
                <Sparkles className="w-4 h-4" /> Lancer l'Assistant Wizard
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {customSheets.map((s) => {
                const active = selectedCustomSheetId === s.id;
                return (
                  <div key={s.id} onClick={() => setSelectedCustomSheetId(s.id)} className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${active ? 'bg-emerald-50 border-emerald-800 shadow-md ring-2 ring-emerald-800/20' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-800 text-white">{s.unitName || s.unitId}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteSheet(s.id); }} className="text-slate-400 hover:text-red-600 p-1" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-xs leading-snug mb-1">{s.title}</h4>
                    {s.zone && <p className="text-[11px] font-medium text-slate-500">Zone : {s.zone} {s.subzone ? `(${s.subzone})` : ''}</p>}
                    <p className="text-[10px] text-slate-400 mt-2 font-mono">{s.sections.length} sections &bull; Mis à jour le {new Date(s.updatedAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                );
              })}
            </div>
          )}

          {activeCustomSheet && (
            <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => window.print()} className="inline-flex items-center gap-2 bg-emerald-800 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-700">
                <Printer className="w-4 h-4" /> Imprimer la fiche sélectionnée
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODE 3: WIZARD ASSISTANT */}
      {activeTab === 'wizard' && (
        <div className="no-print bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          {/* WIZARD PROGRESS BAR */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">Assistant Pas à Pas</span>
              <h3 className="text-base font-extrabold text-slate-900">Création d'une Fiche de Suivi Sur Mesure</h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-extrabold">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center ${wizardStep >= 1 ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-400'}`}>1</span>
              <span className="text-slate-300">&mdash;</span>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center ${wizardStep >= 2 ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-400'}`}>2</span>
              <span className="text-slate-300">&mdash;</span>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center ${wizardStep >= 3 ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-400'}`}>3</span>
            </div>
          </div>

          {/* STEP 1: UNIT & ZONE IDENTIFICATION */}
          {wizardStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">1. Titre de la Fiche de Suivi *</label>
                <input type="text" value={sheetTitle} onChange={(e) => setSheetTitle(e.target.value)} placeholder="Ex: Fiche de contrôle mensuelle — Bloc A Hébergement" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800" />
              </div>

              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2"><Building2 className="w-4 h-4 text-emerald-800" /> Unité concernée</label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={createNewUnit} onChange={(e) => setCreateNewUnit(e.target.checked)} className="rounded text-emerald-800 focus:ring-emerald-800" />
                    Créer une nouvelle unité
                  </label>
                </div>

                {!createNewUnit ? (
                  <select value={wizardUnitId} onChange={(e) => setWizardUnitId(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-800">
                    {unitsList.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.id})</option>)}
                  </select>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <input type="text" value={newUnitCode} onChange={(e) => setNewUnitCode(e.target.value)} placeholder="Code (ex: GYM, TNS)" className="bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900" />
                    <input type="text" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} placeholder="Nom complet de l'unité" className="bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Zone / Bloc spécifique</label>
                  <input type="text" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Ex: Bloc Hébergement A, Local Moteurs" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Sous-zone / Niveau</label>
                  <input type="text" value={subzone} onChange={(e) => setSubzone(e.target.value)} placeholder="Ex: Étage 2, Sous-sol 1" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Local / Espace</label>
                  <input type="text" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Ex: Local CTA 04, Chambre 208" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Responsable du local</label>
                  <input type="text" value={occupant} onChange={(e) => setOccupant(e.target.value)} placeholder="Ex: Chef d'unité / Responsable" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900" />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-200">
                <button onClick={() => setWizardStep(2)} className="inline-flex items-center gap-2 bg-emerald-800 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-700">
                  Suivant : Édition des Sections & Points <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SECTIONS & CHECK ITEMS EDITING */}
          {wizardStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* PRESETS BUTTONS */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-800" /> Charger des modèles prédéfinis en 1 clic
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {presetTemplatesList.map((preset, idx) => (
                    <button key={idx} onClick={() => applyPreset(preset.template)} className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-emerald-800 text-xs font-bold text-slate-700 hover:text-emerald-900 shadow-sm transition-all">
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTIONS EDITING LIST */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Sections de contrôle ({sections.length})</label>
                  <button onClick={handleAddSection} className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-800 hover:text-emerald-900 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    <Plus className="w-4 h-4" /> Ajouter une section sur mesure
                  </button>
                </div>

                {sections.map((section, sIdx) => (
                  <div key={sIdx} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-800 text-white font-extrabold text-xs flex items-center justify-center">{sIdx + 1}</span>
                      <input type="text" value={section.title} onChange={(e) => handleSectionTitleChange(sIdx, e.target.value)} placeholder="Titre de la section" className="flex-1 bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900" />
                      {sections.length > 1 && (
                        <button onClick={() => handleRemoveSection(sIdx)} className="text-slate-400 hover:text-red-600 p-1" title="Supprimer la section">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="pl-9 space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Points de contrôle ({section.items.length})</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {section.items.map((item, iIdx) => (
                          <div key={iIdx} className="flex items-center gap-1.5">
                            <input type="text" value={item} onChange={(e) => handleItemChange(sIdx, iIdx, e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-semibold text-slate-800" />
                            <button onClick={() => handleRemoveItem(sIdx, iIdx)} className="text-slate-300 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => handleAddItem(sIdx)} className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:underline pt-1">
                        <Plus className="w-3.5 h-3.5" /> Ajouter un élément
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-200">
                <button onClick={() => setWizardStep(1)} className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-200">
                  <ChevronLeft className="w-4 h-4" /> Retour Étape 1
                </button>
                <button onClick={() => setWizardStep(3)} className="inline-flex items-center gap-2 bg-emerald-800 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-700">
                  Suivant : Aperçu & Sauvegarde <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & SAVE */}
          {wizardStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-emerald-900 uppercase">Fiche prête pour impression et sauvegarde !</h4>
                  <p className="text-[11px] text-emerald-700">La fiche est calibrée sur 2 pages A4. Les 3 premières sections sur la page 1, la 4ème section, les lignes en pointillés et les visas sur la page 2.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleSaveWizard} disabled={saving} className="inline-flex items-center gap-2 bg-emerald-800 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-700 disabled:opacity-50">
                    <Save className="w-4 h-4" /> {saving ? 'Enregistrement...' : 'Enregistrer la fiche'}
                  </button>
                  <button onClick={() => window.print()} className="inline-flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-900">
                    <Printer className="w-4 h-4" /> Imprimer
                  </button>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button onClick={() => setWizardStep(2)} className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-200">
                  <ChevronLeft className="w-4 h-4" /> Modifier les sections
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PRINTABLE A4 2-PAGE SHEET RENDERING */}
      <div className="print-sheet bg-white rounded-xl border border-slate-200 shadow-sm p-5 md:p-7 text-slate-900">
        {/* PAGE 1 */}
        <div className="page-1">
          <header className="border-b-4 border-emerald-800 pb-2 mb-3 flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <img src="/icon.png" alt="EGCSO" className="w-9 h-9 object-contain rounded bg-white p-0.5 border border-slate-300" />
              <div>
                <h1 className="text-lg font-extrabold text-emerald-900 leading-tight">{companyName || 'EPIC EGCSO'}</h1>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">{departmentName || 'Service Maintenance'}</p>
                <p className="text-[9px] font-semibold text-slate-500">Traçabilité des contrôles et interventions — Complexe Sportif d'Oran</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-extrabold text-slate-900 uppercase">{sheetTitle || 'Fiche de suivi'} (Page 1/2)</div>
              <div className="text-xs font-bold text-emerald-800">Unité : {activeTab === 'wizard' ? (createNewUnit ? newUnitName : (unitsList.find((u) => u.id === wizardUnitId)?.name || 'Général')) : (selectedUnit?.name || 'À renseigner')}</div>
              <div className="text-[10px] text-slate-500">Date : ____ / ____ / ________</div>
            </div>
          </header>

          <section className="grid grid-cols-2 gap-1.5 text-[11px] mb-3 bg-slate-50 p-2 rounded border border-slate-200">
            <div><span className="font-semibold text-slate-500">Unité : </span><strong>{activeTab === 'wizard' ? (createNewUnit ? newUnitName : (unitsList.find((u) => u.id === wizardUnitId)?.name || '')) : (selectedUnit?.name || '')}</strong></div>
            <div><span className="font-semibold text-slate-500">{displayTemplate.locationLabels.zone} : </span><em>{activeTab === 'wizard' && zone ? zone : '_______________'}</em></div>
            <div><span className="font-semibold text-slate-500">{displayTemplate.locationLabels.subzone} : </span><em>{activeTab === 'wizard' && subzone ? subzone : '_______________'}</em></div>
            <div><span className="font-semibold text-slate-500">{displayTemplate.locationLabels.room} : </span><em>{activeTab === 'wizard' && room ? room : '_______________'}</em></div>
            <div className="col-span-2"><span className="font-semibold text-slate-500">{displayTemplate.locationLabels.occupant} : </span><em>{activeTab === 'wizard' && occupant ? occupant : '________________________________________'}</em></div>
          </section>

          <div className="space-y-3">
            {displayTemplate.sections.slice(0, 3).map((section, sIdx) => (
              <section key={sIdx}>
                <h2 className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider border-b-2 border-emerald-800 pb-0.5 mb-1.5">Section : {section.title}</h2>
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 py-0.5 px-2 text-left font-bold">Élément à vérifier</th>
                      {states.map((s) => <th key={s} className="border border-slate-300 py-0.5 px-1 text-center font-bold w-14">{s}</th>)}
                      <th className="border border-slate-300 py-0.5 px-2 text-center font-bold">Observation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item, iIdx) => (
                      <tr key={iIdx} className="h-5">
                        <td className="border border-slate-200 py-0 px-2 font-medium">{item}</td>
                        {states.map((s) => <td key={s} className="border border-slate-200 py-0 px-1"><div className="w-3 h-3 mx-auto border border-slate-300 rounded-sm" /></td>)}
                        <td className="border border-slate-200 py-0 px-2"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          </div>
        </div>

        {/* PAGE 2 */}
        <div className="page-2 page-break pt-4 print:pt-0">
          <header className="border-b border-slate-200 pb-2 mb-3 flex justify-between items-center text-xs">
            <div className="font-bold text-slate-700">{companyName || 'EPIC EGCSO'} &bull; Fiche de suivi technique</div>
            <div className="font-extrabold text-emerald-800 uppercase">{sheetTitle || (selectedUnit?.name || '')} (Page 2/2)</div>
          </header>

          <div className="space-y-3">
            {displayTemplate.sections.slice(3, 4).map((section, sIdx) => (
              <section key={sIdx}>
                <h2 className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider border-b-2 border-emerald-800 pb-0.5 mb-1.5">Section : {section.title}</h2>
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 py-0.5 px-2 text-left font-bold">Élément à vérifier</th>
                      {states.map((s) => <th key={s} className="border border-slate-300 py-0.5 px-1 text-center font-bold w-14">{s}</th>)}
                      <th className="border border-slate-300 py-0.5 px-2 text-center font-bold">Observation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item, iIdx) => (
                      <tr key={iIdx} className="h-5">
                        <td className="border border-slate-200 py-0 px-2 font-medium">{item}</td>
                        {states.map((s) => <td key={s} className="border border-slate-200 py-0 px-1"><div className="w-3 h-3 mx-auto border border-slate-300 rounded-sm" /></td>)}
                        <td className="border border-slate-200 py-0 px-2"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          </div>

          <section className="mt-4">
            <h2 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider border-b-2 border-emerald-800 pb-1 mb-2">Suite à donner / intervention demandée</h2>
            <div className="border border-slate-200 rounded p-2.5 bg-slate-50/50 space-y-2">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <div key={n} className="border-b border-dashed border-slate-300 h-6 flex items-center text-[10px] text-slate-400 font-mono">
                  {n}.
                </div>
              ))}
            </div>
          </section>

          <footer className="mt-5 grid grid-cols-2 gap-4">
            <div className="border border-dashed border-slate-300 rounded p-3">
              <div className="text-[10px] font-bold text-slate-500 uppercase mb-12">Visa Chef service suivi</div>
              <div className="border-t border-slate-300 pt-1 text-[10px] text-slate-500 text-center">Nom, date et signature</div>
            </div>
            <div className="border border-dashed border-slate-300 rounded p-3">
              <div className="text-[10px] font-bold text-slate-500 uppercase mb-12">Visa Chef d'unité</div>
              <div className="border-t border-slate-300 pt-1 text-[10px] text-slate-500 text-center">Nom, date et signature</div>
            </div>
          </footer>
        </div>
      </div>

      <style jsx>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          .no-print { display: none !important; }
          .print-sheet { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; width: 100% !important; }
          .page-break { page-break-before: always !important; break-before: page !important; }
          body { background: white !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  );
}
