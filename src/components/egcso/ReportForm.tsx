'use client';

import { useState, useEffect, useRef } from 'react';
import type { Report, Unit, BreakdownCategory, Part, Photo, AudioNote } from '@/types';
import { useAppStore } from '@/hooks/use-app-store';
import { X, Plus, Trash2, ImageIcon, Upload, Mic, Square, Volume2, CheckCircle2, Save, ArrowLeft } from 'lucide-react';

interface ReportFormProps {
  initialData: Partial<Report> | null;
  units: Unit[];
  categories: BreakdownCategory[];
}

export default function ReportForm({ initialData, units, categories }: ReportFormProps) {
  const { setCurrentView, setFormInitialData, triggerAlert, setReports } = useAppStore();
  const { reports } = useAppStore();

  const [reportType, setReportType] = useState<Report['reportType']>('Technique');
  const [unitId, setUnitId] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedSubzone, setSelectedSubzone] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState<Report['priority']>('Normale');
  const [status, setStatus] = useState<Report['status']>('Ouvert');
  const [technicians, setTechnicians] = useState<string[]>([]);
  const [techInput, setTechInput] = useState('');
  const [description, setDescription] = useState('');
  const [actions, setActions] = useState('');
  const [parts, setParts] = useState<Part[]>([]);
  const [duration, setDuration] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [linkedReportId, setLinkedReportId] = useState('');
  const [nextVisitDate, setNextVisitDate] = useState('');
  const [additionalObservations, setAdditionalObservations] = useState('');
  const [author, setAuthor] = useState('');
  const [isValidated, setIsValidated] = useState(false);
  const [audioNotes, setAudioNotes] = useState<AudioNote[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoPhaseRef = useRef<'before' | 'after'>('before');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const activeUnit = units.find((u) => u.id === unitId);
  const zones = activeUnit?.zones || [];
  const activeZone = zones.find((z) => z.name === selectedZone);
  const subzones = activeZone?.subzones || [];

  // Initialize form from initialData
  useEffect(() => {
    if (initialData) {
      setReportType(initialData.reportType || 'Technique');
      setUnitId(initialData.unitId || '');
      setSelectedZone(initialData.zone || '');
      setSelectedSubzone(initialData.subzone || '');
      setCategoryId(initialData.categoryId || '');
      setPriority(initialData.priority || 'Normale');
      setStatus(initialData.status || 'Ouvert');
      setTechnicians(initialData.technicians || []);
      setDescription(initialData.description || '');
      setActions(initialData.actions || '');
      setParts(initialData.parts || []);
      setDuration(initialData.duration || 0);
      setCost(initialData.cost || 0);
      setPhotos(initialData.photos || []);
      setLinkedReportId(initialData.linkedReportId || '');
      setNextVisitDate(initialData.nextVisitDate || '');
      setAdditionalObservations(initialData.additionalObservations || '');
      setAuthor(initialData.author || '');
      setIsValidated(initialData.isValidated || false);
      setAudioNotes(initialData.audioNotes || []);
    }
  }, [initialData]);

  // Photo handling
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setPhotos((prev) => [...prev, { name: file.name, phase: photoPhaseRef.current, data: dataUrl }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removePhoto = (idx: number) => setPhotos((p) => p.filter((_, i) => i !== idx));

  // Audio recording
  const toggleRecording = async () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (ev) => {
          setAudioNotes((prev) => [...prev, { name: `note_${Date.now()}.webm`, data: ev.target?.result as string }]);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  };

  const removeAudio = (idx: number) => setAudioNotes((a) => a.filter((_, i) => i !== idx));

  // Parts management
  const addPart = () => setParts((p) => [...p, { name: '', quantity: 1 }]);
  const updatePart = (idx: number, field: keyof Part, val: any) => {
    setParts((p) => p.map((part, i) => (i === idx ? { ...part, [field]: val } : part)));
  };
  const removePart = (idx: number) => setParts((p) => p.filter((_, i) => i !== idx));

  // Technicians
  const addTechnician = () => {
    if (techInput.trim()) {
      setTechnicians((p) => [...p, techInput.trim()]);
      setTechInput('');
    }
  };
  const removeTechnician = (idx: number) => setTechnicians((t) => t.filter((_, i) => i !== idx));

  // Submit
  const handleSubmit = async () => {
    if (!unitId || !categoryId || !description) {
      triggerAlert('error', 'Veuillez remplir les champs obligatoires (Unité, Catégorie, Description).');
      return;
    }
    setSubmitting(true);
    try {
      const isEdit = !!initialData?.id && !initialData.reference?.startsWith('(');
      const url = isEdit ? `/api/reports/${initialData.id}` : '/api/reports';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = {
        id: initialData?.id,
        createdAt: initialData?.createdAt || new Date().toISOString(),
        unitId,
        unitName: activeUnit?.name || '',
        zone: selectedZone,
        subzone: selectedSubzone,
        categoryId,
        categoryName: categories.find((c) => c.id === categoryId)?.name || '',
        reportType,
        priority,
        status,
        technicians,
        description,
        actions,
        parts,
        duration,
        cost,
        photos,
        audioNotes,
        linkedReportId: linkedReportId || undefined,
        nextVisitDate: nextVisitDate || undefined,
        additionalObservations,
        author: author || 'Technicien EGCSO',
        isValidated,
      };

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        const saved = await res.json();
        triggerAlert('success', `Rapport ${saved.reference} enregistré avec succès !`);
        // Refresh reports
        const reportsRes = await fetch('/api/reports');
        if (reportsRes.ok) setReports(await reportsRes.json());
        setFormInitialData(null);
        setCurrentView('list');
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Échec d\'enregistrement.');
      }
    } catch (err) {
      triggerAlert('error', 'Erreur réseau.');
    } finally {
      setSubmitting(false);
    }
  };

  const isEditing = !!initialData?.id && !initialData.reference?.startsWith('(');
  const isConstat = reportType === 'Constat';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => { setFormInitialData(null); setCurrentView('list'); }} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
          <h2 className="text-xl font-extrabold text-slate-900">{isEditing ? 'Modifier le rapport' : 'Nouveau Rapport de Maintenance'}</h2>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
        
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Type de Rapport</h3>
          <div className="flex gap-3">
            {(['Technique', 'Suivi', 'Constat'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setReportType(t)}
                className={`px-5 py-2.5 rounded-lg text-sm font-bold border-2 transition-all ${reportType === t ? 'bg-emerald-800 text-white border-emerald-800' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'}`}>{t}</button>
            ))}
          </div>
        </div>

        
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Localisation &amp; Classification</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SelectField label="Unité du Complexe *" value={unitId} onChange={setUnitId} options={units.map((u) => ({ v: u.id, l: u.name }))} />
            <SelectField label="Zone / Bloc" value={selectedZone} onChange={setSelectedZone} options={zones.map((z) => ({ v: z.name, l: z.name }))} disabled={!unitId} />
            <SelectField label="Sous-zone / Étage" value={selectedSubzone} onChange={setSelectedSubzone} options={subzones.map((s) => ({ v: s, l: s }))} disabled={!selectedZone} />
            <SelectField label="Domaine de Panne *" value={categoryId} onChange={setCategoryId} options={categories.map((c) => ({ v: c.id, l: c.name }))} />
            <SelectField label="Priorité" value={priority} onChange={(v) => setPriority(v as any)} options={[{ v: 'Urgente', l: 'Urgente' }, { v: 'Normale', l: 'Normale' }, { v: 'Basse', l: 'Basse' }]} />
            <SelectField label="Statut" value={status} onChange={(v) => setStatus(v as any)} options={[{ v: 'Ouvert', l: 'Ouvert' }, { v: 'En cours', l: 'En cours' }, { v: 'Résolu', l: 'Résolu' }, { v: 'Clôturé', l: 'Clôturé' }]} />
          </div>
        </div>

        
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Technicien(s)</h3>
          <div className="flex gap-2">
            <input type="text" value={techInput} onChange={(e) => setTechInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTechnician())} placeholder="Nom du technicien" className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800" />
            <button type="button" onClick={addTechnician} className="bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700"><Plus className="w-4 h-4 inline mr-1" />Ajouter</button>
          </div>
          {technicians.length > 0 && (
            <div className="flex flex-wrap gap-2">{technicians.map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold">{t}<button type="button" onClick={() => removeTechnician(i)} className="text-emerald-600 hover:text-red-600"><X className="w-3.5 h-3.5" /></button></span>
            ))}</div>
          )}
        </div>

        
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Description de la Panne / Constat *</h3>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Décrivez le problème constaté..." className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800 resize-y" />
          {!isConstat && (
            <>
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Actions Réalisées</h3>
              <textarea value={actions} onChange={(e) => setActions(e.target.value)} rows={3} placeholder="Solutions apportées..." className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800 resize-y" />
            </>
          )}
        </div>

        {!isConstat && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Pièces de Rechange</h3>
            <button type="button" onClick={addPart} className="flex items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-900"><Plus className="w-4 h-4" />Ajouter une pièce</button>
            {parts.length > 0 && (
              <div className="space-y-2">{parts.map((part, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" value={part.name} onChange={(e) => updatePart(i, 'name', e.target.value)} placeholder="Désignation" className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800" />
                  <input type="number" value={part.quantity} onChange={(e) => updatePart(i, 'quantity', parseInt(e.target.value) || 0)} min={1} className="w-20 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-800" />
                  <button type="button" onClick={() => removePart(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}</div>
            )}
          </div>
        )}

        
        {!isConstat && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-xs font-bold text-slate-600">Durée (minutes)</label><input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 0)} min={0} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800" /></div>
            <div className="space-y-1"><label className="text-xs font-bold text-slate-600">Coût estimé (DZD)</label><input type="number" value={cost} onChange={(e) => setCost(parseFloat(e.target.value) || 0)} min={0} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800" /></div>
          </div>
        )}

        
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Photos</h3>
            <div className="flex gap-2">
              <button type="button" onClick={() => { photoPhaseRef.current = 'before'; fileInputRef.current?.click(); }} className="text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-100">+ Avant</button>
              {!isConstat && (
                <button type="button" onClick={() => { photoPhaseRef.current = 'after'; fileInputRef.current?.click(); }} className="text-xs font-bold bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100">+ Après</button>
              )}
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
          {photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {photos.map((photo, i) => (
                <div key={i} className="relative group border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  <img src={photo.data || photo.url} alt={photo.name} className="w-full h-24 object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button type="button" onClick={() => removePhoto(i)} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 text-[9px] font-bold text-white bg-black/60 text-center py-0.5">{photo.phase === 'before' ? 'AVANT' : 'APRÈS'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Notes Vocales</h3>
            <button type="button" onClick={toggleRecording} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-800 text-white hover:bg-emerald-700'}`}>
              {isRecording ? <><Square className="w-4 h-4" />Arrêter</> : <><Mic className="w-4 h-4" />Enregistrer</>}
            </button>
          </div>
          {audioNotes.length > 0 && (
            <div className="space-y-2">{audioNotes.map((audio, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <Volume2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                <audio controls src={audio.data || audio.url} className="flex-1 h-8" />
                <button type="button" onClick={() => removeAudio(i)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}</div>
          )}
        </div>

        
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Informations Complémentaires & Intervenants</h3>
          
          {/* Technicians tag input */}
          <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Technicien(s) ayant intervenu</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (techInput.trim() && !technicians.includes(techInput.trim())) {
                      setTechnicians([...technicians, techInput.trim()]);
                      setTechInput('');
                    }
                  }
                }}
                placeholder="Ex: BENALI Mohamed, BELKACEM Karim (Appuyer sur Entrée)..."
                className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-800"
              />
              <button
                type="button"
                onClick={() => {
                  if (techInput.trim() && !technicians.includes(techInput.trim())) {
                    setTechnicians([...technicians, techInput.trim()]);
                    setTechInput('');
                  }
                }}
                className="bg-emerald-800 text-white font-bold px-4 py-2 rounded-lg text-xs hover:bg-emerald-700 cursor-pointer shadow-sm"
              >
                + Ajouter Technicien
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {technicians.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic">Aucun technicien ajouté. (Nom du rédacteur utilisé par défaut)</span>
              ) : (
                technicians.map((tech, idx) => (
                  <span key={idx} className="bg-white border border-emerald-300 text-emerald-900 px-2.5 py-1 rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1.5">
                    {tech}
                    <button
                      type="button"
                      onClick={() => setTechnicians(technicians.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-600 font-bold text-sm"
                      title="Retirer"
                    >
                      &times;
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-xs font-bold text-slate-600">Rédacteur / Responsable de saisie</label><input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Nom du rédacteur" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800" /></div>
            <div className="space-y-1"><label className="text-xs font-bold text-slate-600">Prochaine visite prévisionnelle</label><input type="date" value={nextVisitDate} onChange={(e) => setNextVisitDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800" /></div>
          </div>
          {linkedReportId && <div className="text-xs text-blue-600 font-semibold">Rapport lié : {linkedReportId}</div>}
          <div className="space-y-1"><label className="text-xs font-bold text-slate-600">Observations complémentaires</label><textarea value={additionalObservations} onChange={(e) => setAdditionalObservations(e.target.value)} rows={2} placeholder="Notes supplémentaires..." className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800 resize-y" /></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isValidated} onChange={(e) => setIsValidated(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800" /><span className="text-sm font-semibold text-slate-700">Valider le rapport (signature électronique)</span></label>
        </div>

        
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => { setFormInitialData(null); setCurrentView('list'); }} className="px-6 py-3 rounded-lg text-sm font-bold border border-slate-200 text-slate-600 hover:bg-slate-50">Annuler</button>
          <button type="submit" disabled={submitting} className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold bg-emerald-800 text-white hover:bg-emerald-700 disabled:opacity-50">
            {submitting ? 'Enregistrement...' : <><Save className="w-4 h-4" />{isEditing ? 'Mettre à jour' : 'Enregistrer le rapport'}</>}
          </button>
        </div>
      </form>
    </div>
  );
}

function SelectField({ label, value, onChange, options, disabled }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[]; disabled?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-slate-600">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800 disabled:opacity-50">
        <option value="">— Sélectionner —</option>
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}
