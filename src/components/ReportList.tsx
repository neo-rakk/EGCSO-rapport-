import React, { useState } from "react";
import { Report, Unit, BreakdownCategory } from "../types";
import { 
  Search, 
  Filter, 
  ExternalLink, 
  Edit, 
  Copy, 
  Wrench, 
  Trash2, 
  X, 
  Calendar,
  Layers,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface ReportListProps {
  reports: Report[];
  units: Unit[];
  categories: BreakdownCategory[];
  onEdit: (report: Report) => void;
  onDuplicate: (report: Report) => void;
  onConvertConstat: (report: Report) => void;
  onDelete: (reportId: string) => void;
  onViewHtml: (report: Report) => void;
}

export default function ReportList({
  reports,
  units,
  categories,
  onEdit,
  onDuplicate,
  onConvertConstat,
  onDelete,
  onViewHtml
}: ReportListProps) {
  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Sort State
  const [sortBy, setSortBy] = useState<keyof Report>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Show/Hide filters pane on mobile
  const [showFilters, setShowFilters] = useState(false);

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedUnit("");
    setSelectedZone("");
    setSelectedCategory("");
    setSelectedType("");
    setSelectedPriority("");
    setSelectedStatus("");
    setStartDate("");
    setEndDate("");
  };

  // Sort toggle helper
  const handleSort = (field: keyof Report) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc"); // default to newest/highest
    }
  };

  // Filter application on client side for instantaneous feedback!
  let filteredReports = reports.filter(report => {
    // 1. Plain text search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchesText = 
        report.reference.toLowerCase().includes(q) ||
        report.description.toLowerCase().includes(q) ||
        report.actions.toLowerCase().includes(q) ||
        report.zone.toLowerCase().includes(q) ||
        report.subzone.toLowerCase().includes(q) ||
        report.author.toLowerCase().includes(q) ||
        report.technicians.some(t => t.toLowerCase().includes(q));
      
      if (!matchesText) return false;
    }

    // 2. Unit
    if (selectedUnit && report.unitId !== selectedUnit) return false;

    // 3. Zone
    if (selectedZone && report.zone !== selectedZone) return false;

    // 4. Category
    if (selectedCategory && report.categoryId !== selectedCategory) return false;

    // 5. Type
    if (selectedType && report.reportType !== selectedType) return false;

    // 6. Priority
    if (selectedPriority && report.priority !== selectedPriority) return false;

    // 7. Status
    if (selectedStatus && report.status !== selectedStatus) return false;

    // 8. Start date
    if (startDate && report.createdAt < startDate) return false;

    // 9. End date (we match full day)
    if (endDate) {
      const endOfDay = `${endDate}T23:59:59.999Z`;
      if (report.createdAt > endOfDay) return false;
    }

    return true;
  });

  // Apply sorting
  filteredReports.sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];

    // Handle nested or array types if any
    if (Array.isArray(valA)) valA = valA.join(", ");
    if (Array.isArray(valB)) valB = valB.join(", ");
    
    if (valA === undefined) return 1;
    if (valB === undefined) return -1;

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Get active unit's zones to show in the dynamic zone filter
  const activeUnitObj = units.find(u => u.id === selectedUnit);

  return (
    <div className="space-y-6" id="report-list-container">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher (réf, description, technicien...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg pl-11 pr-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:bg-white shadow-sm"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm("")}
              className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          )}
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowFilters(prev => !prev)}
            className={`flex items-center gap-2 font-bold px-4 py-2.5 rounded-lg text-xs border shadow-sm transition-all cursor-pointer ${
              showFilters || selectedUnit || selectedCategory || selectedType || selectedPriority || selectedStatus || startDate || endDate
                ? "bg-emerald-50 border-emerald-200 text-emerald-850" 
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtres avancés
            {(selectedUnit || selectedCategory || selectedType || selectedPriority || selectedStatus || startDate || endDate) && (
              <span className="bg-emerald-800 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-extrabold ml-1">
                {([selectedUnit, selectedCategory, selectedType, selectedPriority, selectedStatus, startDate, endDate].filter(Boolean).length)}
              </span>
            )}
          </button>
          
          {(searchTerm || selectedUnit || selectedCategory || selectedType || selectedPriority || selectedStatus || startDate || endDate) && (
            <button
              onClick={handleClearFilters}
              className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg px-4 py-2.5 transition-all cursor-pointer"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Drawer/Panel */}
      {(showFilters || selectedUnit || selectedCategory || selectedType || selectedPriority || selectedStatus || startDate || endDate) && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 shadow-inner">
          {/* Unit Filter */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Unité</label>
            <select
              value={selectedUnit}
              onChange={(e) => {
                setSelectedUnit(e.target.value);
                setSelectedZone("");
              }}
              className="w-full bg-white border border-slate-200 rounded-lg py-2 px-2.5 text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="">Toutes les unités</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Zone Filter (Dynamic based on selected unit) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Zone / Bloc</label>
            <select
              value={selectedZone}
              disabled={!selectedUnit}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-2 px-2.5 text-xs font-medium text-slate-700 focus:outline-none disabled:opacity-50"
            >
              <option value="">Toutes les zones</option>
              {activeUnitObj?.zones.map(z => (
                <option key={z.name} value={z.name}>{z.name}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Domaine de panne</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-2 px-2.5 text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="">Tous les domaines</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Report Type */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Type de rapport</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-2 px-2.5 text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="">Tous les types</option>
              <option value="Technique">Technique</option>
              <option value="Suivi">Suivi</option>
              <option value="Constat">Constat</option>
            </select>
          </div>

          {/* Priority */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Priorité</label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-2 px-2.5 text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="">Toutes les priorités</option>
              <option value="Urgente">Urgente</option>
              <option value="Normale">Normale</option>
              <option value="Basse">Basse</option>
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Statut</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-2 px-2.5 text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="">Tous les statuts</option>
              <option value="Ouvert">Ouvert</option>
              <option value="En cours">En cours</option>
              <option value="Résolu">Résolu</option>
              <option value="Clôturé">Clôturé</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Date de début</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs font-medium text-slate-700 focus:outline-none"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Date de fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs font-medium text-slate-700 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Directory Count Info */}
      <div className="text-xs text-slate-400 font-semibold px-1">
        {filteredReports.length} {filteredReports.length > 1 ? "rapports trouvés" : "rapport trouvé"} sur un total de {reports.length}
      </div>

      {/* Reports Table Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm italic">
            Aucun rapport ne correspond à ces critères de recherche.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th 
                    onClick={() => handleSort("reference")}
                    className="py-4 px-4 cursor-pointer hover:bg-slate-100 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Référence
                      {sortBy === "reference" && (sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort("createdAt")}
                    className="py-4 px-3 cursor-pointer hover:bg-slate-100 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Date
                      {sortBy === "createdAt" && (sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                    </div>
                  </th>
                  <th className="py-4 px-3">Localisation</th>
                  <th className="py-4 px-3">Domaine de panne</th>
                  <th 
                    onClick={() => handleSort("reportType")}
                    className="py-4 px-3 cursor-pointer hover:bg-slate-100 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Type
                      {sortBy === "reportType" && (sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort("priority")}
                    className="py-4 px-3 cursor-pointer hover:bg-slate-100 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Priorité
                      {sortBy === "priority" && (sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort("status")}
                    className="py-4 px-3 cursor-pointer hover:bg-slate-100 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Statut
                      {sortBy === "status" && (sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                    </div>
                  </th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {filteredReports.map(report => {
                  const priorityClass = 
                    report.priority === "Urgente" ? "bg-red-50 text-red-600 border-red-100" :
                    report.priority === "Normale" ? "bg-teal-50 text-teal-600 border-teal-100" :
                    "bg-slate-50 text-slate-500 border-slate-100";
                  
                  const statusClass = 
                    report.status === "Ouvert" ? "bg-orange-50 text-orange-600 border-orange-100" :
                    report.status === "En cours" ? "bg-blue-50 text-blue-600 border-blue-100" :
                    report.status === "Résolu" ? "bg-green-50 text-green-600 border-green-100" :
                    "bg-slate-100 text-slate-600 border-slate-200";

                  const typeClass = 
                    report.reportType === "Technique" ? "bg-emerald-800 text-white" :
                    report.reportType === "Suivi" ? "bg-amber-500 text-slate-950" :
                    "bg-slate-600 text-white";

                  return (
                    <tr key={report.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Ref */}
                      <td className="py-3 px-4 font-bold font-mono text-emerald-850 whitespace-nowrap">
                        {report.reference}
                      </td>
                      
                      {/* Date */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                        {new Date(report.createdAt).toLocaleDateString("fr-FR")}
                      </td>

                      {/* Localisation */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{report.unitName}</div>
                        <div className="text-slate-500 font-medium text-[11px] truncate max-w-[200px]">
                          {report.zone} &bull; {report.subzone}
                        </div>
                      </td>

                      {/* Domaine */}
                      <td className="py-3 px-3 font-semibold text-slate-700 max-w-[150px] truncate">
                        {report.categoryName}
                      </td>

                      {/* Type */}
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${typeClass}`}>
                          {report.reportType}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${priorityClass}`}>
                          {report.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusClass}`}>
                          {report.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1.5 items-center">
                          {/* Print / HTML view */}
                          <button
                            onClick={() => onViewHtml(report)}
                            title="Ouvrir le rapport d'impression"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-emerald-800 rounded transition-all cursor-pointer"
                          >
                            <ExternalLink className="w-4.5 h-4.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => onEdit(report)}
                            title="Modifier le rapport"
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded transition-all cursor-pointer"
                          >
                            <Edit className="w-4.5 h-4.5" />
                          </button>

                          {/* Duplicate */}
                          <button
                            onClick={() => onDuplicate(report)}
                            title="Dupliquer"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded transition-all cursor-pointer"
                          >
                            <Copy className="w-4.5 h-4.5" />
                          </button>

                          {/* Convert Constat to Technical report if applicable */}
                          {report.reportType === "Constat" && (
                            <button
                              onClick={() => onConvertConstat(report)}
                              title="Créer une intervention à partir de ce constat"
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded transition-all cursor-pointer"
                            >
                              <Wrench className="w-4.5 h-4.5" />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (confirm(`Voulez-vous vraiment supprimer le rapport ${report.reference} ? Cette action est irréversible.`)) {
                                onDelete(report.id);
                              }
                            }}
                            title="Supprimer"
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
