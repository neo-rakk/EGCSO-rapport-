import React, { useState, useEffect } from "react";
import { Report, Unit, BreakdownCategory, Part, Photo, AudioNote } from "../types";
import { 
  X, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Upload, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Clock,
  Coins,
  Mic,
  Square,
  Volume2,
  Music
} from "lucide-react";

interface ReportFormProps {
  initialData: Partial<Report> | null;
  units: Unit[];
  categories: BreakdownCategory[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function ReportForm({ 
  initialData, 
  units, 
  categories, 
  onSubmit, 
  onCancel 
}: ReportFormProps) {
  
  // Basic states
  const [reportType, setReportType] = useState<Report["reportType"]>("Technique");
  const [unitId, setUnitId] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedSubzone, setSelectedSubzone] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState<Report["priority"]>("Normale");
  const [status, setStatus] = useState<Report["status"]>("Ouvert");
  const [technicians, setTechnicians] = useState<string[]>([]);
  const [techInput, setTechInput] = useState("");
  const [description, setDescription] = useState("");
  const [actions, setActions] = useState("");
  const [parts, setParts] = useState<Part[]>([]);
  const [duration, setDuration] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [linkedReportId, setLinkedReportId] = useState("");
  const [nextVisitDate, setNextVisitDate] = useState("");
  const [additionalObservations, setAdditionalObservations] = useState("");
  const [author, setAuthor] = useState("");
  const [isValidated, setIsValidated] = useState(false);
  const [error, setError] = useState("");

  // Audio recording states
  const [audioNotes, setAudioNotes] = useState<AudioNote[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [audioError, setAudioError] = useState("");

  // Village Napoli Custom Cascades
  const [napoliBlock, setNapoliBlock] = useState("");
  const [napoliZoneType, setNapoliZoneType] = useState(""); // "etage" or "technique"
  const [napoliFloor, setNapoliFloor] = useState("");
  const [napoliRoom, setNapoliRoom] = useState("");

  // Pre-fill form if editing or duplicating
  useEffect(() => {
    if (initialData) {
      setReportType(initialData.reportType || "Technique");
      setUnitId(initialData.unitId || "");
      setSelectedZone(initialData.zone || "");
      setSelectedSubzone(initialData.subzone || "");
      setCategoryId(initialData.categoryId || "");
      setPriority(initialData.priority || "Normale");
      setStatus(initialData.status || "Ouvert");
      setTechnicians(initialData.technicians || []);
      setDescription(initialData.description || "");
      setActions(initialData.actions || "");
      setParts(initialData.parts || []);
      setDuration(initialData.duration || 0);
      setCost(initialData.cost || 0);
      setPhotos(initialData.photos || []);
      setAudioNotes(initialData.audioNotes || []);
      setLinkedReportId(initialData.linkedReportId || "");
      setNextVisitDate(initialData.nextVisitDate ? initialData.nextVisitDate.split("T")[0] : "");
      setAdditionalObservations(initialData.additionalObservations || "");
      setAuthor(initialData.author || "");
      setIsValidated(initialData.isValidated || false);

      // Restore Napoli helper values if applicable
      if (initialData.unitId === "VIL") {
        const zoneParts = (initialData.zone || "").split(" - ");
        if (zoneParts.length >= 1) {
          setNapoliBlock(zoneParts[0]); // ex: "Bloc A"
        }
        
        if (initialData.subzone) {
          if (initialData.subzone.startsWith("Étage")) {
            setNapoliZoneType("etage");
            const subParts = initialData.subzone.split(" / ");
            setNapoliFloor(subParts[0]); // ex: "Étage 1"
            if (subParts.length > 1) {
              setNapoliRoom(subParts[1]); // ex: "Chambre A-105"
            }
          } else {
            setNapoliZoneType("technique");
          }
        }
      }
    }
  }, [initialData]);

  // Handle Napoli-specific cascades
  useEffect(() => {
    if (unitId === "VIL" && napoliBlock) {
      const activeUnitObj = units.find(u => u.id === "VIL");
      const isAccom = !!activeUnitObj?.zones.find(z => z.name === napoliBlock)?.subzones.some(sz => sz.startsWith("Étage"));
      
      if (!isAccom) {
        setSelectedZone(napoliBlock);
      } else {
        if (napoliZoneType === "technique") {
          setSelectedZone(napoliBlock);
          // Reset floor / rooms
          setNapoliFloor("");
          setNapoliRoom("");
        } else if (napoliZoneType === "etage" && napoliFloor) {
          setSelectedZone(napoliBlock);
          if (napoliRoom) {
            setSelectedSubzone(`${napoliFloor} / ${napoliRoom}`);
          } else {
            setSelectedSubzone(napoliFloor);
          }
        } else {
          setSelectedZone("");
          setSelectedSubzone("");
        }
      }
    }
  }, [unitId, napoliBlock, napoliZoneType, napoliFloor, napoliRoom, units]);

  // File Upload base64 helper
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files) as File[];
      fileList.forEach(file => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          if (typeof reader.result === "string") {
            const newPhoto: Photo = {
              name: file.name,
              phase: "before", // default to before
              data: reader.result
            };
            setPhotos(prev => [...prev, newPhoto]);
          }
        };
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const fileList = Array.from(e.dataTransfer.files) as File[];
      fileList.forEach(file => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            if (typeof reader.result === "string") {
              const newPhoto: Photo = {
                name: file.name,
                phase: "before",
                data: reader.result
              };
              setPhotos(prev => [...prev, newPhoto]);
            }
          };
        }
      });
    }
  };

  const handleTogglePhotoPhase = (index: number) => {
    setPhotos(prev => prev.map((p, idx) => {
      if (idx === index) {
        return {
          ...p,
          phase: p.phase === "before" ? "after" : "before"
        };
      }
      return p;
    }));
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== index));
  };

  // Audio recording helpers & timer
  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      setError("");
      setAudioError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e: any) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            const newAudio: AudioNote = {
              name: `dictee_vocale_${Date.now()}.webm`,
              data: reader.result
            };
            setAudioNotes(prev => [...prev, newAudio]);
          }
        };
        // stop all tracks to release microphone
        stream.getTracks().forEach(t => t.stop());
      };
      
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Audio recording permission or initialization failed:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError" || err.message?.includes("denied")) {
        setAudioError(
          "L'accès au microphone a été refusé par votre navigateur. Si l'application s'exécute dans l'aperçu AI Studio (iframe), veuillez l'ouvrir dans un nouvel onglet via le bouton en haut à droite pour autoriser l'accès au microphone."
        );
      } else {
        setAudioError(
          "Impossible d'accéder au microphone. Veuillez vérifier que votre appareil dispose d'un micro branché et que les permissions sont activées."
        );
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files) as File[];
      fileList.forEach(file => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            const newAudio: AudioNote = {
              name: file.name,
              data: reader.result
            };
            setAudioNotes(prev => [...prev, newAudio]);
          }
        };
      });
    }
  };

  const handleRemoveAudio = (index: number) => {
    setAudioNotes(prev => prev.filter((_, idx) => idx !== index));
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Parts list helper
  const handleAddPart = () => {
    setParts(prev => [...prev, { name: "", quantity: 1 }]);
  };

  const handlePartChange = (index: number, field: keyof Part, value: any) => {
    setParts(prev => prev.map((p, idx) => {
      if (idx === index) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const handleRemovePart = (index: number) => {
    setParts(prev => prev.filter((_, idx) => idx !== index));
  };

  // Tech tags helpers
  const handleAddTech = () => {
    if (techInput.trim() && !technicians.includes(techInput.trim())) {
      setTechnicians(prev => [...prev, techInput.trim()]);
      setTechInput("");
    }
  };

  const handleRemoveTech = (tech: string) => {
    setTechnicians(prev => prev.filter(t => t !== tech));
  };

  // Form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!unitId) {
      setError("Veuillez sélectionner une unité.");
      return;
    }
    if (!selectedZone) {
      setError("Veuillez sélectionner une zone ou un bloc.");
      return;
    }
    if (!categoryId) {
      setError("Veuillez sélectionner un domaine de panne.");
      return;
    }
    if (!description.trim()) {
      setError("Veuillez saisir une description de la panne.");
      return;
    }
    if (!author.trim()) {
      setError("Veuillez saisir le nom du rédacteur.");
      return;
    }
    if (!isValidated) {
      setError("Veuillez certifier la véracité et signer électroniquement le rapport.");
      return;
    }

    const selectedUnitObj = units.find(u => u.id === unitId);
    const selectedCategoryObj = categories.find(c => c.id === categoryId);

    // Final clean object
    const reportData = {
      id: initialData?.id || undefined, // undefined for creation to generate ID
      unitId,
      unitName: selectedUnitObj?.name || "",
      zone: selectedZone,
      subzone: selectedSubzone,
      categoryId,
      categoryName: selectedCategoryObj?.name || "",
      reportType,
      priority,
      status,
      technicians,
      description,
      actions: reportType === "Constat" ? "" : actions,
      parts: reportType === "Constat" ? [] : parts.filter(p => p.name.trim() !== ""),
      duration: reportType === "Constat" ? 0 : duration,
      cost: reportType === "Constat" ? 0 : cost,
      photos,
      audioNotes,
      linkedReportId: reportType === "Suivi" ? linkedReportId : undefined,
      nextVisitDate: reportType === "Suivi" && nextVisitDate ? nextVisitDate : undefined,
      additionalObservations,
      author,
      isValidated,
      createdAt: initialData?.createdAt || new Date().toISOString()
    };

    onSubmit(reportData);
  };

  // Find active unit for cascades
  const activeUnit = units.find(u => u.id === unitId);
  // Find active zone for subzones cascade (for standard units)
  const activeZoneObj = activeUnit?.zones.find(z => z.name === selectedZone);

  const isAccommodationBlock = !!(unitId === "VIL" && napoliBlock && activeUnit?.zones.find(z => z.name === napoliBlock)?.subzones.some(sz => sz.startsWith("Étage")));

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="report-form">
      {/* Form Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-950 px-6 py-4 text-white flex items-center justify-between border-b-2 border-amber-500">
        <div className="flex items-center gap-2.5">
          <FileText className="w-5 h-5 text-amber-500" />
          <h2 className="font-extrabold text-base tracking-wide uppercase">
            {initialData?.reference ? `Édition du Rapport ${initialData.reference}` : "Nouveau Rapport d'Intervention"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-slate-300 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg border border-red-200 text-sm flex items-center gap-2.5 font-semibold">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* SECTION 1: TYPE & PRIORITÉ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-100">
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Type de Rapport</label>
            <div className="grid grid-cols-3 gap-2">
              {(["Technique", "Suivi", "Constat"] as Report["reportType"][]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setReportType(type)}
                  className={`py-2 text-xs font-bold rounded-lg border text-center transition-all ${
                    reportType === type 
                      ? "bg-emerald-800 text-white border-emerald-800 shadow-sm" 
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Priorité d'Intervention</label>
            <div className="grid grid-cols-3 gap-2">
              {(["Basse", "Normale", "Urgente"] as Report["priority"][]).map(prio => {
                const colorClass = 
                  prio === "Urgente" ? "hover:bg-red-50 text-red-600 border-red-200 active:bg-red-600 active:text-white" :
                  prio === "Normale" ? "hover:bg-teal-50 text-teal-600 border-teal-200 active:bg-teal-600 active:text-white" :
                  "hover:bg-slate-100 text-slate-500 border-slate-200";
                
                const activeColor = 
                  prio === "Urgente" ? "bg-red-600 text-white border-red-600 shadow-sm" :
                  prio === "Normale" ? "bg-teal-600 text-white border-teal-600 shadow-sm" :
                  "bg-slate-700 text-white border-slate-700 shadow-sm";

                return (
                  <button
                    key={prio}
                    type="button"
                    onClick={() => setPriority(prio)}
                    className={`py-2 text-xs font-bold rounded-lg border text-center transition-all ${
                      priority === prio ? activeColor : `${colorClass} bg-slate-50`
                    }`}
                  >
                    {prio}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Statut du dossier</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Report["status"])}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:bg-white"
            >
              <option value="Ouvert">Ouvert (Attente de traitement)</option>
              <option value="En cours">En cours (Intervention programmée)</option>
              <option value="Résolu">Résolu (Travaux terminés, attente validation)</option>
              <option value="Clôturé">Clôturé (Vérifié et Archivé)</option>
            </select>
          </div>
        </div>

        {/* SECTION 2: UNITÉ & ZONE & SOUS-ZONE (Cascading Dropdowns) */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider border-b border-slate-100 pb-2">Localisation de la panne</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. Select Unit */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Unité du Complexe *</label>
              <select
                value={unitId}
                onChange={(e) => {
                  setUnitId(e.target.value);
                  setSelectedZone("");
                  setSelectedSubzone("");
                  // Clear Napoli specific state
                  setNapoliBlock("");
                  setNapoliFloor("");
                  setNapoliRoom("");
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:bg-white"
              >
                <option value="">-- Choisir une unité --</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* If Village Napoli (VIL) is chosen, we trigger custom Napoli blocks cascade */}
            {unitId === "VIL" ? (
              <>
                {/* Napoli Bloc Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Bloc / Bâtiment *</label>
                  <select
                    value={napoliBlock}
                    onChange={(e) => {
                      setNapoliBlock(e.target.value);
                      setNapoliZoneType("");
                      setNapoliFloor("");
                      setNapoliRoom("");
                      setSelectedSubzone("");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:bg-white"
                  >
                    <option value="">-- Choisir un bloc --</option>
                    {activeUnit?.zones.map(z => (
                      <option key={z.name} value={z.name}>{z.name}</option>
                    ))}
                  </select>
                </div>

                {/* Napoli zone type selection (Chambres/Etages vs local technique) */}
                {napoliBlock && isAccommodationBlock ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Type de Zone *</label>
                    <select
                      value={napoliZoneType}
                      onChange={(e) => {
                        setNapoliZoneType(e.target.value);
                        setNapoliFloor("");
                        setNapoliRoom("");
                        setSelectedSubzone("");
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:bg-white"
                    >
                      <option value="">-- Choisir --</option>
                      <option value="etage">Étages & Chambres (Hébergement)</option>
                      <option value="technique">Zones Techniques Communes</option>
                    </select>
                  </div>
                ) : napoliBlock ? (
                  /* If Restaurant or Administration is selected, let them choose subzones directly */
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Sous-zone d'intervention</label>
                    <select
                      value={selectedSubzone}
                      onChange={(e) => {
                        setSelectedZone(napoliBlock);
                        setSelectedSubzone(e.target.value);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:bg-white"
                    >
                      <option value="">-- Choisir la sous-zone --</option>
                      {activeUnit?.zones.find(z => z.name === napoliBlock)?.subzones.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </>
            ) : (
              /* STANDARD UNIT CASCADE */
              <>
                {/* 2. Select Zone */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Zone / Secteur *</label>
                  <select
                    value={selectedZone}
                    disabled={!unitId}
                    onChange={(e) => {
                      setSelectedZone(e.target.value);
                      setSelectedSubzone("");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:bg-white disabled:opacity-50"
                  >
                    <option value="">-- Choisir une zone --</option>
                    {activeUnit?.zones.map(z => (
                      <option key={z.name} value={z.name}>{z.name}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Select Subzone */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Sous-zone / Équipement</label>
                  <select
                    value={selectedSubzone}
                    disabled={!selectedZone || !activeZoneObj?.subzones.length}
                    onChange={(e) => setSelectedSubzone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:bg-white disabled:opacity-50"
                  >
                    <option value="">-- Choisir la sous-zone --</option>
                    {activeZoneObj?.subzones.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Napoli block floor / rooms cascade row */}
          {unitId === "VIL" && napoliZoneType === "etage" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-dashed border-slate-200">
              {/* Floor selection */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Étage de l'intervention *</label>
                <select
                  value={napoliFloor}
                  onChange={(e) => {
                    setNapoliFloor(e.target.value);
                    setNapoliRoom("");
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                >
                  <option value="">-- Choisir l'étage --</option>
                  <option value="Étage 0">RDC (Étage 0)</option>
                  <option value="Étage 1">1er Étage (Étage 1)</option>
                  <option value="Étage 2">2ème Étage (Étage 2)</option>
                  <option value="Étage 3">3ème Étage (Étage 3)</option>
                  <option value="Étage 4">4ème Étage (Étage 4)</option>
                  <option value="Étage 5">5ème Étage (Étage 5)</option>
                </select>
              </div>

              {/* Room selection (13 rooms per floor) */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Numéro de Chambre *</label>
                <select
                  value={napoliRoom}
                  disabled={!napoliFloor}
                  onChange={(e) => setNapoliRoom(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800 disabled:opacity-50"
                >
                  <option value="">-- Choisir la chambre --</option>
                  {Array.from({ length: 13 }, (_, i) => {
                    const floorNum = napoliFloor.split(" ")[1] || "0";
                    const blockParts = napoliBlock.split(" ");
                    const blockChar = blockParts[blockParts.length - 1] || "A";
                    const roomNum = `${floorNum}${String(i + 1).padStart(2, "0")}`;
                    return `${blockChar}-${roomNum}`;
                  }).map(roomCode => (
                    <option key={roomCode} value={`Chambre ${roomCode}`}>Chambre {roomCode}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Napoli block technical zones selection */}
          {unitId === "VIL" && napoliZoneType === "technique" && (
            <div className="bg-slate-50 p-4 rounded-lg border border-dashed border-slate-200">
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Zone Technique Commune *</label>
              <select
                value={selectedSubzone}
                onChange={(e) => setSelectedSubzone(e.target.value)}
                className="w-full md:w-1/2 bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800"
              >
                <option value="">-- Choisir le local technique --</option>
                {activeUnit?.zones.find(z => z.name === napoliBlock)?.subzones
                  .filter(sz => !sz.startsWith("Étage"))
                  .map(sz => (
                    <option key={sz} value={sz}>{sz}</option>
                  ))}
              </select>
            </div>
          )}
        </div>

        {/* SECTION 3: DOMAINE & TECHNICIENS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Domaine / Catégorie de Panne *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:bg-white"
            >
              <option value="">-- Sélectionner une catégorie --</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Techniciens Responsables</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: Mourad K., Salem A."
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTech(); } }}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:bg-white"
              />
              <button
                type="button"
                onClick={handleAddTech}
                className="bg-emerald-800 text-white font-bold px-4 rounded-lg text-xs hover:bg-emerald-900 transition-colors"
              >
                Ajouter
              </button>
            </div>

            {/* Render tech tags */}
            {technicians.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {technicians.map(t => (
                  <span 
                    key={t} 
                    className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-100"
                  >
                    {t}
                    <button 
                      type="button" 
                      onClick={() => handleRemoveTech(t)}
                      className="text-emerald-450 hover:text-emerald-800 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4: TEXTS ENRICHIS (DESCRIPTION / ACTIONS) */}
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Description Détaillée de la Panne *</label>
            <textarea
              rows={4}
              placeholder="Décrivez précisément le dysfonctionnement observé, l'impact sur les activités sportives ou l'hébergement, la gravité perçue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:bg-white resize-y"
            ></textarea>
          </div>

          {/* Actions - hidden for Constat */}
          {reportType !== "Constat" && (
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Actions Correctives Effectuées</label>
              <textarea
                rows={4}
                placeholder="Décrivez les réparations effectuées, les tests de remise en service, le diagnostic final, les étapes de dépannage..."
                value={actions}
                onChange={(e) => setActions(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:bg-white resize-y"
              ></textarea>
            </div>
          )}
        </div>

        {/* SECTION 5: PIÈCES, DURÉE & COÛT (Hidden for Constat) */}
        {reportType !== "Constat" && (
          <div className="space-y-6 pb-6 border-b border-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Pièces de rechange et matériel utilisés</h3>
              <button
                type="button"
                onClick={handleAddPart}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Ajouter une pièce
              </button>
            </div>

            {parts.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                Aucune pièce de rechange ajoutée pour le moment.
              </div>
            ) : (
              <div className="space-y-2.5">
                {parts.map((p, idx) => (
                  <div key={idx} className="flex gap-4 items-center">
                    <input
                      type="text"
                      placeholder="Ex: Robinet poussoir 1/2, Disjoncteur 16A..."
                      value={p.name}
                      onChange={(e) => handlePartChange(idx, "name", e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:bg-white"
                    />
                    <div className="w-32 flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-bold">Qté :</span>
                      <input
                        type="number"
                        min={1}
                        value={p.quantity}
                        onChange={(e) => handlePartChange(idx, "quantity", parseInt(e.target.value, 10) || 1)}
                        className="w-16 bg-slate-50 border border-slate-200 rounded-lg py-2 px-2 text-sm text-center font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePart(idx)}
                      className="text-slate-400 hover:text-red-600 p-2 rounded hover:bg-slate-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Duration & Cost */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 inline-flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Durée de l'intervention (minutes)
                </label>
                <input
                  type="number"
                  placeholder="Ex: 90"
                  min={0}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 inline-flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-slate-400" />
                  Coût estimé du matériel (DZD)
                </label>
                <input
                  type="number"
                  placeholder="Ex: 4500"
                  min={0}
                  value={cost}
                  onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 6: DRAG-AND-DROP PHOTO UPLOAD WITH Avant/Après PHASES */}
        <div className="space-y-4 pb-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Photographies de l'intervention</h3>
          
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-300 transition-all rounded-xl p-6 text-center cursor-pointer relative"
          >
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoUpload}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
            <div className="space-y-2">
              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Glissez-déposez vos photos ou cliquez pour parcourir</p>
              <p className="text-xs text-slate-400">Prend en charge tous formats images (JPG, PNG)</p>
            </div>
          </div>

          {/* Photo Previews list */}
          {photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-2">
              {photos.map((photo, index) => (
                <div key={index} className="border border-slate-200 rounded-lg p-2.5 bg-slate-50 space-y-2.5 relative">
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute top-1.5 right-1.5 bg-black/60 text-white hover:bg-red-600 rounded-full p-1.5 shadow-md transition-colors z-10"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-28 flex items-center justify-center bg-white rounded overflow-hidden">
                    <img 
                      src={photo.data || photo.url} 
                      alt="Preview" 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <div className="flex flex-col gap-1 text-center">
                    <div className="text-[10px] text-slate-500 truncate font-semibold px-1">{photo.name}</div>
                    <button
                      type="button"
                      onClick={() => handleTogglePhotoPhase(index)}
                      className={`text-[10px] py-1 px-2 font-bold rounded-full border transition-all ${
                        photo.phase === "before" 
                          ? "bg-amber-100 text-amber-700 border-amber-200" 
                          : "bg-green-100 text-green-700 border-green-200"
                      }`}
                    >
                      {photo.phase === "before" ? "Photo AVANT" : "Photo APRÈS"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 6.5: NOTES VOCALES ET DICTÉE DE PANNE */}
        <div className="space-y-4 pb-6 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                <Mic className="w-4 h-4 text-emerald-850" />
                Notes Vocales et Dictées de Panne
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Enregistrez une dictée vocale directement sur le terrain pour accompagner votre rapport écrit.
              </p>
            </div>
            
            {/* Audio note counter */}
            {audioNotes.length > 0 && (
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold self-start sm:self-auto">
                {audioNotes.length} note(s) vocale(s)
              </span>
            )}
          </div>

          {audioError && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-amber-800">Contrainte d'accès microphone</p>
                <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                  {audioError}
                </p>
                <div className="pt-1.5 flex items-center gap-3">
                  <a 
                    href={window.location.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-amber-850 hover:text-amber-950 underline transition-all"
                  >
                    Ouvrir l'application dans un nouvel onglet ↗
                  </a>
                  <span className="text-slate-300 text-[10px]">•</span>
                  <span className="text-[10px] font-medium text-amber-700">Ou importez un fichier audio existant ci-dessous</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left box: Live microphone recorder */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center justify-center min-h-[140px] space-y-3 relative overflow-hidden">
              {isRecording ? (
                <>
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                    <span className="text-[10px] font-extrabold text-red-600 uppercase tracking-widest">Enregistrement...</span>
                  </div>

                  <div className="text-3xl font-mono font-black text-slate-800">
                    {formatTime(recordingSeconds)}
                  </div>

                  <button
                    type="button"
                    onClick={stopRecording}
                    className="bg-red-600 hover:bg-red-700 text-white font-extrabold py-2.5 px-6 rounded-full text-xs flex items-center gap-2 shadow-lg transition-all transform active:scale-95 cursor-pointer"
                  >
                    <Square className="w-4 h-4" /> Arrêter la dictée
                  </button>
                </>
              ) : (
                <>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-bold text-slate-700">Dictaphone Numérique Intégré</p>
                    <p className="text-[10px] text-slate-400 font-medium">Idéal pour l'usage mobile dans le complexe d'Oran</p>
                  </div>

                  <button
                    type="button"
                    onClick={startRecording}
                    className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold py-2.5 px-6 rounded-full text-xs flex items-center gap-2 shadow-sm transition-all transform active:scale-95 cursor-pointer"
                  >
                    <Mic className="w-4 h-4 text-amber-500 animate-pulse" /> Commencer à enregistrer
                  </button>
                </>
              )}
            </div>

            {/* Right box: File import backup */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center justify-center min-h-[140px] space-y-3">
              <div className="text-center space-y-1">
                <p className="text-xs font-bold text-slate-700">Ou importer des notes audio</p>
                <p className="text-[10px] text-slate-400 font-medium font-semibold">Prend en charge les formats .webm, .mp3, .wav, .m4a</p>
              </div>

              <div className="relative">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  id="audio-file-uploader"
                />
                <label
                  htmlFor="audio-file-uploader"
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-2 px-5 rounded-full text-xs flex items-center gap-2 shadow-sm cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4 text-slate-400" /> Choisir un fichier audio
                </label>
              </div>
            </div>
          </div>

          {/* List of recorded audio notes */}
          {audioNotes.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Notes Vocales Jointes au Dossier</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {audioNotes.map((audio, index) => (
                  <div key={index} className="border border-slate-200 bg-white p-3 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-2.5 truncate flex-1">
                      <Music className="w-4 h-4 text-emerald-800 flex-shrink-0" />
                      <div className="truncate text-left">
                        <div className="text-xs font-bold text-slate-700 truncate" title={audio.name}>{audio.name}</div>
                        <div className="text-[9px] text-slate-400 font-semibold uppercase">{audio.url ? "Fichier Enregistré" : "Nouveau Mémo Vocal"}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <audio 
                        src={audio.data || audio.url} 
                        controls 
                        preload="metadata"
                        className="w-40 h-8 text-slate-800 filter brightness-95" 
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveAudio(index)}
                        className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
                        title="Supprimer la note vocale"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 7: SUIVI DETAILS (Only if type is Suivi) */}
        {reportType === "Suivi" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-orange-50/50 rounded-xl border border-orange-200/60 pb-6 border-b border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Référence du Rapport Original Lié</label>
              <input
                type="text"
                placeholder="Ex: EGCSO-VIL-TEC-20260811-001"
                value={linkedReportId}
                onChange={(e) => setLinkedReportId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Date de la prochaine visite prévue</label>
              <input
                type="date"
                value={nextVisitDate}
                onChange={(e) => setNextVisitDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800"
              />
            </div>
          </div>
        )}

        {/* SECTION 8: OBSERVATIONS COMPLÉMENTAIRES */}
        <div>
          <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Observations ou Remarques Complémentaires</label>
          <textarea
            rows={2}
            placeholder="Éléments restés en suspens, recommandations pour l'administration, consignes d'utilisation..."
            value={additionalObservations}
            onChange={(e) => setAdditionalObservations(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:bg-white resize-y"
          ></textarea>
        </div>

        {/* SECTION 9: RÉDACTEUR & SIGNATURE ELECTRONIQUE VALIDÉE */}
        <div className="p-5 bg-emerald-50/40 rounded-xl border border-emerald-200/50 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <label className="block text-xs font-extrabold text-slate-600 uppercase mb-2">Nom du Rédacteur / Technicien Signataire *</label>
            <input
              type="text"
              placeholder="Ex: Mourad KADRI (Technicien Élec)"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3 text-sm font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-800"
            />
          </div>

          <div className="flex items-start gap-3 pt-4 md:pt-0">
            <input
              type="checkbox"
              id="isValidated"
              checked={isValidated}
              onChange={(e) => setIsValidated(e.target.checked)}
              className="mt-1 w-5.5 h-5.5 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800 cursor-pointer"
            />
            <label htmlFor="isValidated" className="text-xs font-semibold text-slate-600 leading-relaxed cursor-pointer select-none">
              Je certifie sur l'honneur l'exactitude des informations techniques reportées dans ce document et y appose ma <span className="text-emerald-800 font-bold">signature électronique validée</span> pour le service technique de l'EGCSO.
            </label>
          </div>
        </div>

      </div>

      {/* Form Action Footer */}
      <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-850 rounded-lg hover:bg-emerald-900 shadow-md transition-all inline-flex items-center gap-1.5"
          id="btn-submit-report"
        >
          <CheckCircle2 className="w-4.5 h-4.5" />
          Enregistrer le Rapport
        </button>
      </div>
    </form>
  );
}
