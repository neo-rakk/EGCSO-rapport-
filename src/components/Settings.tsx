import React, { useState, useEffect } from "react";
import { AppSettings, Unit, BreakdownCategory } from "../types";
import { 
  Settings as SettingsIcon, 
  Database, 
  FolderSync, 
  FileJson, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  HardDriveDownload,
  Info
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
  
  // JSON editors states
  const [unitsJson, setUnitsJson] = useState("");
  const [categoriesJson, setCategoriesJson] = useState("");

  // Status flags
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [unitsSaved, setUnitsSaved] = useState(false);
  const [categoriesSaved, setCategoriesSaved] = useState(false);
  const [reconstructResult, setReconstructResult] = useState<{ success: boolean; count: number; message: string } | null>(null);
  const [reconstructing, setReconstructing] = useState(false);
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
    }
  }, [units]);

  useEffect(() => {
    if (categories) {
      setCategoriesJson(JSON.stringify(categories, null, 2));
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

  // Handle Units JSON update
  const handleSaveUnits = async () => {
    setUnitsSaved(false);
    setError("");
    try {
      const parsed = JSON.parse(unitsJson);
      if (!Array.isArray(parsed)) {
        throw new Error("La structure des unités doit être une liste de type tableau (Array).");
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

  // Handle Categories JSON update
  const handleSaveCategories = async () => {
    setCategoriesSaved(false);
    setError("");
    try {
      const parsed = JSON.parse(categoriesJson);
      if (!Array.isArray(parsed)) {
        throw new Error("La liste des catégories de pannes doit être de type tableau (Array).");
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
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-slate-700 font-mono"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Service Émetteur</label>
                <input
                  type="text"
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-slate-700"
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
                className="bg-emerald-850 hover:bg-emerald-900 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
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
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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

      {/* JSON Custom Hierarchy Editors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Units configuration tree */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <FileJson className="w-5 h-5 text-emerald-850" />
              Hiérarchie des Unités (unites.json)
            </h3>
            <button
              onClick={handleSaveUnits}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Sauvegarder
            </button>
          </div>
          
          <p className="text-xs text-slate-500">
            Définit la cascade d'Unités, de Blocs/Zones et de Sous-zones pour les formulaires. Éditez directement le JSON ci-dessous :
          </p>

          <textarea
            value={unitsJson}
            onChange={(e) => setUnitsJson(e.target.value)}
            rows={15}
            className="w-full bg-slate-900 text-slate-100 font-mono text-xs p-3.5 rounded-lg border border-slate-800 focus:ring-1 focus:ring-emerald-800 resize-y focus:outline-none"
          ></textarea>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium">
              Vérifiez que le format JSON est valide avant de sauvegarder.
            </span>
            {unitsSaved && (
              <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Structure enregistrée
              </span>
            )}
          </div>
        </div>

        {/* Categories configuration tree */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <FileJson className="w-5 h-5 text-emerald-850" />
              Catégories de pannes (categories_pannes.json)
            </h3>
            <button
              onClick={handleSaveCategories}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Sauvegarder
            </button>
          </div>
          
          <p className="text-xs text-slate-500">
            Définit l'ensemble des métiers / domaines d'intervention listés lors de la création d'un rapport :
          </p>

          <textarea
            value={categoriesJson}
            onChange={(e) => setCategoriesJson(e.target.value)}
            rows={15}
            className="w-full bg-slate-900 text-slate-100 font-mono text-xs p-3.5 rounded-lg border border-slate-800 focus:ring-1 focus:ring-emerald-800 resize-y focus:outline-none"
          ></textarea>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium">
              Structure simple de type array d'objets `id` et `name`.
            </span>
            {categoriesSaved && (
              <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Catégories enregistrées
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
