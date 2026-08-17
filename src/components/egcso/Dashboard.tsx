'use client';

import { useState } from "react";
import { Report, Unit } from "@/types";
import { useAppStore } from "@/hooks/use-app-store";
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
  Network,
} from "lucide-react";

interface DashboardProps {
  reports: Report[];
  units: Unit[];
}

export default function Dashboard({ reports, units }: DashboardProps) {
  const { setCurrentView, setFormInitialData } = useAppStore();
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({ VIL: true });
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({});

  const toggleUnit = (unitId: string) => setExpandedUnits((p) => ({ ...p, [unitId]: !p[unitId] }));
  const toggleZone = (zoneKey: string) => setExpandedZones((p) => ({ ...p, [zoneKey]: !p[zoneKey] }));

  const total = reports.length;
  const openReports = reports.filter((r) => r.status === "Ouvert").length;
  const inProgress = reports.filter((r) => r.status === "En cours").length;
  const resolved = reports.filter((r) => r.status === "Résolu").length;
  const urgentCount = reports.filter((r) => r.priority === "Urgente").length;
  const normalCount = reports.filter((r) => r.priority === "Normale").length;
  const lowCount = reports.filter((r) => r.priority === "Basse").length;

  const unitStats: Record<string, number> = {};
  reports.forEach((r) => { unitStats[r.unitName] = (unitStats[r.unitName] || 0) + 1; });
  const categoryStats: Record<string, number> = {};
  reports.forEach((r) => { categoryStats[r.categoryName] = (categoryStats[r.categoryName] || 0) + 1; });
  const sortedUnits = Object.entries(unitStats).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const sortedCategories = Object.entries(categoryStats).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const recentReports = [...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  const { settings } = useAppStore();

  return (
    <div className="space-y-8">
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-gradient-to-r from-emerald-800 to-teal-950 text-white rounded-xl p-6 md:p-8 shadow-md border-b-4 border-amber-500">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">EPIC EGCSO — Complexe Sportif d&apos;Oran</h2>
          <p className="text-emerald-200 mt-2 text-sm md:text-base font-medium">
            Système d&apos;enregistrement et d&apos;indexation des rapports de maintenance technique.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-emerald-100 bg-emerald-950/40 w-fit px-3 py-1.5 rounded-md border border-emerald-850">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
            <span>Stockage local actif : <code className="font-mono bg-emerald-950 px-1.5 py-0.5 rounded text-amber-300">{settings.storageRoot}</code></span>
          </div>
        </div>
        <div className="mt-6 md:mt-0 flex gap-3">
          <button onClick={() => { setFormInitialData(null); setCurrentView("form"); }} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-3 rounded-lg shadow-md transition-colors text-sm">
            <PlusCircle className="w-5 h-5" /> Nouveau Rapport
          </button>
          <button onClick={() => setCurrentView("list")} className="flex items-center gap-2 bg-white/15 hover:bg-white/20 text-white font-semibold px-5 py-3 rounded-lg border border-white/25 transition-all text-sm">
            Consulter la Base
          </button>
        </div>
      </div>

      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pannes Ouvertes" value={openReports} sub="Attente d'attribution" color="orange" icon={AlertTriangle} />
        <StatCard label="En cours" value={inProgress} sub="Interventions actives" color="blue" icon={Wrench} />
        <StatCard label="Résolus" value={resolved} sub="Attente de validation" color="green" icon={CheckCircle2} />
        <StatCard label="Total Dossiers" value={total} sub="Rapports au total" color="slate" icon={FolderClosed} />
      </div>

      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BarChartCard title="Répartition par Unité" data={sortedUnits} total={total} icon={Layers} barColor="bg-emerald-800" />
        <BarChartCard title="Domaines les plus touchés" data={sortedCategories} total={total} icon={BarChart3} barColor="bg-amber-500" showPct={false} />
        <PriorityCard urgentCount={urgentCount} normalCount={normalCount} lowCount={lowCount} total={total} onNavigate={() => setCurrentView("list")} />
      </div>

      
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-800" /><h3 className="font-extrabold text-slate-800 text-base">Dernières interventions rédigées</h3></div>
          <button onClick={() => setCurrentView("list")} className="text-xs font-bold text-emerald-800 hover:text-emerald-900 hover:underline">Tout voir</button>
        </div>
        {recentReports.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm italic">Aucun rapport enregistré pour l&apos;instant.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentReports.map((report) => (
              <div key={report.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors px-2 rounded-lg cursor-pointer" onClick={() => { setFormInitialData(report); setCurrentView("form"); }}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-emerald-800">{report.reference}</span>
                    <Badge priority={report.priority} /><Badge status={report.status} />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{report.unitName} &bull; {report.zone} &bull; {report.subzone}</p>
                  <p className="text-sm font-semibold text-slate-700 truncate max-w-[500px]">{report.description}</p>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div className="text-xs"><p className="font-bold text-slate-700">{report.author}</p><p className="text-slate-400 font-medium">{new Date(report.createdAt).toLocaleDateString("fr-FR")}</p></div>
                  <ArrowRight className="w-5 h-5 text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      
      <Arborescence units={units} expandedUnits={expandedUnits} expandedZones={expandedZones} toggleUnit={toggleUnit} toggleZone={toggleZone} />
    </div>
  );
}

function StatCard({ label, value, sub, color, icon: Icon }: { label: string; value: number; sub: string; color: string; icon: any }) {
  const colors: Record<string, string> = { orange: "text-orange-600 bg-orange-50", blue: "text-blue-600 bg-blue-50", green: "text-green-600 bg-green-50", slate: "text-slate-600 bg-slate-100" };
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-start justify-between">
      <div className="space-y-1">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className="text-3xl font-bold text-slate-800">{value}</div>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
      <div className={`p-3 rounded-lg ${colors[color]?.split(" ")[1] || "bg-slate-100"}`}>
        <Icon className={`w-6 h-6 ${colors[color]?.split(" ")[0] || "text-slate-600"}`} />
      </div>
    </div>
  );
}

function Badge({ priority, status }: { priority?: string; status?: string }) {
  if (priority) {
    const cls = priority === "Urgente" ? "bg-red-50 text-red-600 border-red-100" : priority === "Normale" ? "bg-teal-50 text-teal-600 border-teal-100" : "bg-slate-50 text-slate-600 border-slate-100";
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${cls}`}>{priority}</span>;
  }
  if (status) {
    const cls = status === "Ouvert" ? "bg-orange-50 text-orange-600 border-orange-100" : status === "En cours" ? "bg-blue-50 text-blue-600 border-blue-100" : status === "Résolu" ? "bg-green-50 text-green-600 border-green-100" : "bg-slate-100 text-slate-600 border-slate-200";
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${cls}`}>{status}</span>;
  }
  return null;
}

function BarChartCard({ title, data, total, icon: Icon, barColor, showPct = true }: { title: string; data: [string, number][]; total: number; icon: any; barColor: string; showPct?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100"><Icon className="w-5 h-5 text-emerald-800" /><h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">{title}</h3></div>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-xs text-slate-400 italic">Aucune donnée</div>
      ) : (
        <div className="space-y-3 pt-2">{data.map(([name, count]) => { const pct = total > 0 ? (count / total) * 100 : 0; return (
          <div key={name} className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-700"><span className="truncate max-w-[200px]">{name}</span><span>{count}{showPct ? ` (${Math.round(pct)}%)` : ""}</span></div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className={`${barColor} h-full rounded-full`} style={{ width: `${pct}%` }} /></div>
          </div>);
        })}</div>
      )}
    </div>
  );
}

function PriorityCard({ urgentCount, normalCount, lowCount, total, onNavigate }: { urgentCount: number; normalCount: number; lowCount: number; total: number; onNavigate: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100"><FolderHeart className="w-5 h-5 text-red-600" /><h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Niveau de Priorité</h3></div>
        {total === 0 ? (
          <div className="h-40 flex items-center justify-center text-xs text-slate-400 italic">Aucun rapport créé</div>
        ) : (
          <div className="py-6 flex justify-around items-center">
            {[{ n: urgentCount, l: "Urgente", c: "red" }, { n: normalCount, l: "Normale", c: "teal" }, { n: lowCount, l: "Basse", c: "slate" }].map((p) => (
              <div key={p.l} className="text-center space-y-1">
                <div className={`w-12 h-12 bg-${p.c}-50 text-${p.c}-600 rounded-full flex items-center justify-center mx-auto font-bold text-lg border border-${p.c}-200`}>{p.n}</div>
                <span className="text-xs font-bold text-slate-700">{p.l}</span>
                <p className="text-[10px] text-slate-400">{Math.round((p.n / (total || 1)) * 100)}% des cas</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-slate-100 pt-3 text-center">
        <button onClick={onNavigate} className="text-xs font-bold text-emerald-800 hover:text-emerald-900 inline-flex items-center gap-1 hover:underline">Voir la liste triée <ArrowRight className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

function Arborescence({ units, expandedUnits, expandedZones, toggleUnit, toggleZone }: { units: Unit[]; expandedUnits: Record<string, boolean>; expandedZones: Record<string, boolean>; toggleUnit: (id: string) => void; toggleZone: (key: string) => void }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5"><Network className="w-5 h-5 text-emerald-800" /><div><h3 className="font-extrabold text-slate-800 text-base">Arborescence &amp; Nomenclature du Complexe</h3><p className="text-xs text-slate-400 font-medium font-semibold">Consultez la structure hiérarchique officielle.</p></div></div>
        <div className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">{units.length} Unités</div>
      </div>
      {units.length === 0 ? (
        <div className="py-10 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">Aucune unité configurée.</div>
      ) : (
        <div className="space-y-4">{units.map((unit) => {
          const isExpanded = !!expandedUnits[unit.id];
          return (
            <div key={unit.id} className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
              <div onClick={() => toggleUnit(unit.id)} className="bg-slate-50/70 hover:bg-slate-50 px-4 py-3.5 flex items-center justify-between cursor-pointer border-b border-slate-100">
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                  <span className="w-6.5 h-6.5 rounded-lg bg-emerald-800 text-amber-400 flex items-center justify-center text-xs font-black">{unit.id}</span>
                  <span className="font-extrabold text-slate-800 text-sm">{unit.name}</span>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">{unit.zones?.length || 0} zones</span>
              </div>
              {isExpanded && (
                <div className="p-3 bg-white divide-y divide-slate-100 space-y-2">
                  {unit.zones.length === 0 ? <div className="text-center py-4 text-xs text-slate-400 italic">Aucune zone.</div> : unit.zones.map((zone) => {
                    const zk = `${unit.id}-${zone.name}`;
                    const isZe = !!expandedZones[zk];
                    return (
                      <div key={zone.name} className="pt-2 pb-1 space-y-1.5 pl-2 md:pl-4">
                        <div onClick={() => toggleZone(zk)} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                          <div className="flex items-center gap-2 text-slate-700">{isZe ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}<MapPin className="w-4 h-4 text-slate-400" /><span className="text-xs font-extrabold">{zone.name}</span></div>
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{zone.subzones?.length || 0}</span>
                        </div>
                        {isZe && (
                          <div className="pl-6 pr-2 py-1.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {zone.subzones.length === 0 ? <div className="text-[10px] text-slate-400 italic col-span-full">Aucune sous-zone.</div> : zone.subzones.map((sz) => (
                              <div key={sz} className="border border-slate-100 bg-slate-50/50 hover:bg-slate-50 rounded-lg p-2 flex items-center gap-1.5 transition-colors group">
                                <Grid3X3 className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-800" /><span className="text-[11px] font-semibold text-slate-600 truncate" title={sz}>{sz}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}</div>
      )}
    </div>
  );
}
