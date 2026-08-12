import React, { useState, useEffect } from "react";
import { AppSettings, Unit, BreakdownCategory, UnitZone } from "../types";
import { 
  Settings as SettingsIcon, 
  Database, 
  FolderSync, 
  FileJson, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Info,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Layers,
  Layout,
  Wrench,
  Wand2,
  Download,
  Upload,
  RefreshCw
} from "lucide-react";

interface SettingsProps {
  appSettings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => Promise<boolean>;
  onReconstructIndex: () => Promise<{ success: boolean; count: number; message: string }>;
  units: Unit[];
  onUpdateUnits: (newUnits: Unit[]) => Promise<boolean>;
  categories: BreakdownCategory[];
  onUpdateCategories: (newCategories: BreakdownCategory[]) => Promise<boolean>;
}

export default function Settings({
  appSettings,
  onUpdateSettings,
  onReconstructIndex,
  units,
  onUpdateUnits,
  categories,
  onUpdateCategories
}: SettingsProps) {
  
  // Storage Root State
  const [storageRoot, setStorageRoot] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [referenceFormat, setReferenceFormat] = useState("");
  
  // Tab views state ("assistant" or "json")
  const [unitsMode, setUnitsMode] = useState<"assistant" | "json">("assistant");
  const [categoriesMode, setCategoriesMode] = useState<"assistant" | "json">("assistant");

  // JSON editors states
  const [unitsJson, setUnitsJson] = useState("");
  const [categoriesJson, setCategoriesJson] = useState("");

  // Assistant states
  const [localUnits, setLocalUnits] = useState<Unit[]>([]);
  const [localCategories, setLocalCategories] = useState<BreakdownCategory[]>([]);

  // Selected Unit and Zone for assistant detail editors
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [selectedZoneName, setSelectedZoneName] = useState<string>("");

  // Inline creation states
  const [newUnitId, setNewUnitId] = useState("");
  const [newUnitName, setNewUnitName] = useState("");
  const [newZoneName, setNewZoneName] = useState("");
  const [newSubzoneText, setNewSubzoneText] = useState("");

  const [newCatId, setNewCatId] = useState("");
  const [newCatName, setNewCatName] = useState("");

  // Edit inline states
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editingUnitName, setEditingUnitName] = useState("");

  const [editingZoneName, setEditingZoneName] = useState<string | null>(null);
  const [editingZoneNewName, setEditingZoneNewName] = useState("");

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");

  // Status flags
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [unitsSaved, setUnitsSaved] = useState(false);
  const [categoriesSaved, setCategoriesSaved] = useState(false);
  const [reconstructResult, setReconstructResult] = useState<{ success: boolean; count: number; message: string } | null>(null);
  const [reconstructing, setReconstructing] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState("");
  const [showNapoliConfirm, setShowNapoliConfirm] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (appSettings) {
      setStorageRoot(appSettings.storageRoot || "");
      setCompanyName(appSettings.companyName || "");
      setDepartmentName(appSettings.departmentName || "");
      setReferenceFormat(appSettings.referenceFormat || "");
    }
  }, [appSettings]);

  useEffect(() => {
    if (units) {
      setUnitsJson(JSON.stringify(units, null, 2));
      setLocalUnits(JSON.parse(JSON.stringify(units))); // Deep clone
      if (units.length > 0 && !selectedUnitId) {
        setSelectedUnitId(units[0].id);
      }
    }
  }, [units]);

  useEffect(() => {
    if (categories) {
      setCategoriesJson(JSON.stringify(categories, null, 2));
      setLocalCategories(JSON.parse(JSON.stringify(categories))); // Deep clone
    }
  }, [categories]);

  // Handle general settings update
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSettingsSaved(false);

    if (!storageRoot.trim()) {
      setError("Le dossier de stockage ne peut pas être vide.");
      return;
    }

    const success = await onUpdateSettings({
      storageRoot,
      companyName,
      departmentName,
      referenceFormat
    });

    if (success) {
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } else {
      setError("Une erreur est survenue lors de la mise à jour des paramètres.");
    }
  };

  // Handle Units JSON save
  const handleSaveUnitsJson = async () => {
    setUnitsSaved(false);
    setError("");
    try {
      const parsed = JSON.parse(unitsJson);
      if (!Array.isArray(parsed)) {
        throw new Error("La structure des unités doit être une liste de type tableau (Array).");
      }
      
      // Validate unique IDs
      const ids = parsed.map((u: any) => u.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        throw new Error("Toutes les unités doivent avoir un identifiant (id) unique.");
      }

      const success = await onUpdateUnits(parsed);
      if (success) {
        setUnitsSaved(true);
        setTimeout(() => setUnitsSaved(false), 3000);
      }
    } catch (err: any) {
      setError("JSON de hiérarchie d'unités invalide : " + err.message);
    }
  };

  // Handle Categories JSON save
  const handleSaveCategoriesJson = async () => {
    setCategoriesSaved(false);
    setError("");
    try {
      const parsed = JSON.parse(categoriesJson);
      if (!Array.isArray(parsed)) {
        throw new Error("La liste des catégories de pannes doit être de type tableau (Array).");
      }

      // Validate unique IDs
      const ids = parsed.map((c: any) => c.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        throw new Error("Toutes les catégories doivent avoir un identifiant (id) unique.");
      }

      const success = await onUpdateCategories(parsed);
      if (success) {
        setCategoriesSaved(true);
        setTimeout(() => setCategoriesSaved(false), 3000);
      }
    } catch (err: any) {
      setError("JSON des catégories invalide : " + err.message);
    }
  };

  // Trigger index reconstruction
  const handleReconstruct = async () => {
    setReconstructing(true);
    setReconstructResult(null);
    try {
      const res = await onReconstructIndex();
      setReconstructResult(res);
    } catch (err: any) {
      setReconstructResult({ success: false, count: 0, message: err.message });
    } finally {
      setReconstructing(false);
    }
  };

  const handleDownloadBackup = async () => {
    setBackupLoading(true);
    setError("");
    try {
      const response = await fetch("/api/backup");
      if (!response.ok) {
        throw new Error("Impossible de générer le fichier de sauvegarde.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `egcso_sauvegarde_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError("Erreur lors du téléchargement de la sauvegarde : " + err.message);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreLoading(true);
    setError("");
    setRestoreSuccess("");

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const base64String = (evt.target?.result as string).split(",")[1];
          const response = await fetch("/api/restore", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ zipData: base64String }),
          });

          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || "Restauration invalide.");
          }

          setRestoreSuccess(result.message || "Configurations et base de données restaurées avec succès ! Rechargement...");
          setTimeout(() => {
            window.location.reload();
          }, 1800);
        } catch (err: any) {
          setError("Échec de la restauration : " + err.message);
          setRestoreLoading(false);
        }
      };
      reader.onerror = () => {
        setError("Impossible de lire le fichier de sauvegarde.");
        setRestoreLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError("Erreur de fichier : " + err.message);
      setRestoreLoading(false);
    }
  };

  // --- VISUAL ASSISTANT ACTIONS FOR CATEGORIES ---
  const handleAddCategory = async () => {
    setError("");
    setCategoriesSaved(false);
    const id = newCatId.trim().toUpperCase();
    const name = newCatName.trim();

    if (!id || !name) {
      setError("Veuillez saisir un identifiant et un nom pour la catégorie.");
      return;
    }

    if (localCategories.some(c => c.id === id)) {
      setError(`L'identifiant de catégorie "${id}" existe déjà.`);
      return;
    }

    const updated = [...localCategories, { id, name }];
    const success = await onUpdateCategories(updated);
    if (success) {
      setLocalCategories(updated);
      setCategoriesSaved(true);
      setNewCatId("");
      setNewCatName("");
      setTimeout(() => setCategoriesSaved(false), 3000);
    } else {
      setError("Impossible d'enregistrer la nouvelle catégorie.");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setError("");
    setCategoriesSaved(false);
    const updated = localCategories.filter(c => c.id !== id);
    const success = await onUpdateCategories(updated);
    if (success) {
      setLocalCategories(updated);
      setCategoriesSaved(true);
      setTimeout(() => setCategoriesSaved(false), 3000);
    } else {
      setError("Impossible de supprimer la catégorie.");
    }
  };

  const handleStartRenameCategory = (cat: BreakdownCategory) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
  };

  const handleSaveRenameCategory = async (id: string) => {
    setError("");
    setCategoriesSaved(false);
    const name = editingCatName.trim();
    if (!name) {
      setError("Le nom de la catégorie ne peut pas être vide.");
      return;
    }

    const updated = localCategories.map(c => c.id === id ? { ...c, name } : c);
    const success = await onUpdateCategories(updated);
    if (success) {
      setLocalCategories(updated);
      setEditingCatId(null);
      setCategoriesSaved(true);
      setTimeout(() => setCategoriesSaved(false), 3000);
    } else {
      setError("Impossible de renommer la catégorie.");
    }
  };

  // --- VISUAL ASSISTANT ACTIONS FOR UNITS ---
  const handleAddUnit = async () => {
    setError("");
    setUnitsSaved(false);
    const id = newUnitId.trim().toUpperCase();
    const name = newUnitName.trim();

    if (!id || !name) {
      setError("Veuillez saisir un identifiant unique (ex: STA) et un nom (ex: Stade) pour l'unité.");
      return;
    }

    if (id.length > 5) {
      setError("L'identifiant d'unité doit faire entre 1 et 5 caractères.");
      return;
    }

    if (localUnits.some(u => u.id === id)) {
      setError(`L'identifiant d'unité "${id}" existe déjà.`);
      return;
    }

    const updated = [...localUnits, { id, name, zones: [] }];
    const success = await onUpdateUnits(updated);
    if (success) {
      setLocalUnits(updated);
      setSelectedUnitId(id);
      setUnitsSaved(true);
      setNewUnitId("");
      setNewUnitName("");
      setTimeout(() => setUnitsSaved(false), 3000);
    } else {
      setError("Impossible d'enregistrer la nouvelle unité.");
    }
  };

  const handleDeleteUnit = async (id: string) => {
    setError("");
    setUnitsSaved(false);
    const updated = localUnits.filter(u => u.id !== id);
    const success = await onUpdateUnits(updated);
    if (success) {
      setLocalUnits(updated);
      setUnitsSaved(true);
      if (selectedUnitId === id) {
        setSelectedUnitId(updated.length > 0 ? updated[0].id : "");
      }
      setTimeout(() => setUnitsSaved(false), 3000);
    } else {
      setError("Impossible de supprimer l'unité.");
    }
  };

  const handleStartRenameUnit = (unit: Unit) => {
    setEditingUnitId(unit.id);
    setEditingUnitName(unit.name);
  };

  const handleSaveRenameUnit = async (id: string) => {
    setError("");
    setUnitsSaved(false);
    const name = editingUnitName.trim();
    if (!name) {
      setError("Le nom de l'unité ne peut pas être vide.");
      return;
    }

    const updated = localUnits.map(u => u.id === id ? { ...u, name } : u);
    const success = await onUpdateUnits(updated);
    if (success) {
      setLocalUnits(updated);
      setEditingUnitId(null);
      setUnitsSaved(true);
      setTimeout(() => setUnitsSaved(false), 3000);
    } else {
      setError("Impossible de renommer l'unité.");
    }
  };

  // --- ZONES & SUBZONES ACTIONS ---
  const activeUnit = localUnits.find(u => u.id === selectedUnitId);

  const handleAddZone = async () => {
    setError("");
    setUnitsSaved(false);
    const name = newZoneName.trim();
    if (!name) {
      setError("Veuillez saisir un nom pour la zone / bloc.");
      return;
    }

    if (!activeUnit) return;

    if (activeUnit.zones.some(z => z.name.toLowerCase() === name.toLowerCase())) {
      setError(`Une zone nommée "${name}" existe déjà dans cette unité.`);
      return;
    }

    const updatedZones = [...activeUnit.zones, { name, subzones: [] }];
    const updatedUnits = localUnits.map(u => u.id === selectedUnitId ? { ...u, zones: updatedZones } : u);

    const success = await onUpdateUnits(updatedUnits);
    if (success) {
      setLocalUnits(updatedUnits);
      setNewZoneName("");
      setSelectedZoneName(name);
      setUnitsSaved(true);
      setTimeout(() => setUnitsSaved(false), 3000);
    } else {
      setError("Impossible d'ajouter la zone.");
    }
  };

  const handleDeleteZone = async (zoneName: string) => {
    setError("");
    setUnitsSaved(false);
    if (!activeUnit) return;

    const updatedZones = activeUnit.zones.filter(z => z.name !== zoneName);
    const updatedUnits = localUnits.map(u => u.id === selectedUnitId ? { ...u, zones: updatedZones } : u);

    const success = await onUpdateUnits(updatedUnits);
    if (success) {
      setLocalUnits(updatedUnits);
      setUnitsSaved(true);
      if (selectedZoneName === zoneName) {
        setSelectedZoneName(updatedZones.length > 0 ? updatedZones[0].name : "");
      }
      setTimeout(() => setUnitsSaved(false), 3000);
    } else {
      setError("Impossible de supprimer la zone.");
    }
  };

  const handleStartRenameZone = (zone: UnitZone) => {
    setEditingZoneName(zone.name);
    setEditingZoneNewName(zone.name);
  };

  const handleSaveRenameZone = async (oldName: string) => {
    setError("");
    setUnitsSaved(false);
    if (!activeUnit) return;

    const newName = editingZoneNewName.trim();
    if (!newName) {
      setError("Le nom de la zone ne peut pas être vide.");
      return;
    }

    if (oldName !== newName && activeUnit.zones.some(z => z.name.toLowerCase() === newName.toLowerCase())) {
      setError(`Une zone nommée "${newName}" existe déjà.`);
      return;
    }

    const updatedZones = activeUnit.zones.map(z => z.name === oldName ? { ...z, name: newName } : z);
    const updatedUnits = localUnits.map(u => u.id === selectedUnitId ? { ...u, zones: updatedZones } : u);

    const success = await onUpdateUnits(updatedUnits);
    if (success) {
      setLocalUnits(updatedUnits);
      setEditingZoneName(null);
      if (selectedZoneName === oldName) {
        setSelectedZoneName(newName);
      }
      setUnitsSaved(true);
      setTimeout(() => setUnitsSaved(false), 3000);
    } else {
      setError("Impossible de renommer la zone.");
    }
  };

  const handleSaveSubzonesText = async () => {
    setError("");
    setUnitsSaved(false);
    if (!activeUnit || !selectedZoneName) return;

    // Parse comma or newline separated subzones
    const subzonesList = newSubzoneText
      .split(/[,\n]/)
      .map(s => s.trim())
      .filter(Boolean);

    const updatedZones = activeUnit.zones.map(z => 
      z.name === selectedZoneName ? { ...z, subzones: subzonesList } : z
    );
    const updatedUnits = localUnits.map(u => u.id === selectedUnitId ? { ...u, zones: updatedZones } : u);

    const success = await onUpdateUnits(updatedUnits);
    if (success) {
      setLocalUnits(updatedUnits);
      setUnitsSaved(true);
      setTimeout(() => setUnitsSaved(false), 3000);
    } else {
      setError("Impossible d'enregistrer les sous-zones.");
    }
  };

  // Load subzones text when active zone changes
  useEffect(() => {
    if (activeUnit && selectedZoneName) {
      const zone = activeUnit.zones.find(z => z.name === selectedZoneName);
      if (zone) {
        setNewSubzoneText(zone.subzones.join(", "));
      } else {
        setNewSubzoneText("");
      }
    } else {
      setNewSubzoneText("");
    }
  }, [selectedZoneName, selectedUnitId, localUnits]);

  // Napoli rapid generation trigger
  const handleQuickGenerateNapoli = () => {
    if (!activeUnit) return;
    setShowNapoliConfirm(true);
  };

  const handleConfirmQuickGenerateNapoli = async () => {
    if (!activeUnit) return;
    setError("");
    setUnitsSaved(false);
    setShowNapoliConfirm(false);

    const zones: UnitZone[] = [];
    const blocs = ["Bloc A", "Bloc B", "Bloc C", "Bloc D", "Bloc E", "Bloc F", "Bloc G"];
    const subzonesList = [
      "Étage 0",
      "Étage 1",
      "Étage 2",
      "Étage 3",
      "Étage 4",
      "Étage 5",
      "Local technique/Chaufferie",
      "Local électrique",
      "Gaine technique",
      "Local poubelles",
      "Buanderie/Lingerie",
      "Ascenseur",
      "Escaliers",
      "Couloirs communs",
      "Terrasse/Toiture"
    ];

    blocs.forEach(bloc => {
      zones.push({ name: bloc, subzones: [...subzonesList] });
    });

    const updatedUnits = localUnits.map(u => u.id === selectedUnitId ? { ...u, zones } : u);

    const success = await onUpdateUnits(updatedUnits);
    if (success) {
      setLocalUnits(updatedUnits);
      setUnitsSaved(true);
      setSelectedZoneName("Bloc A");
      setTimeout(() => setUnitsSaved(false), 3000);
    } else {
      setError("Erreur lors de la génération automatique de la structure Napoli.");
    }
  };

  return (
    <div className="space-y-8" id="settings-container">
      {/* Settings Header */}
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-xl font-extrabold text-slate-800 uppercase tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-emerald-850" />
          Administration & Configuration
        </h2>
        <p className="text-slate-500 text-xs font-semibold mt-1">
          Personnalisez la structure de votre établissement d'Oran, gérez le dossier racine et reconstruisez l'index.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg border border-red-200 text-sm flex items-center gap-2.5 font-semibold">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: Storage & Index Rebuilding */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* General App Settings */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-850" />
            Paramètres Généraux et Stockage
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Dossier de Stockage Racine *</label>
              <input
                type="text"
                value={storageRoot}
                onChange={(e) => setStorageRoot(e.target.value)}
                placeholder="Ex: ./EGCSO_Maintenance"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-800"
              />
              <span className="text-[10px] text-slate-400 font-medium">
                Chemin absolu ou relatif où sont créés l'arborescence des rapports HTML et l'index central.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Établissement</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Service Émetteur</label>
                <input
                  type="text"
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Format des Références</label>
              <input
                type="text"
                value={referenceFormat}
                disabled
                className="w-full bg-slate-100 border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-slate-400 font-mono cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 font-medium">
                Format d'indexation automatisé basé sur la nomenclature EPIC EGCSO.
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                className="bg-emerald-850 hover:bg-emerald-900 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Save className="w-4 h-4" />
                Enregistrer les paramètres
              </button>

              {settingsSaved && (
                <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Paramètres sauvegardés
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Index Rebuilding & Backup Guidance */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
              <FolderSync className="w-5 h-5 text-amber-500" />
              Reconstruction de l'Index & Sauvegardes
            </h3>

            <div className="space-y-4 pt-2">
              <p className="text-xs text-slate-600 leading-relaxed">
                Si vous copiez manuellement des rapports d'un ordinateur à un autre, ou si le fichier d'index central est accidentellement endommagé, vous pouvez instantanément <strong>reconstruire la base de données de recherche</strong>.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                L'application effectuera un scan récursif complet de vos sous-dossiers de rapports, extraira les métadonnées de chaque dossier, et régénérera l'index de recherche.
              </p>

              <div className="bg-emerald-50/40 rounded-lg border border-emerald-100 p-3 flex items-start gap-2 text-[11px] text-slate-600">
                <Info className="w-4 h-4 text-emerald-850 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-850 block mb-0.5">Note sur la portabilité de vos données :</span>
                  Pour faire une sauvegarde intégrale de vos rapports, copiez simplement le dossier <code className="bg-emerald-50 px-1 py-0.5 font-bold font-mono text-emerald-800 rounded">{storageRoot}</code> vers une clé USB ou un disque dur externe. C'est tout !
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button
              onClick={handleReconstruct}
              disabled={reconstructing}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer transition-colors"
            >
              <FolderSync className="w-4 h-4 animate-spin-slow" />
              {reconstructing ? "Reconstruction en cours..." : "Reconstruire l'index de recherche"}
            </button>

            {reconstructResult && (
              <span className={`text-xs font-bold flex items-center gap-1 ${reconstructResult.success ? "text-green-600" : "text-red-600"}`}>
                {reconstructResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {reconstructResult.message}
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Interactive Assistant: Units tree */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-850" />
              Hiérarchie & Structure des Unités
            </h3>
            <p className="text-[11px] text-slate-500 font-semibold">
              Gérez les Unités du Complexe (ex: Village, Stade) ainsi que leurs Blocs/Zones et Chambres de manière visuelle ou via JSON brut.
            </p>
          </div>
          
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => setUnitsMode("assistant")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                unitsMode === "assistant" 
                  ? "bg-emerald-800 text-white shadow-sm" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Assistant Visuel
            </button>
            <button
              onClick={() => setUnitsMode("json")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                unitsMode === "json" 
                  ? "bg-emerald-800 text-white shadow-sm" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Mode JSON Brut
            </button>
          </div>
        </div>

        {unitsMode === "json" ? (
          <div className="space-y-4">
            <textarea
              value={unitsJson}
              onChange={(e) => setUnitsJson(e.target.value)}
              rows={12}
              className="w-full bg-slate-900 text-slate-100 font-mono text-xs p-3.5 rounded-lg border border-slate-800 focus:ring-1 focus:ring-emerald-800 resize-y focus:outline-none"
            ></textarea>
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleSaveUnitsJson}
                className="bg-emerald-800 hover:bg-emerald-950 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Save className="w-4 h-4" />
                Sauvegarder le JSON
              </button>
              {unitsSaved && (
                <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Hiérarchie enregistrée
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Column 1: Units list */}
            <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/40 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">1. Liste des Unités</span>
                <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  {localUnits.length}
                </span>
              </div>

              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {localUnits.map(unit => (
                  <div
                    key={unit.id}
                    onClick={() => {
                      setSelectedUnitId(unit.id);
                      setSelectedZoneName(unit.zones.length > 0 ? unit.zones[0].name : "");
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                      selectedUnitId === unit.id 
                        ? "bg-emerald-50 border-emerald-300 text-emerald-850 shadow-sm" 
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {editingUnitId === unit.id ? (
                      <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingUnitName}
                          onChange={e => setEditingUnitName(e.target.value)}
                          className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-semibold text-slate-700 w-full"
                        />
                        <button onClick={() => handleSaveRenameUnit(unit.id)} className="text-green-600 hover:text-green-700 p-1">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingUnitId(null)} className="text-slate-400 hover:text-slate-600 p-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="truncate pr-2">
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded mr-1.5 font-bold uppercase">{unit.id}</span>
                          {unit.name}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleStartRenameUnit(unit)} className="text-slate-400 hover:text-slate-600 p-0.5" title="Renommer">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {localUnits.length > 1 && (
                            <button onClick={() => handleDeleteUnit(unit.id)} className="text-red-500 hover:text-red-600 p-0.5" title="Supprimer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Form to add unit */}
              <div className="border-t border-slate-150 pt-3 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Ajouter une Unité</span>
                <div className="grid grid-cols-3 gap-1">
                  <input
                    type="text"
                    placeholder="ID (ex: PIS)"
                    value={newUnitId}
                    onChange={e => setNewUnitId(e.target.value)}
                    maxLength={5}
                    className="col-span-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-emerald-800 font-mono uppercase"
                  />
                  <input
                    type="text"
                    placeholder="Nom d'unité (ex: Piscine)"
                    value={newUnitName}
                    onChange={e => setNewUnitName(e.target.value)}
                    className="col-span-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-emerald-800"
                  />
                </div>
                <button
                  onClick={handleAddUnit}
                  className="w-full bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-xs py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter
                </button>
              </div>
            </div>

            {/* Column 2: Zones / Blocs List */}
            <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex flex-col">
                  <span>2. Zones & Blocs</span>
                  <span className="text-[9px] text-slate-400 normal-case font-medium">Unité : {activeUnit?.name}</span>
                </div>
                {activeUnit && (
                  <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    {activeUnit.zones.length}
                  </span>
                )}
              </div>

              {activeUnit ? (
                <>
                  {activeUnit.zones.length === 0 && (
                    <div className="text-center py-6 text-slate-400 font-medium text-xs italic">
                      Aucune zone créée pour cette unité.
                    </div>
                  )}

                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                    {activeUnit.zones.map(zone => (
                      <div
                        key={zone.name}
                        onClick={() => setSelectedZoneName(zone.name)}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                          selectedZoneName === zone.name 
                            ? "bg-emerald-50 border-emerald-300 text-emerald-850 shadow-sm" 
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {editingZoneName === zone.name ? (
                          <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingZoneNewName}
                              onChange={e => setEditingZoneNewName(e.target.value)}
                              className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-semibold text-slate-700 w-full"
                            />
                            <button onClick={() => handleSaveRenameZone(zone.name)} className="text-green-600 hover:text-green-700 p-1">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingZoneName(null)} className="text-slate-400 hover:text-slate-600 p-1">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="truncate pr-2 flex items-center gap-1.5">
                              <Layout className="w-3.5 h-3.5 text-slate-400" />
                              {zone.name}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                              <button onClick={() => handleStartRenameZone(zone)} className="text-slate-400 hover:text-slate-600 p-0.5" title="Renommer">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteZone(zone.name)} className="text-red-500 hover:text-red-600 p-0.5" title="Supprimer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Form to add zone */}
                  <div className="border-t border-slate-150 pt-3 space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Ajouter une Zone</span>
                    <input
                      type="text"
                      placeholder="Nom de zone (ex: Bloc A, Zone Sud)"
                      value={newZoneName}
                      onChange={e => setNewZoneName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-emerald-800"
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={handleAddZone}
                        className="flex-1 bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-xs py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Ajouter
                      </button>

                      {/* Rapid Generation Napoli option */}
                      <button
                        onClick={handleQuickGenerateNapoli}
                        title="Générateur Rapide Napoli"
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-[10px] uppercase px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Wand2 className="w-3.5 h-3.5" /> Napoli
                      </button>
                    </div>

                    {showNapoliConfirm && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2.5">
                        <div className="flex gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wide">
                              Confirmer la génération rapide ?
                            </p>
                            <p className="text-[10px] text-amber-700 font-semibold leading-relaxed">
                              Cela va écraser les zones actuelles de <strong>{activeUnit?.name}</strong> pour générer automatiquement 7 blocs (A à G) avec étages et locaux techniques types Napoli.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1.5 justify-end">
                          <button
                            onClick={() => setShowNapoliConfirm(false)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] px-2.5 py-1 rounded transition-colors cursor-pointer"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={handleConfirmQuickGenerateNapoli}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] px-2.5 py-1 rounded transition-colors cursor-pointer"
                          >
                            Générer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-10 text-slate-400 font-medium text-xs italic">
                  Veuillez d'abord sélectionner ou ajouter une unité.
                </div>
              )}
            </div>

            {/* Column 3: Subzones (Rooms / Floors) */}
            <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex flex-col">
                  <span>3. Sous-zones / Chambres</span>
                  <span className="text-[9px] text-slate-400 normal-case font-medium">Zone : {selectedZoneName || "aucune"}</span>
                </div>
                {activeUnit && selectedZoneName && (
                  <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    {activeUnit.zones.find(z => z.name === selectedZoneName)?.subzones.length || 0}
                  </span>
                )}
              </div>

              {activeUnit && selectedZoneName ? (
                <div className="space-y-4">
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    Saisissez vos sous-zones (chambres, locaux, étages) séparées par des <strong>virgules</strong> ou des <strong>retours à la ligne</strong> :
                  </p>

                  <textarea
                    value={newSubzoneText}
                    onChange={e => setNewSubzoneText(e.target.value)}
                    rows={6}
                    placeholder="Ex: Chambre 101, Chambre 102, Local technique..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:border-emerald-800 font-mono resize-y"
                  ></textarea>

                  <button
                    onClick={handleSaveSubzonesText}
                    className="w-full bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Save className="w-4 h-4" /> Enregistrer les sous-zones
                  </button>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 font-medium text-xs italic">
                  Sélectionnez une zone pour modifier ses sous-zones.
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Interactive Assistant: Breakdown categories */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-850" />
              Catégories de Pannes & Métiers
            </h3>
            <p className="text-[11px] text-slate-500 font-semibold">
              Définissez les domaines d'intervention technique (Plomberie, Climatisation, Électricité...).
            </p>
          </div>
          
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => setCategoriesMode("assistant")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                categoriesMode === "assistant" 
                  ? "bg-emerald-800 text-white shadow-sm" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Assistant Visuel
            </button>
            <button
              onClick={() => setCategoriesMode("json")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                categoriesMode === "json" 
                  ? "bg-emerald-800 text-white shadow-sm" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Mode JSON Brut
            </button>
          </div>
        </div>

        {categoriesMode === "json" ? (
          <div className="space-y-4">
            <textarea
              value={categoriesJson}
              onChange={(e) => setCategoriesJson(e.target.value)}
              rows={12}
              className="w-full bg-slate-900 text-slate-100 font-mono text-xs p-3.5 rounded-lg border border-slate-800 focus:ring-1 focus:ring-emerald-800 resize-y focus:outline-none"
            ></textarea>
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleSaveCategoriesJson}
                className="bg-emerald-800 hover:bg-emerald-950 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Save className="w-4 h-4" />
                Sauvegarder le JSON
              </button>
              {categoriesSaved && (
                <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Catégories enregistrées
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* List and form row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Category list (spanning 2 columns) */}
              <div className="md:col-span-2 border border-slate-100 rounded-lg p-4 bg-slate-50/40 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">Domaines d'intervention enregistrés</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {localCategories.map(cat => (
                    <div
                      key={cat.id}
                      className="bg-white border border-slate-200 p-2.5 rounded-lg flex items-center justify-between text-xs font-bold shadow-sm"
                    >
                      {editingCatId === cat.id ? (
                        <div className="flex items-center gap-1 w-full">
                          <input
                            type="text"
                            value={editingCatName}
                            onChange={e => setEditingCatName(e.target.value)}
                            className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-semibold text-slate-700 w-full"
                          />
                          <button onClick={() => handleSaveRenameCategory(cat.id)} className="text-green-600 hover:text-green-700 p-1">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingCatId(null)} className="text-slate-400 hover:text-slate-600 p-1">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="truncate pr-2">
                            <span className="font-mono text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded mr-1.5 font-extrabold uppercase">{cat.id}</span>
                            {cat.name}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => handleStartRenameCategory(cat)} className="text-slate-400 hover:text-slate-600 p-1" title="Renommer">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {localCategories.length > 1 && (
                              <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-500 hover:text-red-600 p-1" title="Supprimer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Form to add category (1 column) */}
              <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/40 space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">Créer un domaine</span>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Identifiant unique (3-4 lettres)</label>
                    <input
                      type="text"
                      placeholder="Ex: PLO"
                      value={newCatId}
                      onChange={e => setNewCatId(e.target.value)}
                      maxLength={5}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-emerald-800 font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Nom du domaine</label>
                    <input
                      type="text"
                      placeholder="Ex: Plomberie & Chauffage"
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-emerald-800"
                    />
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <button
                    onClick={handleAddCategory}
                    className="w-full bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Ajouter le domaine
                  </button>

                  {categoriesSaved && (
                    <span className="text-xs font-bold text-green-600 flex items-center justify-center gap-1 mt-1">
                      <CheckCircle2 className="w-4 h-4" /> Enregistré !
                    </span>
                  )}
                </div>

              </div>

            </div>

          </div>
        )}
      </div>

      {/* Backup & Restore Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-850" />
            Sauvegarde & Restauration de la Base de Données
          </h3>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            Gérez la sécurité de vos données en téléchargeant une sauvegarde complète (fichiers JSON, configurations, photos et enregistrements audio) ou en restaurant une sauvegarde précédente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Backup */}
          <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/40 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-emerald-850" />
                1. Télécharger une Sauvegarde
              </span>
              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                Génère un fichier archive ZIP contenant l'intégralité de la base de données (rapports, fiches de pannes, photos avant/après, notes vocales et fichiers de configuration). Conservez précieusement ce fichier sur votre ordinateur.
              </p>
            </div>
            
            <button
              onClick={handleDownloadBackup}
              disabled={backupLoading}
              className="w-full bg-emerald-800 hover:bg-emerald-950 disabled:bg-slate-350 text-white font-bold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Download className={`w-4 h-4 ${backupLoading ? "animate-bounce" : ""}`} />
              {backupLoading ? "Génération de l'archive..." : "Télécharger la Sauvegarde (.zip)"}
            </button>
          </div>

          {/* Right Column: Restore */}
          <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/40 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-amber-600" />
                2. Restaurer une Sauvegarde
              </span>
              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                Sélectionnez un fichier ZIP de sauvegarde précédemment téléchargé pour restaurer l'intégralité du système. <strong className="text-amber-850">Attention :</strong> Cette action écrasera toutes vos données et configurations actuelles.
              </p>
            </div>

            <div className="relative">
              <input
                type="file"
                accept=".zip"
                onChange={handleRestoreBackup}
                disabled={restoreLoading}
                id="restore-file-input"
                className="hidden"
              />
              <label
                htmlFor="restore-file-input"
                className={`w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-350 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                  restoreLoading ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                {restoreLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Restauration en cours...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Importer et Restaurer (.zip)
                  </>
                )}
              </label>
            </div>
          </div>
        </div>

        {restoreSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-800 flex-shrink-0" />
            <p className="text-xs font-bold text-emerald-800">{restoreSuccess}</p>
          </div>
        )}
      </div>

    </div>
  );
}
