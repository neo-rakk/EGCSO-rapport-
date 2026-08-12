import { useState } from "react";
import { Report, Unit } from "../types";
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  FolderClosed, 
  BarChart3, 
  PlusCircle, 
  FolderHeart,
  Calendar,
  Layers,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  MapPin,
  Grid3X3,
  Network
} from "lucide-react";

interface DashboardProps {
  reports: Report[];
  units: Unit[];
  onCreateReport: () => void;
  onSelectReport: (report: Report) => void;
  onNavigateToSearch: () => void;
  storageRoot: string;
}

export default function Dashboard({ 
  reports, 
  units = [],
  onCreateReport, 
  onSelectReport, 
  onNavigateToSearch,
  storageRoot 
}: DashboardProps) {
  
  // Expanded units & zones state for the arborescence tree widget
  const [expandedUnits, setExpandedUnits] = useState<{ [key: string]: boolean }>({
    VIL: true // default to expanding Village Napoli
  });
  const [expandedZones, setExpandedZones] = useState<{ [key: string]: boolean }>({});

  const toggleUnit = (unitId: string) => {
    setExpandedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const toggleZone = (zoneKey: string) => {
    setExpandedZones(prev => ({ ...prev, [zoneKey]: !prev[zoneKey] }));
  };

  // Calculations
  const total = reports.length;
  const openReports = reports.filter(r => r.status === "Ouvert").length;
  const inProgress = reports.filter(r => r.status === "En cours").length;
  const resolved = reports.filter(r => r.status === "Résolu").length;
  const closed = reports.filter(r => r.status === "Clôturé").length;
  
  const urgentCount = reports.filter(r => r.priority === "Urgente").length;
  const normalCount = reports.filter(r => r.priority === "Normale").length;
  const lowCount = reports.filter(r => r.priority === "Basse").length;

  // Group by Unit
  const unitStats: { [key: string]: number } = {};
  reports.forEach(r => {
    unitStats[r.unitName] = (unitStats[r.unitName] || 0) + 1;
  });

  // Group by Category
  const categoryStats: { [key: string]: number } = {};
  reports.forEach(r => {
    categoryStats[r.categoryName] = (categoryStats[r.categoryName] || 0) + 1;
  });

  const sortedUnits = Object.entries(unitStats).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const sortedCategories = Object.entries(categoryStats).sort((a, b) => b[1] - a[1]).slice(0, 5);
  
  // Recent reports
  const recentReports = [...reports]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8" id="dashboard-container">
      {/* Top Welcome / Action Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-gradient-to-r from-emerald-800 to-teal-950 text-white rounded-xl p-6 md:p-8 shadow-md border-b-4 border-amber-500">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">EPIC EGCSO — Complexe Sportif d'Oran</h2>
          <p className="text-emerald-200 mt-2 text-sm md:text-base font-medium">
            Système d'enregistrement et d'indexation des rapports de maintenance technique.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-emerald-100 bg-emerald-950/40 w-fit px-3 py-1.5 rounded-md border border-emerald-850">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></span>
            <span>Stockage local actif : <code className="font-mono bg-emerald-950 px-1.5 py-0.5 rounded text-amber-300">{storageRoot}</code></span>
          </div>
        </div>
        <div className="mt-6 md:mt-0 flex gap-3">
          <button
            onClick={onCreateReport}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-3 rounded-lg shadow-md transition-colors text-sm"
            id="btn-quick-new-report"
          >
            <PlusCircle className="w-5 h-5" />
            Nouveau Rapport
          </button>
          <button
            onClick={onNavigateToSearch}
            className="flex items-center gap-2 bg-white/15 hover:bg-white/20 text-white font-semibold px-5 py-3 rounded-lg border border-white/25 transition-all text-sm"
          >
            Consulter la Base
          </button>
        </div>
      </div>

      {/* Main Stats Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Open */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pannes Ouvertes</span>
            <div className="text-3xl font-bold text-orange-600">{openReports}</div>
            <p className="text-xs text-slate-400">Attente d'attribution</p>
          </div>
          <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: In Progress */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">En cours</span>
            <div className="text-3xl font-bold text-blue-600">{inProgress}</div>
            <p className="text-xs text-slate-400">Interventions actives</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Wrench className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Resolved */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Résolus</span>
            <div className="text-3xl font-bold text-green-600">{resolved}</div>
            <p className="text-xs text-slate-400">Attente de validation</p>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Total */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Dossiers</span>
            <div className="text-3xl font-bold text-slate-800">{total}</div>
            <p className="text-xs text-slate-400">Rapports au total</p>
          </div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
            <FolderClosed className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Card 1: Units Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Layers className="w-5 h-5 text-emerald-800" />
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Répartition par Unité</h3>
          </div>
          {sortedUnits.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400 italic">
              Aucune donnée à afficher
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {sortedUnits.map(([unitName, count]) => {
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={unitName} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span className="truncate max-w-[200px]">{unitName}</span>
                      <span>{count} ({Math.round(pct)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-800 h-full rounded-full" 
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart Card 2: Breakdown Categories */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <BarChart3 className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Domaines les plus touchés</h3>
          </div>
          {sortedCategories.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400 italic">
              Aucune donnée à afficher
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {sortedCategories.map(([catName, count]) => {
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={catName} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span className="truncate max-w-[200px]">{catName}</span>
                      <span>{count}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-amber-500 h-full rounded-full" 
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Priority and Urgency metrics */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <FolderHeart className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Niveau de Priorité</h3>
            </div>
            {total === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-slate-400 italic">
                Aucun rapport créé
              </div>
            ) : (
              <div className="py-6 flex justify-around items-center">
                {/* Urgent Ring or Bars */}
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto font-bold text-lg border border-red-200">
                    {urgentCount}
                  </div>
                  <span className="text-xs font-bold text-slate-700">Urgente</span>
                  <p className="text-[10px] text-slate-400">{Math.round((urgentCount / (total || 1)) * 100)}% des cas</p>
                </div>
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto font-bold text-lg border border-teal-200">
                    {normalCount}
                  </div>
                  <span className="text-xs font-bold text-slate-700">Normale</span>
                  <p className="text-[10px] text-slate-400">{Math.round((normalCount / (total || 1)) * 100)}% des cas</p>
                </div>
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 bg-slate-50 text-slate-500 rounded-full flex items-center justify-center mx-auto font-bold text-lg border border-slate-200">
                    {lowCount}
                  </div>
                  <span className="text-xs font-bold text-slate-700">Basse</span>
                  <p className="text-[10px] text-slate-400">{Math.round((lowCount / (total || 1)) * 100)}% des cas</p>
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-slate-100 pt-3 text-center">
            <button
              onClick={onNavigateToSearch}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-900 inline-flex items-center gap-1 hover:underline"
            >
              Voir la liste triée
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Recent Activity List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-800" />
            <h3 className="font-extrabold text-slate-800 text-base">Dernières interventions rédigées</h3>
          </div>
          <button
            onClick={onNavigateToSearch}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-900 hover:underline"
          >
            Tout voir
          </button>
        </div>

        {recentReports.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm italic">
            Aucun rapport enregistré pour l'instant. Cliquez sur "Nouveau Rapport" pour commencer.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentReports.map(report => {
              const priorityClass = 
                report.priority === "Urgente" ? "bg-red-50 text-red-600 border-red-100" :
                report.priority === "Normale" ? "bg-teal-50 text-teal-600 border-teal-100" :
                "bg-slate-50 text-slate-600 border-slate-100";
              
              const statusClass = 
                report.status === "Ouvert" ? "bg-orange-50 text-orange-600 border-orange-100" :
                report.status === "En cours" ? "bg-blue-50 text-blue-600 border-blue-100" :
                report.status === "Résolu" ? "bg-green-50 text-green-600 border-green-100" :
                "bg-slate-100 text-slate-600 border-slate-200";

              return (
                <div 
                  key={report.id} 
                  className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors px-2 rounded-lg cursor-pointer"
                  onClick={() => onSelectReport(report)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-emerald-800">{report.reference}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${priorityClass}`}>{report.priority}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusClass}`}>{report.status}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      {report.unitName} &bull; {report.zone} &bull; {report.subzone}
                    </p>
                    <p className="text-sm font-semibold text-slate-700 truncate max-w-[500px]">
                      {report.description}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 text-right">
                    <div className="text-xs">
                      <p className="font-bold text-slate-700">{report.author}</p>
                      <p className="text-slate-400 font-medium">
                        {new Date(report.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Structural Arborescence & Nomenclature Widget */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Network className="w-5 h-5 text-emerald-800" />
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">Arborescence & Nomenclature du Complexe</h3>
              <p className="text-xs text-slate-400 font-medium font-semibold">
                Consultez la structure hiérarchique officielle de toutes les infrastructures sportives et d'hébergement d'Oran.
              </p>
            </div>
          </div>
          <div className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
            {units.length} Unités enregistrées
          </div>
        </div>

        {units.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Aucune unité configurée pour le moment. Vous pouvez configurer la nomenclature dans l'onglet Configuration.
          </div>
        ) : (
          <div className="space-y-4">
            {units.map(unit => {
              const isUnitExpanded = !!expandedUnits[unit.id];
              return (
                <div key={unit.id} className="border border-slate-200/80 rounded-xl overflow-hidden transition-all shadow-sm">
                  {/* Unit Title Header */}
                  <div 
                    onClick={() => toggleUnit(unit.id)}
                    className="bg-slate-50/70 hover:bg-slate-50 px-4 py-3.5 flex items-center justify-between cursor-pointer select-none transition-colors border-b border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      {isUnitExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                      <div className="flex items-center gap-2.5">
                        <span className="w-6.5 h-6.5 rounded-lg bg-emerald-800 text-amber-400 flex items-center justify-center text-xs font-black">
                          {unit.id}
                        </span>
                        <div>
                          <span className="font-extrabold text-slate-800 text-sm tracking-wide">{unit.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold ml-2">({unit.id})</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                      {unit.zones?.length || 0} zones / blocs
                    </span>
                  </div>

                  {/* Zones list (children of Unit) */}
                  {isUnitExpanded && (
                    <div className="p-3 bg-white divide-y divide-slate-100 space-y-2">
                      {(!unit.zones || unit.zones.length === 0) ? (
                        <div className="text-center py-4 text-xs text-slate-400 italic">
                          Aucun bloc ou zone n'a été rattaché à cette unité.
                        </div>
                      ) : (
                        unit.zones.map(zone => {
                          const zoneKey = `${unit.id}-${zone.name}`;
                          const isZoneExpanded = !!expandedZones[zoneKey];
                          return (
                            <div key={zone.name} className="pt-2 pb-1 space-y-1.5 pl-2 md:pl-4">
                              {/* Zone Row */}
                              <div 
                                onClick={() => toggleZone(zoneKey)}
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer select-none transition-all"
                              >
                                <div className="flex items-center gap-2 text-slate-700">
                                  {isZoneExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                  <span className="text-xs font-extrabold text-slate-700">{zone.name}</span>
                                </div>
                                <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                                  {zone.subzones?.length || 0} locaux / sous-zones
                                </span>
                              </div>

                              {/* Subzones list (children of Zone) */}
                              {isZoneExpanded && (
                                <div className="pl-6 pr-2 py-1.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                  {(!zone.subzones || zone.subzones.length === 0) ? (
                                    <div className="text-[10px] text-slate-400 italic col-span-full">
                                      Aucune sous-zone configurée pour ce bloc.
                                    </div>
                                  ) : (
                                    zone.subzones.map(subzone => (
                                      <div 
                                        key={subzone} 
                                        className="border border-slate-100 bg-slate-50/50 hover:bg-slate-50 rounded-lg p-2 flex items-center gap-1.5 transition-colors group"
                                      >
                                        <Grid3X3 className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-800 transition-colors flex-shrink-0" />
                                        <span className="text-[11px] font-semibold text-slate-600 truncate" title={subzone}>
                                          {subzone}
                                        </span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
