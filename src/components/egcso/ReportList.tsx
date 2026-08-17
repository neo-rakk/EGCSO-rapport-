'use client';

import { useState } from 'react';
import type { Report, Unit, BreakdownCategory } from '@/types';
import { useAppStore } from '@/hooks/use-app-store';
import { Search, ExternalLink, Edit, Copy, Wrench, Trash2, X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

interface ReportListProps {
  reports: Report[];
  units: Unit[];
  categories: BreakdownCategory[];
}

export default function ReportList({ reports, units, categories }: ReportListProps) {
  const { setFormInitialData, setCurrentView, triggerAlert, setReports } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<keyof Report>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  const handleClearFilters = () => {
    setSearchTerm(''); setSelectedUnit(''); setSelectedZone(''); setSelectedCategory(''); setSelectedType(''); setSelectedPriority(''); setSelectedStatus(''); setStartDate(''); setEndDate('');
  };

  const handleSort = (field: keyof Report) => {
    if (sortBy === field) setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(field); setSortOrder('desc'); }
  };

  let filtered = reports.filter((r) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (![r.reference, r.description, r.actions, r.zone, r.subzone, r.author, ...r.technicians].some((f) => f.toLowerCase().includes(q))) return false;
    }
    if (selectedUnit && r.unitId !== selectedUnit) return false;
    if (selectedZone && r.zone !== selectedZone) return false;
    if (selectedCategory && r.categoryId !== selectedCategory) return false;
    if (selectedType && r.reportType !== selectedType) return false;
    if (selectedPriority && r.priority !== selectedPriority) return false;
    if (selectedStatus && r.status !== selectedStatus) return false;
    if (startDate && r.createdAt < startDate) return false;
    if (endDate) { if (r.createdAt > `${endDate}T23:59:59.999Z`) return false; }
    return true;
  });

  filtered.sort((a, b) => {
    let valA = a[sortBy]; let valB = b[sortBy];
    if (Array.isArray(valA)) valA = valA.join(', ');
    if (Array.isArray(valB)) valB = valB.join(', ');
    if (valA === undefined) return 1; if (valB === undefined) return -1;
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const activeUnitObj = units.find((u) => u.id === selectedUnit);
  const activeFiltersCount = [selectedUnit, selectedCategory, selectedType, selectedPriority, selectedStatus, startDate, endDate].filter(Boolean).length;

  const handleEdit = (r: Report) => { setFormInitialData(r); setCurrentView('form'); };

  const handleDuplicate = async (r: Report) => {
    try {
      const res = await fetch(`/api/reports/duplicate/${r.id}`, { method: 'POST' });
      if (res.ok) { setFormInitialData(await res.json()); setCurrentView('form'); triggerAlert('success', `Brouillon créé par copie de ${r.reference}`); }
    } catch { triggerAlert('error', 'Impossible de dupliquer.'); }
  };

  const handleConvertConstat = async (r: Report) => {
    try {
      const res = await fetch(`/api/reports/convert-constat/${r.id}`, { method: 'POST' });
      if (res.ok) { setFormInitialData(await res.json()); setCurrentView('form'); triggerAlert('success', `Intervention initiée à partir du constat ${r.reference}`); }
    } catch { triggerAlert('error', 'Impossible de convertir.'); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
      if (res.ok) { triggerAlert('success', 'Rapport supprimé.'); const rRes = await fetch('/api/reports'); if (rRes.ok) setReports(await rRes.json()); }
      else triggerAlert('error', 'Échec de suppression.');
    } catch { triggerAlert('error', 'Erreur réseau.'); }
  };

  const handleViewHtml = (r: Report) => { window.open(`/api/reports/${r.id}/html`, '_blank'); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
          <input type="text" placeholder="Rechercher (réf, description, technicien...)" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg pl-11 pr-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800 shadow-sm" />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters((p) => !p)} className={`flex items-center gap-2 font-bold px-4 py-2.5 rounded-lg text-xs border shadow-sm transition-all ${showFilters || activeFiltersCount > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            <SlidersHorizontal className="w-4 h-4" />Filtres avancés
            {activeFiltersCount > 0 && <span className="bg-emerald-800 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-extrabold ml-1">{activeFiltersCount}</span>}
          </button>
          {(searchTerm || activeFiltersCount > 0) && (
            <button onClick={handleClearFilters} className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg px-4 py-2.5 transition-all">Réinitialiser</button>
          )}
        </div>
      </div>

      {(showFilters || activeFiltersCount > 0) && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 shadow-inner">
          <FilterSelect label="Unité" value={selectedUnit} onChange={(v) => { setSelectedUnit(v); setSelectedZone(''); }} options={units.map((u) => ({ v: u.id, l: u.name }))} />
          <FilterSelect label="Zone / Bloc" value={selectedZone} onChange={setSelectedZone} options={activeUnitObj?.zones.map((z) => ({ v: z.name, l: z.name })) || []} disabled={!selectedUnit} />
          <FilterSelect label="Domaine" value={selectedCategory} onChange={setSelectedCategory} options={categories.map((c) => ({ v: c.id, l: c.name }))} />
          <FilterSelect label="Type" value={selectedType} onChange={setSelectedType} options={[{ v: 'Technique', l: 'Technique' }, { v: 'Suivi', l: 'Suivi' }, { v: 'Constat', l: 'Constat' }]} />
          <FilterSelect label="Priorité" value={selectedPriority} onChange={setSelectedPriority} options={[{ v: 'Urgente', l: 'Urgente' }, { v: 'Normale', l: 'Normale' }, { v: 'Basse', l: 'Basse' }]} />
          <FilterSelect label="Statut" value={selectedStatus} onChange={setSelectedStatus} options={[{ v: 'Ouvert', l: 'Ouvert' }, { v: 'En cours', l: 'En cours' }, { v: 'Résolu', l: 'Résolu' }, { v: 'Clôturé', l: 'Clôturé' }]} />
          <div className="space-y-1"><label className="text-xs font-bold text-slate-600">Date début</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs font-medium text-slate-700 focus:outline-none" /></div>
          <div className="space-y-1"><label className="text-xs font-bold text-slate-600">Date fin</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs font-medium text-slate-700 focus:outline-none" /></div>
        </div>
      )}

      <div className="text-xs text-slate-400 font-semibold px-1">{filtered.length} {filtered.length > 1 ? 'rapports trouvés' : 'rapport trouvé'} sur {reports.length}</div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm italic">Aucun rapport ne correspond à ces critères.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th onClick={() => handleSort('reference')} className="py-4 px-4 cursor-pointer hover:bg-slate-100 select-none"><div className="flex items-center gap-1">Référence{sortBy === 'reference' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}</div></th>
                  <th onClick={() => handleSort('createdAt')} className="py-4 px-3 cursor-pointer hover:bg-slate-100 select-none"><div className="flex items-center gap-1">Date{sortBy === 'createdAt' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}</div></th>
                  <th className="py-4 px-3">Localisation</th>
                  <th className="py-4 px-3">Domaine</th>
                  <th onClick={() => handleSort('reportType')} className="py-4 px-3 cursor-pointer hover:bg-slate-100 select-none"><div className="flex items-center gap-1">Type{sortBy === 'reportType' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}</div></th>
                  <th onClick={() => handleSort('priority')} className="py-4 px-3 cursor-pointer hover:bg-slate-100 select-none"><div className="flex items-center gap-1">Priorité{sortBy === 'priority' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}</div></th>
                  <th onClick={() => handleSort('status')} className="py-4 px-3 cursor-pointer hover:bg-slate-100 select-none"><div className="flex items-center gap-1">Statut{sortBy === 'status' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}</div></th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {filtered.map((report) => {
                  const pCls = report.priority === 'Urgente' ? 'bg-red-50 text-red-600 border-red-100' : report.priority === 'Normale' ? 'bg-teal-50 text-teal-600 border-teal-100' : 'bg-slate-50 text-slate-500 border-slate-100';
                  const sCls = report.status === 'Ouvert' ? 'bg-orange-50 text-orange-600 border-orange-100' : report.status === 'En cours' ? 'bg-blue-50 text-blue-600 border-blue-100' : report.status === 'Résolu' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-slate-100 text-slate-600 border-slate-200';
                  const tCls = report.reportType === 'Technique' ? 'bg-emerald-800 text-white' : report.reportType === 'Suivi' ? 'bg-amber-500 text-slate-950' : 'bg-slate-600 text-white';
                  return (
                    <tr key={report.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold font-mono text-emerald-800 whitespace-nowrap">{report.reference}</td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-500">{new Date(report.createdAt).toLocaleDateString('fr-FR')}</td>
                      <td className="py-3 px-3"><div className="font-bold text-slate-800">{report.unitName}</div><div className="text-slate-500 font-medium text-[11px] truncate max-w-[200px]">{report.zone} &bull; {report.subzone}</div></td>
                      <td className="py-3 px-3 font-semibold text-slate-700 max-w-[150px] truncate">{report.categoryName}</td>
                      <td className="py-3 px-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${tCls}`}>{report.reportType}</span></td>
                      <td className="py-3 px-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${pCls}`}>{report.priority}</span></td>
                      <td className="py-3 px-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${sCls}`}>{report.status}</span></td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1.5 items-center">
                          <button onClick={() => handleViewHtml(report)} title="Imprimer" className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-emerald-800 rounded transition-all"><ExternalLink className="w-4 h-4" /></button>
                          <button onClick={() => handleEdit(report)} title="Modifier" className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded transition-all"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDuplicate(report)} title="Dupliquer" className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded transition-all"><Copy className="w-4 h-4" /></button>
                          {report.reportType === 'Constat' && <button onClick={() => handleConvertConstat(report)} title="Convertir en intervention" className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded transition-all"><Wrench className="w-4 h-4" /></button>}
                          <button onClick={() => { if (confirm(`Supprimer ${report.reference} ?`)) handleDelete(report.id); }} title="Supprimer" className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-all"><Trash2 className="w-4 h-4" /></button>
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

function FilterSelect({ label, value, onChange, options, disabled }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[]; disabled?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-slate-600">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="w-full bg-white border border-slate-200 rounded-lg py-2 px-2.5 text-xs font-medium text-slate-700 focus:outline-none disabled:opacity-50">
        <option value="">Tous</option>
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}
