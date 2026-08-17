'use client';

import { useState } from 'react';
import type { AppSettings, Unit, BreakdownCategory } from '@/types';
import { useAppStore } from '@/hooks/use-app-store';
import { Save, RefreshCw, Download, Upload, Database, FolderSync, CheckCircle2, AlertCircle, Sparkles, Building2, Layers, Image as ImageIcon, Plus, Trash2, Code2, Eye, Palette, Wrench, Edit3 } from 'lucide-react';

interface SettingsProps {
  appSettings: AppSettings;
  units: Unit[];
  categories: BreakdownCategory[];
}

export default function Settings({ appSettings, units: initialUnits, categories: initialCategories }: SettingsProps) {
  const { setSettings, setUnits, setCategories, triggerAlert, setReports, appVersion } = useAppStore();

  // General Settings
  const [storageRoot, setStorageRoot] = useState(appSettings.storageRoot);
  const [companyName, setCompanyName] = useState(appSettings.companyName);
  const [departmentName, setDepartmentName] = useState(appSettings.departmentName);
  const [chiefMaintenanceName, setChiefMaintenanceName] = useState(appSettings.chiefMaintenanceName || 'BOUARFA HAKIM');
  const [referenceFormat, setReferenceFormat] = useState(appSettings.referenceFormat);
  const [githubRepo, setGithubRepo] = useState(appSettings.githubRepo || '');
  const [savingSettings, setSavingSettings] = useState(false);

  // Logo Upload
  const [logoPreview, setLogoPreview] = useState('/icon.png');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Visual Units Management State
  const [unitsList, setUnitsList] = useState<Unit[]>(initialUnits);
  const [newUnitCode, setNewUnitCode] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitZone, setNewUnitZone] = useState('');
  const [addingUnit, setAddingUnit] = useState(false);
  const [savingUnits, setSavingUnits] = useState(false);

  // Visual Categories Management State
  const [categoriesList, setCategoriesList] = useState<BreakdownCategory[]>(initialCategories);
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [savingCategories, setSavingCategories] = useState(false);

  // JSON Raw View Toggle
  const [showJsonView, setShowJsonView] = useState(false);
  const [unitsJson, setUnitsJson] = useState(JSON.stringify(initialUnits, null, 2));
  const [categoriesJson, setCategoriesJson] = useState(JSON.stringify(initialCategories, null, 2));

  // System Reconstruction & Backup
  const [reconstructing, setReconstructing] = useState(false);

  // Update checking states
  const [updateInfo, setUpdateInfo] = useState<{
    currentVersion: string;
    latestVersion: string;
    updateAvailable: boolean;
    error?: string;
    githubRepo?: string;
    releaseNotes?: string;
    publishedAt?: string;
    releaseUrl?: string;
  } | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [applyingUpdate, setApplyingUpdate] = useState(false);
  const [updateStatusMsg, setUpdateStatusMsg] = useState('');

  // Save General Settings
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storageRoot, companyName, departmentName, chiefMaintenanceName, referenceFormat, githubRepo }),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        triggerAlert('success', 'Identité visuelle et paramètres généraux mis à jour !');
      }
    } catch {
      triggerAlert('error', 'Erreur lors de la sauvegarde des paramètres.');
    }
    setSavingSettings(false);
  };

  // Logo Upload Handler
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('logo', file);

    fetch('/api/config/logo', { method: 'POST', body: formData })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLogoPreview(URL.createObjectURL(file));
          triggerAlert('success', 'Nouveau logo appliqué avec succès !');
        } else {
          triggerAlert('error', data.error || 'Erreur lors de l\'envoi du logo.');
        }
      })
      .catch(() => triggerAlert('error', 'Échec du téléchargement du logo.'))
      .finally(() => setUploadingLogo(false));
  };

  // Visual Units Actions
  const handleAddUnitVisually = () => {
    if (!newUnitCode.trim() || !newUnitName.trim()) {
      triggerAlert('error', 'Veuillez saisir au moins un code (ID) et un nom pour la nouvelle unité.');
      return;
    }
    const codeUpper = newUnitCode.trim().toUpperCase();
    if (unitsList.some((u) => u.id === codeUpper)) {
      triggerAlert('error', `L'unité avec le code ${codeUpper} existe déjà.`);
      return;
    }
    const newU: Unit = {
      id: codeUpper,
      name: newUnitName.trim(),
      zones: newUnitZone.trim() ? [{ name: newUnitZone.trim(), subzones: [] }] : [],
    };
    const updated = [...unitsList, newU];
    setUnitsList(updated);
    setUnitsJson(JSON.stringify(updated, null, 2));
    setNewUnitCode('');
    setNewUnitName('');
    setNewUnitZone('');
    setAddingUnit(false);
    triggerAlert('success', `Unité ${codeUpper} ajoutée ! Cliquez sur "Enregistrer la hiérarchie" pour confirmer.`);
  };

  const handleAddZoneToUnit = (unitId: string) => {
    const zoneName = prompt(`Nom de la nouvelle zone pour l'unité ${unitId} :`);
    if (!zoneName || !zoneName.trim()) return;
    const updated = unitsList.map((u) => {
      if (u.id === unitId) {
        return {
          ...u,
          zones: [...u.zones, { name: zoneName.trim(), subzones: [] }],
        };
      }
      return u;
    });
    setUnitsList(updated);
    setUnitsJson(JSON.stringify(updated, null, 2));
    triggerAlert('success', `Zone "${zoneName.trim()}" ajoutée à l'unité ${unitId} !`);
  };

  const handleEditZoneName = (unitId: string, zIdx: number) => {
    const unit = unitsList.find((u) => u.id === unitId);
    if (!unit || !unit.zones[zIdx]) return;
    const currentName = unit.zones[zIdx].name;
    const newName = prompt(`Renommer la zone "${currentName}" :`, currentName);
    if (!newName || !newName.trim() || newName.trim() === currentName) return;
    const updated = unitsList.map((u) => {
      if (u.id === unitId) {
        const newZones = [...u.zones];
        newZones[zIdx] = { ...newZones[zIdx], name: newName.trim() };
        return { ...u, zones: newZones };
      }
      return u;
    });
    setUnitsList(updated);
    setUnitsJson(JSON.stringify(updated, null, 2));
    triggerAlert('success', `Zone renommée en "${newName.trim()}" !`);
  };

  const handleDeleteZone = (unitId: string, zIdx: number) => {
    const unit = unitsList.find((u) => u.id === unitId);
    if (!unit || !unit.zones[zIdx]) return;
    if (!confirm(`Voulez-vous vraiment supprimer la zone "${unit.zones[zIdx].name}" de l'unité ${unitId} ?`)) return;
    const updated = unitsList.map((u) => {
      if (u.id === unitId) {
        return { ...u, zones: u.zones.filter((_, i) => i !== zIdx) };
      }
      return u;
    });
    setUnitsList(updated);
    setUnitsJson(JSON.stringify(updated, null, 2));
    triggerAlert('success', 'Zone supprimée.');
  };

  const handleEditUnitName = (unitId: string) => {
    const unit = unitsList.find((u) => u.id === unitId);
    if (!unit) return;
    const newName = prompt(`Nouveau nom complet pour l'unité ${unitId} :`, unit.name);
    if (!newName || !newName.trim() || newName.trim() === unit.name) return;
    const updated = unitsList.map((u) => (u.id === unitId ? { ...u, name: newName.trim() } : u));
    setUnitsList(updated);
    setUnitsJson(JSON.stringify(updated, null, 2));
    triggerAlert('success', `Nom de l'unité mis à jour : "${newName.trim()}" !`);
  };

  const [activeSubzoneModal, setActiveSubzoneModal] = useState<{ unitId: string; zIdx: number } | null>(null);
  const [newSubzoneInput, setNewSubzoneInput] = useState('');

  const handleAddSubzone = (unitId: string, zIdx: number, subzoneName?: string) => {
    const nameToAdd = subzoneName || newSubzoneInput;
    if (!nameToAdd || !nameToAdd.trim()) return;
    const nameTrim = nameToAdd.trim();

    const updated = unitsList.map((u) => {
      if (u.id === unitId) {
        const newZones = [...u.zones];
        const targetZone = newZones[zIdx];
        if (targetZone) {
          const currentSubs = targetZone.subzones || [];
          if (!currentSubs.includes(nameTrim)) {
            newZones[zIdx] = { ...targetZone, subzones: [...currentSubs, nameTrim] };
          }
        }
        return { ...u, zones: newZones };
      }
      return u;
    });
    setUnitsList(updated);
    setUnitsJson(JSON.stringify(updated, null, 2));
    setNewSubzoneInput('');
    triggerAlert('success', `Sous-zone "${nameTrim}" ajoutée !`);
  };

  const handleEditSubzone = (unitId: string, zIdx: number, sIdx: number) => {
    const unit = unitsList.find((u) => u.id === unitId);
    if (!unit || !unit.zones[zIdx] || !unit.zones[zIdx].subzones[sIdx]) return;
    const currentName = unit.zones[zIdx].subzones[sIdx];
    const newName = prompt(`Renommer la sous-zone / local "${currentName}" :`, currentName);
    if (!newName || !newName.trim() || newName.trim() === currentName) return;

    const updated = unitsList.map((u) => {
      if (u.id === unitId) {
        const newZones = [...u.zones];
        const targetZone = newZones[zIdx];
        if (targetZone) {
          const newSubs = [...(targetZone.subzones || [])];
          newSubs[sIdx] = newName.trim();
          newZones[zIdx] = { ...targetZone, subzones: newSubs };
        }
        return { ...u, zones: newZones };
      }
      return u;
    });
    setUnitsList(updated);
    setUnitsJson(JSON.stringify(updated, null, 2));
    triggerAlert('success', `Sous-zone renommée en "${newName.trim()}" !`);
  };

  const handleDeleteSubzone = (unitId: string, zIdx: number, sIdx: number) => {
    const updated = unitsList.map((u) => {
      if (u.id === unitId) {
        const newZones = [...u.zones];
        const targetZone = newZones[zIdx];
        if (targetZone) {
          const newSubs = (targetZone.subzones || []).filter((_, i) => i !== sIdx);
          newZones[zIdx] = { ...targetZone, subzones: newSubs };
        }
        return { ...u, zones: newZones };
      }
      return u;
    });
    setUnitsList(updated);
    setUnitsJson(JSON.stringify(updated, null, 2));
    triggerAlert('success', 'Sous-zone supprimée.');
  };

  const handleAddPresetFloors = (unitId: string, zIdx: number) => {
    const floors = ['Étage 0', 'Étage 1', 'Étage 2', 'Étage 3', 'Étage 4', 'Étage 5'];
    floors.forEach((f) => handleAddSubzone(unitId, zIdx, f));
  };

  const handleAddPresetTechRooms = (unitId: string, zIdx: number) => {
    const techRooms = ['Local technique/Chaufferie', 'Local électrique', 'Gaine technique', 'Local poubelles', 'Buanderie/Lingerie', 'Ascenseur', 'Escaliers', 'Couloirs communs', 'Terrasse/Toiture'];
    techRooms.forEach((r) => handleAddSubzone(unitId, zIdx, r));
  };

  const handleDeleteUnitVisually = (unitId: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'unité ${unitId} ?`)) return;
    const updated = unitsList.filter((u) => u.id !== unitId);
    setUnitsList(updated);
    setUnitsJson(JSON.stringify(updated, null, 2));
  };

  const handleSaveUnitsList = async (listToSave = unitsList) => {
    setSavingUnits(true);
    try {
      const res = await fetch('/api/config/unites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listToSave),
      });
      if (res.ok) {
        setUnits(listToSave);
        triggerAlert('success', 'Hiérarchie des unités enregistrée avec succès !');
      } else {
        triggerAlert('error', 'Erreur d\'enregistrement de la hiérarchie.');
      }
    } catch {
      triggerAlert('error', 'Erreur réseau.');
    }
    setSavingUnits(false);
  };

  // Visual Categories Actions
  const handleAddCategoryVisually = () => {
    if (!newCatName.trim()) return;
    const newId = `cat_${Date.now()}`;
    const newCat: BreakdownCategory = { id: newId, name: newCatName.trim() };
    const updated = [...categoriesList, newCat];
    setCategoriesList(updated);
    setCategoriesJson(JSON.stringify(updated, null, 2));
    setNewCatName('');
    setAddingCat(false);
    triggerAlert('success', `Domaine "${newCat.name}" ajouté ! Cliquez sur "Enregistrer les catégories" pour valider.`);
  };

  const handleDeleteCategoryVisually = (catId: string) => {
    if (!confirm('Voulez-vous supprimer ce domaine de panne ?')) return;
    const updated = categoriesList.filter((c) => c.id !== catId);
    setCategoriesList(updated);
    setCategoriesJson(JSON.stringify(updated, null, 2));
  };

  const handleSaveCategoriesList = async (listToSave = categoriesList) => {
    setSavingCategories(true);
    try {
      const res = await fetch('/api/config/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listToSave),
      });
      if (res.ok) {
        setCategories(listToSave);
        triggerAlert('success', 'Catégories enregistrées avec succès !');
      }
    } catch {
      triggerAlert('error', 'Erreur d\'enregistrement des catégories.');
    }
    setSavingCategories(false);
  };

  // Raw JSON saves
  const handleSaveUnitsFromJson = async () => {
    try {
      const parsed = JSON.parse(unitsJson);
      setUnitsList(parsed);
      await handleSaveUnitsList(parsed);
    } catch {
      triggerAlert('error', 'Format JSON invalide pour la hiérarchie des unités.');
    }
  };

  const handleSaveCategoriesFromJson = async () => {
    try {
      const parsed = JSON.parse(categoriesJson);
      setCategoriesList(parsed);
      await handleSaveCategoriesList(parsed);
    } catch {
      triggerAlert('error', 'Format JSON invalide pour les catégories de pannes.');
    }
  };

  // Reconstruct Index & Backups
  const handleReconstruct = async () => {
    setReconstructing(true);
    try {
      const res = await fetch('/api/reports/reconstruct', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        triggerAlert('success', result.message);
        const rRes = await fetch('/api/reports');
        if (rRes.ok) setReports(await rRes.json());
      }
    } catch {
      triggerAlert('error', 'Erreur de reconstruction de l\'index.');
    }
    setReconstructing(false);
  };

  const handleBackup = async () => {
    try {
      const res = await fetch('/api/backup');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10);
        a.download = `egcso_sauvegarde_${dateStr}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        triggerAlert('success', 'Sauvegarde ZIP téléchargée avec succès !');
      }
    } catch {
      triggerAlert('error', 'Erreur lors du téléchargement de la sauvegarde.');
    }
  };

  const handleRestore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(',')[1];
        try {
          const res = await fetch('/api/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zipData: base64 }),
          });
          if (res.ok) {
            const data = await res.json();
            triggerAlert('success', data.message);
            const rRes = await fetch('/api/reports');
            if (rRes.ok) setReports(await rRes.json());
          }
        } catch {
          triggerAlert('error', 'Erreur de restauration.');
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // Update check handlers
  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const res = await fetch('/api/update/check');
      const data = await res.json();
      setUpdateInfo(data);
    } catch (err: any) {
      setUpdateInfo({ currentVersion: appVersion || '?', latestVersion: '?', updateAvailable: false, error: 'Échec de la recherche de mise à jour: ' + err.message });
    }
    setCheckingUpdate(false);
  };

  const handleApplyUpdate = async () => {
    if (!window.confirm('Voulez-vous lancer la mise à jour automatique maintenant ? Une sauvegarde complète de vos données d\'activité sera créée automatiquement avant l\'installation.')) {
      return;
    }
    setApplyingUpdate(true);
    setUpdateStatusMsg('Lancement de la mise à jour... Téléchargement et sauvegarde de sécurité en cours.');
    try {
      const res = await fetch('/api/update/apply', { method: 'POST' });
      if (res.ok) {
        setUpdateStatusMsg('Mise à jour téléchargée ! Application des fichiers et redémarrage du serveur en cours...');
        let attempts = 0;
        const maxAttempts = 30;
        const poll = setInterval(async () => {
          attempts++;
          try {
            const checkRes = await fetch('/api/update/check');
            if (checkRes.ok) {
              const checkData = await checkRes.json();
              if (!checkData.updateAvailable) {
                clearInterval(poll);
                setApplyingUpdate(false);
                setUpdateInfo(checkData);
                setUpdateStatusMsg('🎉 Mise à jour terminée avec succès ! Rechargement de l\'application...');
                setTimeout(() => window.location.reload(), 2000);
              }
            }
          } catch {
            // expected during server restart
          }
          if (attempts >= maxAttempts) {
            clearInterval(poll);
            setUpdateStatusMsg(`Redémarrage du serveur et finalisation (tentative ${attempts})...`);
          }
        }, 5000);
      } else {
        const data = await res.json();
        alert('Échec du lancement de la mise à jour: ' + (data.error || 'Erreur inconnue'));
        setApplyingUpdate(false);
      }
    } catch (err: any) {
      alert('Erreur réseau lors de la demande de mise à jour: ' + err.message);
      setApplyingUpdate(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* SECTION 1: VISUAL BRANDING & LOGO SETTINGS */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl"><Palette className="w-5 h-5" /></div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Identité Visuelle & Logo Officiel</h3>
              <p className="text-xs text-slate-500 font-medium">Personnalisez le logo et l'en-tête de l'application et des rapports d'impression.</p>
            </div>
          </div>
          <button onClick={handleSaveSettings} disabled={savingSettings} className="flex items-center gap-2 bg-emerald-800 text-white font-bold px-4 py-2 rounded-lg text-xs hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-sm">
            <Save className="w-4 h-4" />{savingSettings ? 'Enregistrement...' : 'Sauvegarder l\'identité'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Logo Card Manager */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center space-y-4">
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Logo Officiel de l'Application</span>
            <div className="relative w-28 h-28 mx-auto bg-white rounded-2xl border-2 border-dashed border-slate-300 p-2 flex items-center justify-center shadow-inner group">
              <img src={logoPreview} alt="Logo EGCSO" className="max-w-full max-h-full object-contain" />
              <label className="absolute inset-0 bg-slate-900/60 text-white rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all text-[10px] font-bold gap-1">
                <ImageIcon className="w-5 h-5 text-emerald-400" />
                <span>Changer logo</span>
                <input type="file" accept="image/*" onChange={handleLogoChange} disabled={uploadingLogo} className="hidden" />
              </label>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-slate-600">Recommandé : PNG ou SVG sur fond transparent</p>
              <p className="text-[10px] text-slate-400">Apparaît sur l'en-tête, les fiches de suivi et les rapports PDF.</p>
            </div>
            <label className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:border-emerald-800 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer shadow-sm transition-all">
              <Upload className="w-3.5 h-3.5 text-emerald-800" /> {uploadingLogo ? 'Envoi...' : 'Parcourir un fichier image'}
              <input type="file" accept="image/*" onChange={handleLogoChange} disabled={uploadingLogo} className="hidden" />
            </label>
          </div>

          {/* Header Form & Live Preview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Nom de l'organisme / Entreprise</label>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Département / Direction</label>
                <input type="text" value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Nom du Chef Service Maintenance (Visa)</label>
                <input type="text" value={chiefMaintenanceName} onChange={(e) => setChiefMaintenanceName(e.target.value)} placeholder="Ex: BOUARFA HAKIM" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Racine de stockage des données</label>
                <input type="text" value={storageRoot} onChange={(e) => setStorageRoot(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Format de référence (Lecture seule)</label>
                <input type="text" value={referenceFormat} disabled className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-400 cursor-not-allowed" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Dépôt GitHub (Mises à jour automatiques)</label>
              <input type="text" value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)} placeholder="Ex: neo-rakk/EGCSO-rapport-" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800" />
            </div>

            {/* Live Visual Header Preview Box */}
            <div className="p-4 bg-emerald-900 text-white rounded-xl shadow-sm space-y-2 border-l-4 border-amber-400">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">Aperçu Visuel en Direct de l'En-Tête Officiel</span>
              <div className="flex items-center gap-3 pt-1">
                <img src={logoPreview} alt="Logo" className="w-10 h-10 object-contain bg-white p-1 rounded border border-emerald-700" />
                <div>
                  <h4 className="font-black text-sm text-white leading-tight">{companyName || 'EPIC EGCSO'}</h4>
                  <p className="text-xs font-bold uppercase text-emerald-200">{departmentName || 'Service Maintenance'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: VISUAL UNITS & ZONES MANAGEMENT */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl"><Building2 className="w-5 h-5" /></div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Gestion Visuelle des Unités et des Zones</h3>
              <p className="text-xs text-slate-500 font-medium">Structurez les unités du complexe sportif et leurs blocs / zones d'intervention sans toucher au code.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAddingUnit(!addingUnit)} className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-bold px-3.5 py-2 rounded-lg text-xs shadow-sm">
              <Plus className="w-4 h-4" /> {addingUnit ? 'Fermer le formulaire' : 'Ajouter une Unité'}
            </button>
            <button onClick={() => handleSaveUnitsList(unitsList)} disabled={savingUnits} className="inline-flex items-center gap-1.5 bg-emerald-800 text-white hover:bg-emerald-700 disabled:opacity-50 font-bold px-4 py-2 rounded-lg text-xs shadow-sm">
              <Save className="w-4 h-4" /> {savingUnits ? 'Enregistrement...' : 'Enregistrer la hiérarchie'}
            </button>
          </div>
        </div>

        {/* Form to Add New Unit */}
        {addingUnit && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 animate-in fade-in duration-200">
            <h4 className="text-xs font-extrabold uppercase text-emerald-900">Nouvelle Unité à ajouter</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="text" value={newUnitCode} onChange={(e) => setNewUnitCode(e.target.value)} placeholder="Code ID (ex: GYM, TNS)" className="bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900" />
              <input type="text" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} placeholder="Nom de l'unité (ex: Gymnase Annexe)" className="bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900" />
              <input type="text" value={newUnitZone} onChange={(e) => setNewUnitZone(e.target.value)} placeholder="Première zone (ex: Hall d'accueil)" className="bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={handleAddUnitVisually} className="bg-emerald-800 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm hover:bg-emerald-700">Valider et Ajouter</button>
            </div>
          </div>
        )}

        {/* Visual Cards Grid for Units */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {unitsList.map((unit) => (
            <div key={unit.id} className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-3 hover:border-slate-300 hover:bg-white transition-all shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-800 text-white font-extrabold text-[10px] px-2 py-0.5 rounded uppercase">{unit.id}</span>
                  <h4 onClick={() => handleEditUnitName(unit.id)} className="font-extrabold text-slate-900 text-xs truncate max-w-[150px] cursor-pointer hover:text-emerald-800 flex items-center gap-1" title="Cliquer pour renommer l'unité">
                    {unit.name} <Edit3 className="w-3 h-3 text-slate-400 opacity-60" />
                  </h4>
                </div>
                <button onClick={() => handleDeleteUnitVisually(unit.id)} className="text-slate-400 hover:text-red-600 p-1" title="Supprimer l'unité"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span>Zones / Blocs ({unit.zones.length})</span>
                  <button onClick={() => handleAddZoneToUnit(unit.id)} className="text-emerald-800 hover:underline text-[10px] font-extrabold flex items-center gap-0.5">
                    <Plus className="w-3 h-3" /> Ajouter Zone
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 min-h-[36px]">
                  {unit.zones.length === 0 ? (
                    <span className="text-[10px] text-slate-400 italic">Aucune zone définie</span>
                  ) : (
                    unit.zones.map((z, zIdx) => {
                      const subCount = z.subzones?.length || 0;
                      return (
                        <div key={zIdx} className="bg-white border border-slate-200 hover:border-emerald-800 text-slate-800 px-2 py-1 rounded-md text-[10px] font-bold shadow-2xs flex items-center gap-1.5 transition-all group">
                          <span>{z.name}</span>
                          <button onClick={() => setActiveSubzoneModal({ unitId: unit.id, zIdx })} className="bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded text-[9px] font-black hover:bg-emerald-800 hover:text-white transition-all" title="Gérer les sous-zones / locaux de ce bloc">
                            {subCount} s-zones
                          </button>
                          <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100">
                            <button onClick={() => handleEditZoneName(unit.id, zIdx)} className="text-slate-400 hover:text-emerald-800" title="Renommer cette zone"><Edit3 className="w-3 h-3" /></button>
                            <button onClick={() => handleDeleteZone(unit.id, zIdx)} className="text-slate-400 hover:text-red-600" title="Supprimer cette zone">&times;</button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* SUBZONES CONFIGURATION MODAL / PANEL */}
        {activeSubzoneModal && (() => {
          const targetUnit = unitsList.find((u) => u.id === activeSubzoneModal.unitId);
          const targetZone = targetUnit?.zones[activeSubzoneModal.zIdx];
          if (!targetUnit || !targetZone) return null;
          const subzones = targetZone.subzones || [];

          return (
            <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-800 text-white">{targetUnit.id}</span>
                    <h3 className="text-base font-extrabold text-slate-900 mt-1">Configuration des Sous-Zones / Locaux de "{targetZone.name}"</h3>
                    <p className="text-xs text-slate-500 font-medium">Gérez la liste détaillée des locaux, étages, salles et espaces de cette zone.</p>
                  </div>
                  <button onClick={() => setActiveSubzoneModal(null)} className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1">&times;</button>
                </div>

                {/* Quick Presets */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-emerald-800" /> Pré-remplissage rapide</span>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleAddPresetFloors(targetUnit.id, activeSubzoneModal.zIdx)} className="px-3 py-1 bg-white border border-slate-300 hover:border-emerald-800 rounded text-xs font-bold text-slate-700 shadow-2xs">
                      + Ajouter Étages (0 à 5)
                    </button>
                    <button onClick={() => handleAddPresetTechRooms(targetUnit.id, activeSubzoneModal.zIdx)} className="px-3 py-1 bg-white border border-slate-300 hover:border-emerald-800 rounded text-xs font-bold text-slate-700 shadow-2xs">
                      + Ajouter Locaux Techniques Standards
                    </button>
                  </div>
                </div>

                {/* Add Subzone Input */}
                <div className="flex gap-2">
                  <input type="text" value={newSubzoneInput} onChange={(e) => setNewSubzoneInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubzone(targetUnit.id, activeSubzoneModal.zIdx); }} placeholder="Saisir un nouveau local / sous-zone (ex: Local Onduleur, Chambre 102)" className="flex-1 bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800" />
                  <button onClick={() => handleAddSubzone(targetUnit.id, activeSubzoneModal.zIdx)} className="bg-emerald-800 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm hover:bg-emerald-700">
                    Ajouter
                  </button>
                </div>

                {/* Subzones List Tags */}
                <div className="space-y-1.5 max-h-60 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-600 uppercase">Sous-zones enregistrées ({subzones.length})</span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {subzones.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Aucune sous-zone configurée pour ce bloc.</p>
                    ) : (
                      subzones.map((sub, sIdx) => (
                        <div key={sIdx} className="bg-white border border-slate-300 hover:border-emerald-800 text-slate-800 px-2.5 py-1 rounded-lg text-xs font-bold shadow-2xs flex items-center gap-2 group transition-all">
                          <span>{sub}</span>
                          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100">
                            <button onClick={() => handleEditSubzone(targetUnit.id, activeSubzoneModal.zIdx, sIdx)} className="text-slate-400 hover:text-emerald-800" title="Renommer"><Edit3 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDeleteSubzone(targetUnit.id, activeSubzoneModal.zIdx, sIdx)} className="text-slate-400 hover:text-red-600 font-bold text-sm" title="Supprimer">&times;</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <button onClick={() => { handleSaveUnitsList(unitsList); setActiveSubzoneModal(null); }} className="bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-sm hover:bg-emerald-700">
                    Valider et Enregistrer
                  </button>
                  <button onClick={() => setActiveSubzoneModal(null)} className="bg-slate-100 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-slate-200">
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* SECTION 3: VISUAL BREAKDOWN CATEGORIES MANAGEMENT */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-800 rounded-xl"><Wrench className="w-5 h-5" /></div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Domaines & Catégories de Pannes</h3>
              <p className="text-xs text-slate-500 font-medium">Gérez la liste visuelle des domaines de maintenance (Électricité, Plomberie, etc.).</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAddingCat(!addingCat)} className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 font-bold px-3.5 py-2 rounded-lg text-xs shadow-sm">
              <Plus className="w-4 h-4" /> {addingCat ? 'Fermer' : 'Ajouter une Catégorie'}
            </button>
            <button onClick={() => handleSaveCategoriesList(categoriesList)} disabled={savingCategories} className="inline-flex items-center gap-1.5 bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 font-bold px-4 py-2 rounded-lg text-xs shadow-sm">
              <Save className="w-4 h-4" /> {savingCategories ? 'Enregistrement...' : 'Enregistrer les catégories'}
            </button>
          </div>
        </div>

        {/* Add Category Form */}
        {addingCat && (
          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3 animate-in fade-in duration-200">
            <h4 className="text-xs font-extrabold uppercase text-amber-900">Nouveau Domaine de Panne</h4>
            <div className="flex gap-3">
              <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nom du domaine (ex: Climatisation & CTA, Moteurs)" className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900" />
              <button onClick={handleAddCategoryVisually} className="bg-amber-600 text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-amber-700">Ajouter</button>
            </div>
          </div>
        )}

        {/* Categories Visual Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {categoriesList.map((cat) => (
            <div key={cat.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs hover:bg-white transition-all">
              <span className="text-xs font-bold text-slate-800 truncate">{cat.name}</span>
              <button onClick={() => handleDeleteCategoryVisually(cat.id)} className="text-slate-400 hover:text-red-600 p-1" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: BACKUP & RESTORATION */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="p-2 bg-slate-100 text-slate-700 rounded-lg"><FolderSync className="w-4 h-4" /></div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Sauvegarde & Restauration de la Base</h3>
            <p className="text-xs text-slate-500 font-medium">Exportez une archive ZIP de sécurité ou restaurez la base après un incident.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleBackup} className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-4 py-2.5 rounded-lg text-xs hover:bg-emerald-100 cursor-pointer shadow-sm">
            <Download className="w-4 h-4" /> Télécharger Sauvegarde ZIP
          </button>
          <button onClick={handleRestore} className="flex items-center gap-2 bg-amber-50 text-amber-800 border border-amber-200 font-bold px-4 py-2.5 rounded-lg text-xs hover:bg-amber-100 cursor-pointer shadow-sm">
            <Upload className="w-4 h-4" /> Restaurer Fichier ZIP
          </button>
          <button onClick={handleReconstruct} disabled={reconstructing} className="flex items-center gap-2 bg-slate-100 text-slate-700 border border-slate-200 font-bold px-4 py-2.5 rounded-lg text-xs hover:bg-slate-200 disabled:opacity-50 cursor-pointer">
            <RefreshCw className={`w-4 h-4 ${reconstructing ? 'animate-spin' : ''}`} /> Reconstruire l'Index
          </button>
        </div>
      </div>

      {/* SECTION 5: UPDATE SYSTEM & VERSIONING */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-800" /> Mises à Jour du Système
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Vérifiez les nouvelles fonctionnalités directement depuis le dépôt GitHub officiel.
            </p>
          </div>
          <button onClick={handleCheckUpdate} disabled={checkingUpdate} className="self-start sm:self-center bg-slate-900 hover:bg-slate-950 disabled:bg-slate-200 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-2 cursor-pointer shadow-sm">
            <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
            {checkingUpdate ? 'Recherche...' : 'Vérifier mises à jour'}
          </button>
        </div>

        {updateInfo ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Version Installée</span>
                <span className="text-sm font-black text-slate-700">{updateInfo.currentVersion}</span>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dernière Version</span>
                <span className={`text-sm font-black ${updateInfo.updateAvailable ? 'text-emerald-800' : 'text-slate-700'}`}>{updateInfo.latestVersion}</span>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center flex items-center justify-center">
                {updateInfo.updateAvailable ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 animate-pulse">
                    Mise à jour disponible !
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    Système à jour
                  </span>
                )}
              </div>
            </div>

            {updateInfo.updateAvailable && (
              <div className="bg-emerald-900 text-white rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                    Mise à jour Automatique en 1 Clic
                  </h4>
                  <p className="text-xs text-emerald-100 mt-1">Télécharge et sauvegarde la base avant l'installation de la version {updateInfo.latestVersion}.</p>
                </div>
                <button onClick={handleApplyUpdate} disabled={applyingUpdate} className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs py-3 px-6 rounded-lg shadow-md shrink-0">
                  {applyingUpdate ? 'Mise à jour...' : 'Mettre à jour Maintenant (1 Clic)'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Aucune vérification de mise à jour effectuée durant cette session.</p>
        )}
      </div>

      {/* SECTION 6: ADVANCED RAW JSON EDITING TOGGLE (POWER USERS) */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <button onClick={() => setShowJsonView(!showJsonView)} className="w-full flex items-center justify-between text-xs font-extrabold text-slate-700 hover:text-slate-900">
          <span className="flex items-center gap-2"><Code2 className="w-4 h-4 text-slate-500" /> Mode Avancé : Édition JSON Brut (Pour Administrateurs)</span>
          <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded">{showJsonView ? 'Masquer' : 'Afficher JSON'}</span>
        </button>

        {showJsonView && (
          <div className="space-y-6 pt-3 border-t border-slate-200 animate-in fade-in duration-200">
            {/* Units JSON */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700">JSON Hiérarchie des Unités</label>
                <button onClick={handleSaveUnitsFromJson} className="bg-slate-800 text-white text-xs font-bold px-3 py-1 rounded">Enregistrer JSON Unités</button>
              </div>
              <textarea value={unitsJson} onChange={(e) => setUnitsJson(e.target.value)} rows={10} className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-mono" />
            </div>

            {/* Categories JSON */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700">JSON Catégories de Pannes</label>
                <button onClick={handleSaveCategoriesFromJson} className="bg-slate-800 text-white text-xs font-bold px-3 py-1 rounded">Enregistrer JSON Catégories</button>
              </div>
              <textarea value={categoriesJson} onChange={(e) => setCategoriesJson(e.target.value)} rows={8} className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-mono" />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
