'use client';

import { useState, useMemo } from 'react';
import type { BilanData, BilanPeriod, Report } from '@/types';
import {
  FileBarChart,
  Calendar,
  Clock,
  Printer,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Eye,
  FolderSearch,
  ChevronDown,
  ChevronRight,
  Coins,
  Timer,
  ClipboardCheck,
  BarChart3,
  Users,
  MapPin,
  Download,
} from 'lucide-react';

interface BilanReportProps {
  reports: Report[];
  companyName: string;
  departmentName: string;
}

export default function BilanReport({ reports, companyName, departmentName }: BilanReportProps) {
  const [period, setPeriod] = useState<BilanPeriod>('mensuel');
  const [referenceDate, setReferenceDate] = useState(new Date().toISOString().split('T')[0]);
  const [bilanData, setBilanData] = useState<BilanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    kpi: true,
    units: true,
    categories: true,
    technicians: false,
    interventions: false,
    constats: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchBilan = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period, date: referenceDate });
      const res = await fetch(`/api/bilan?${params}`);
      if (res.ok) {
        setBilanData(await res.json());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const openPrintView = () => {
    if (!bilanData) return;
    const params = new URLSearchParams({ period, date: referenceDate, format: 'html' });
    window.open(`/api/bilan?${params}`, '_blank');
  };

  const downloadPDF = async () => {
    if (!bilanData) return;
    setGeneratingPdf(true);
    try {
      const html2pdfModule = (await import('html2pdf.js')).default;
      const element = document.getElementById('bilan-pdf-content');
      if (!element) return;

      const opt = {
        margin: [8, 8, 8, 8] as [number, number, number, number],
        filename: `Bilan_Maintenance_${bilanData.period}_${referenceDate}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      await html2pdfModule().set(opt).from(element).save();
    } catch (err) {
      console.error('Error generating PDF:', err);
      openPrintView();
    } finally {
      setGeneratingPdf(false);
    }
  };

  const fmtDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} min`;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  const fmtCost = (c: number) => c.toLocaleString('fr-DZ') + ' DZD';

  const statusColors: Record<string, string> = {
    Ouvert: 'bg-orange-50 text-orange-600 border-orange-100',
    'En cours': 'bg-blue-50 text-blue-600 border-blue-100',
    Résolu: 'bg-green-50 text-green-600 border-green-100',
    Clôturé: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const priorityColors: Record<string, string> = {
    Urgente: 'bg-red-50 text-red-600 border-red-100',
    Normale: 'bg-teal-50 text-teal-600 border-teal-100',
    Basse: 'bg-slate-50 text-slate-500 border-slate-100',
  };

  const typeColors: Record<string, string> = {
    Technique: 'bg-emerald-800 text-white',
    Suivi: 'bg-amber-500 text-slate-950',
    Constat: 'bg-slate-600 text-white',
  };

  const renderSectionHeader = (key: string, title: string, icon: React.ReactNode, count?: number) => (
    <div className='flex items-center justify-between cursor-pointer select-none py-1' onClick={() => toggleSection(key)}>
      <div className='flex items-center gap-2'>
        {expandedSections[key] ? <ChevronDown className='w-4 h-4 text-slate-400' /> : <ChevronRight className='w-4 h-4 text-slate-400' />}
        <div className='flex items-center gap-2'>{icon}<span className='font-bold text-slate-800 text-sm uppercase tracking-wider'>{title}</span></div>
      </div>
      {count !== undefined && <span className='text-[10px] bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full font-bold'>{count}</span>}
    </div>
  );

  const maxTrend = useMemo(() => {
    if (!bilanData?.weeklyTrend) return 1;
    return Math.max(...bilanData.weeklyTrend.map((w) => w.count), 1);
  }, [bilanData?.weeklyTrend]);

  return (
    <div className='space-y-6' id='bilan-report-container'>
      <div className='bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between'>
        <div className='flex items-start gap-3'>
          <div className='p-3 bg-emerald-50 text-emerald-800 rounded-xl'><FileBarChart className='w-6 h-6' /></div>
          <div>
            <h2 className='text-xl font-extrabold text-slate-900'>Bilan de Maintenance</h2>
            <p className='text-sm text-slate-500 font-medium max-w-2xl'>
              Générez un rapport synthétique des interventions, constats et suivis pour une période donnée. Le bilan peut être imprimé ou exporté en PDF.
            </p>
          </div>
        </div>
        <div className='flex flex-col sm:flex-row gap-3 sm:items-end'>
          <div className='space-y-1 min-w-44'>
            <label className='text-xs font-bold text-slate-600 flex items-center gap-1.5'><BarChart3 className='w-3.5 h-3.5' /> Période</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value as BilanPeriod)} className='w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800'>
              <option value='hebdomadaire'>Hebdomadaire</option>
              <option value='mensuel'>Mensuel</option>
              <option value='annuel'>Annuel</option>
            </select>
          </div>
          <div className='space-y-1 min-w-44'>
            <label className='text-xs font-bold text-slate-600 flex items-center gap-1.5'><Calendar className='w-3.5 h-3.5' /> Date de référence</label>
            <input suppressHydrationWarning type='date' value={referenceDate} onChange={(e) => setReferenceDate(e.target.value)} className='w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800' />
          </div>
          <button onClick={fetchBilan} disabled={loading} className='inline-flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-lg text-sm shadow-sm transition-all cursor-pointer whitespace-nowrap'>
            {loading ? <RefreshCw className='w-4 h-4 animate-spin' /> : <TrendingUp className='w-4 h-4' />}
            {loading ? 'Génération...' : 'Générer le bilan'}
          </button>
          {bilanData && (
            <div className="flex items-center gap-2">
              <button onClick={downloadPDF} disabled={generatingPdf} className='inline-flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-lg text-sm shadow-sm transition-all cursor-pointer whitespace-nowrap'>
                {generatingPdf ? <RefreshCw className='w-4 h-4 animate-spin' /> : <Download className='w-4 h-4' />}
                {generatingPdf ? 'Génération PDF...' : 'Télécharger le PDF (.pdf)'}
              </button>
              <button onClick={openPrintView} className='inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-lg text-sm shadow-sm transition-all cursor-pointer whitespace-nowrap'>
                <Printer className='w-4 h-4' /> Vue Impression
              </button>
            </div>
          )}
        </div>
      </div>

      {!bilanData && !loading && (
        <div className='bg-white rounded-xl border border-slate-200 shadow-sm p-16 text-center'>
          <div className='p-4 bg-slate-100 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center'><FileBarChart className='w-8 h-8 text-slate-400' /></div>
          <h3 className='text-lg font-bold text-slate-700 mb-2'>Aucun bilan généré</h3>
          <p className='text-sm text-slate-500 max-w-md mx-auto'>Sélectionnez une période et une date de référence, puis cliquez sur &quot;Générer le bilan&quot; pour produire le rapport synthétique.</p>
        </div>
      )}

      {loading && !bilanData && (
        <div className='bg-white rounded-xl border border-slate-200 shadow-sm p-16 text-center'>
          <RefreshCw className='w-8 h-8 text-emerald-800 animate-spin mx-auto mb-3' />
          <p className='text-sm font-semibold text-slate-600'>Calcul du bilan en cours...</p>
        </div>
      )}

      {bilanData && (
        <div id="bilan-pdf-content" className="space-y-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className='bg-gradient-to-r from-emerald-800 to-teal-950 text-white rounded-xl p-5 shadow-md border-b-4 border-amber-500'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
              <div>
                <h3 className='text-lg font-extrabold'>{bilanData.periodLabel}</h3>
                <p className='text-emerald-200 text-sm font-medium mt-1'>
                  Du {new Date(bilanData.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} au{' '}
                  {new Date(bilanData.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className='text-right text-sm text-emerald-100'>
                <p>{bilanData.interventions.length} interventions · {bilanData.constats.length} constats</p>
                <p className='text-xs text-emerald-300 mt-1'>Généré le {new Date(bilanData.generatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4'>
            {renderSectionHeader('kpi', 'Indicateurs Clés (KPI)', <ClipboardCheck className='w-5 h-5 text-emerald-800' />)}
            {expandedSections.kpi && (
              <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2'>
                <div className='bg-emerald-50 rounded-xl p-4 border border-emerald-100 text-center'>
                  <div className='text-3xl font-extrabold text-emerald-800'>{bilanData.summary.total}</div>
                  <div className='text-xs font-bold text-emerald-700 uppercase mt-1'>Total rapports</div>
                </div>
                <div className='bg-orange-50 rounded-xl p-4 border border-orange-100 text-center'>
                  <div className='text-3xl font-extrabold text-orange-600'>{bilanData.summary.ouvert}</div>
                  <div className='text-xs font-bold text-orange-700 uppercase mt-1'>Ouverts</div>
                </div>
                <div className='bg-blue-50 rounded-xl p-4 border border-blue-100 text-center'>
                  <div className='text-3xl font-extrabold text-blue-600'>{bilanData.summary.enCours}</div>
                  <div className='text-xs font-bold text-blue-700 uppercase mt-1'>En cours</div>
                </div>
                <div className='bg-green-50 rounded-xl p-4 border border-green-100 text-center'>
                  <div className='text-3xl font-extrabold text-green-600'>{bilanData.summary.resolu + bilanData.summary.cloture}</div>
                  <div className='text-xs font-bold text-green-700 uppercase mt-1'>Résolus / Clôturés</div>
                </div>
              </div>
            )}
          </div>

          <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
            <div className='bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-3'>
              <div className='p-2.5 bg-amber-50 text-amber-600 rounded-lg'><Timer className='w-5 h-5' /></div>
              <div><div className='text-lg font-extrabold text-slate-800'>{fmtDuration(bilanData.summary.totalDuration)}</div><div className='text-[11px] font-semibold text-slate-500'>Temps total</div></div>
            </div>
            <div className='bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-3'>
              <div className='p-2.5 bg-emerald-50 text-emerald-600 rounded-lg'><Coins className='w-5 h-5' /></div>
              <div><div className='text-lg font-extrabold text-slate-800'>{fmtCost(bilanData.summary.totalCost)}</div><div className='text-[11px] font-semibold text-slate-500'>Coût total</div></div>
            </div>
            <div className='bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-3'>
              <div className='p-2.5 bg-red-50 text-red-600 rounded-lg'><AlertTriangle className='w-5 h-5' /></div>
              <div><div className='text-lg font-extrabold text-slate-800'>{bilanData.summary.urgentCount}</div><div className='text-[11px] font-semibold text-slate-500'>Interventions urgentes</div></div>
            </div>
            <div className='bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-3'>
              <div className='p-2.5 bg-green-50 text-green-600 rounded-lg'><CheckCircle2 className='w-5 h-5' /></div>
              <div><div className='text-lg font-extrabold text-slate-800'>{bilanData.summary.validatedCount}</div><div className='text-[11px] font-semibold text-slate-500'>Rapports validés</div></div>
            </div>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            <div className='bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4'>
              <div className='flex items-center gap-2 pb-3 border-b border-slate-100'><Clock className='w-5 h-5 text-emerald-800' /><h3 className='font-bold text-slate-800 text-sm uppercase tracking-wider'>Par Statut</h3></div>
              <div className='space-y-3 pt-2'>
                {bilanData.byStatus.map((s) => (
                  <div key={s.status} className='space-y-1'>
                    <div className='flex justify-between text-xs font-semibold text-slate-700'>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusColors[s.status] || ''}`}>{s.status}</span>
                      <span>{s.count} ({s.percentage}%)</span>
                    </div>
                    <div className='w-full bg-slate-100 h-2 rounded-full overflow-hidden'><div className='bg-emerald-800 h-full rounded-full transition-all' style={{ width: `${s.percentage}%` }}></div></div>
                  </div>
                ))}
              </div>
            </div>
            <div className='bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4'>
              <div className='flex items-center gap-2 pb-3 border-b border-slate-100'><Wrench className='w-5 h-5 text-amber-600' /><h3 className='font-bold text-slate-800 text-sm uppercase tracking-wider'>Par Type</h3></div>
              <div className='space-y-3 pt-2'>
                {bilanData.byType.map((t) => (
                  <div key={t.type} className='space-y-1'>
                    <div className='flex justify-between text-xs font-semibold text-slate-700'>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${typeColors[t.type] || ''}`}>{t.type}</span>
                      <span>{t.count} ({t.percentage}%)</span>
                    </div>
                    <div className='w-full bg-slate-100 h-2 rounded-full overflow-hidden'><div className='bg-amber-500 h-full rounded-full transition-all' style={{ width: `${t.percentage}%` }}></div></div>
                  </div>
                ))}
              </div>
            </div>
            <div className='bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4'>
              <div className='flex items-center gap-2 pb-3 border-b border-slate-100'><AlertTriangle className='w-5 h-5 text-red-600' /><h3 className='font-bold text-slate-800 text-sm uppercase tracking-wider'>Par Priorité</h3></div>
              <div className='space-y-3 pt-2'>
                {bilanData.byPriority.map((p) => (
                  <div key={p.priority} className='space-y-1'>
                    <div className='flex justify-between text-xs font-semibold text-slate-700'>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${priorityColors[p.priority] || ''}`}>{p.priority}</span>
                      <span>{p.count} ({p.percentage}%)</span>
                    </div>
                    <div className='w-full bg-slate-100 h-2 rounded-full overflow-hidden'><div className='bg-red-500 h-full rounded-full transition-all' style={{ width: `${p.percentage}%` }}></div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className='bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4'>
            {renderSectionHeader('units', 'Répartition par Unité du Complexe', <MapPin className='w-5 h-5 text-emerald-800' />, bilanData.byUnit.length)}
            {expandedSections.units && bilanData.byUnit.length > 0 && (
              <div className='overflow-x-auto pt-2'>
                <table className='w-full text-left border-collapse text-xs'>
                  <thead><tr className='bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold'><th className='py-3 px-4'>Unité</th><th className='py-3 px-3 text-center'>Nb Rapports</th><th className='py-3 px-3 text-center'>Durée Totale</th><th className='py-3 px-3 text-right'>Coût Total</th><th className='py-3 px-3'>Proportion</th></tr></thead>
                  <tbody className='divide-y divide-slate-100'>
                    {bilanData.byUnit.map((u) => (
                      <tr key={u.unitName} className='hover:bg-slate-50 transition-colors'>
                        <td className='py-3 px-4 font-bold text-slate-800'>{u.unitName}</td>
                        <td className='py-3 px-3 text-center font-bold text-emerald-800'>{u.count}</td>
                        <td className='py-3 px-3 text-center font-semibold text-slate-700'>{fmtDuration(u.duration)}</td>
                        <td className='py-3 px-3 text-right font-semibold text-slate-700'>{fmtCost(u.cost)}</td>
                        <td className='py-3 px-3'><div className='w-full bg-slate-100 h-2 rounded-full overflow-hidden'><div className='bg-emerald-800 h-full rounded-full' style={{ width: `${(u.count / (bilanData.summary.total || 1)) * 100}%` }}></div></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className='bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4'>
            {renderSectionHeader('categories', 'Domaines de Panne les Plus Touchés', <BarChart3 className='w-5 h-5 text-amber-600' />, bilanData.byCategory.length)}
            {expandedSections.categories && bilanData.byCategory.length > 0 && (
              <div className='space-y-3 pt-2'>
                {bilanData.byCategory.map((c) => {
                  const pct = (c.count / (bilanData.summary.total || 1)) * 100;
                  return (
                    <div key={c.categoryName} className='space-y-1'>
                      <div className='flex justify-between text-xs font-semibold text-slate-700'>
                        <span className='truncate max-w-[250px]'>{c.categoryName}</span>
                        <span>{c.count} ({Math.round(pct)}%) — {fmtCost(c.cost)}</span>
                      </div>
                      <div className='w-full bg-slate-100 h-2 rounded-full overflow-hidden'><div className='bg-amber-500 h-full rounded-full' style={{ width: `${pct}%` }}></div></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className='bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4'>
            {renderSectionHeader('technicians', 'Interventions par Technicien', <Users className='w-5 h-5 text-blue-600' />, bilanData.byTechnician.length)}
            {expandedSections.technicians && bilanData.byTechnician.length > 0 && (
              <div className='overflow-x-auto pt-2'>
                <table className='w-full text-left border-collapse text-xs'>
                  <thead><tr className='bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold'><th className='py-3 px-4'>Technicien</th><th className='py-3 px-3 text-center'>Nb Interventions</th><th className='py-3 px-3 text-center'>Durée Totale</th><th className='py-3 px-3'>Charge de travail</th></tr></thead>
                  <tbody className='divide-y divide-slate-100'>
                    {bilanData.byTechnician.map((t) => {
                      const maxCount = Math.max(...bilanData.byTechnician.map((x) => x.count), 1);
                      return (
                        <tr key={t.name} className='hover:bg-slate-50 transition-colors'>
                          <td className='py-3 px-4 font-bold text-slate-800'>{t.name}</td>
                          <td className='py-3 px-3 text-center font-bold text-emerald-800'>{t.count}</td>
                          <td className='py-3 px-3 text-center font-semibold text-slate-700'>{fmtDuration(t.duration)}</td>
                          <td className='py-3 px-3'><div className='w-full bg-slate-100 h-2 rounded-full overflow-hidden'><div className='bg-blue-500 h-full rounded-full' style={{ width: `${(t.count / maxCount) * 100}%` }}></div></div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {bilanData.weeklyTrend && bilanData.weeklyTrend.length > 1 && (
            <div className='bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4'>
              <div className='flex items-center gap-2 pb-3 border-b border-slate-100'><TrendingUp className='w-5 h-5 text-emerald-800' /><h3 className='font-bold text-slate-800 text-sm uppercase tracking-wider'>Évolution par Semaine</h3></div>
              <div className='space-y-3 pt-2'>
                {bilanData.weeklyTrend.map((w) => (
                  <div key={w.weekLabel} className='flex items-center gap-3'>
                    <span className='text-xs font-bold text-slate-600 w-24 text-right flex-shrink-0'>{w.weekLabel}</span>
                    <div className='flex-1 bg-slate-100 h-5 rounded-full overflow-hidden relative'>
                      <div className='bg-emerald-800 h-full rounded-full transition-all flex items-center justify-end pr-2' style={{ width: `${Math.max((w.count / maxTrend) * 100, 8)}%` }}>
                        {w.count > 0 && <span className='text-[10px] font-extrabold text-white'>{w.count}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className='bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4'>
            {renderSectionHeader('interventions', 'Détail des Interventions et Suivis', <FolderSearch className='w-5 h-5 text-emerald-800' />, bilanData.interventions.length)}
            {expandedSections.interventions && (
              <div className='max-h-96 overflow-y-auto pt-2'>
                {bilanData.interventions.length === 0 ? (
                  <p className='text-xs text-slate-400 italic py-8 text-center'>Aucune intervention pour cette période.</p>
                ) : (
                  <table className='w-full text-left border-collapse text-xs'>
                    <thead className='sticky top-0 bg-slate-50'><tr className='border-b border-slate-200 text-slate-500 uppercase font-bold'><th className='py-3 px-3'>Réf</th><th className='py-3 px-3'>Date</th><th className='py-3 px-3'>Localisation</th><th className='py-3 px-3'>Domaine</th><th className='py-3 px-2'>Type</th><th className='py-3 px-2'>Priorité</th><th className='py-3 px-2'>Statut</th><th className='py-3 px-2 text-center'>Durée</th><th className='py-3 px-2 text-right'>Coût</th></tr></thead>
                    <tbody className='divide-y divide-slate-100'>
                      {bilanData.interventions.map((r) => (
                        <tr key={r.id} className='hover:bg-slate-50 transition-colors'>
                          <td className='py-2.5 px-3 font-mono font-bold text-emerald-800 whitespace-nowrap'>{r.reference}</td>
                          <td className='py-2.5 px-3 whitespace-nowrap text-slate-500'>{new Date(r.createdAt).toLocaleDateString('fr-FR')}</td>
                          <td className='py-2.5 px-3'><div className='font-bold text-slate-800'>{r.unitName}</div><div className='text-slate-400 text-[10px]'>{r.zone} · {r.subzone}</div></td>
                          <td className='py-2.5 px-3 font-semibold text-slate-700'>{r.categoryName}</td>
                          <td className='py-2.5 px-2'><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${typeColors[r.reportType] || ''}`}>{r.reportType}</span></td>
                          <td className='py-2.5 px-2'><span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${priorityColors[r.priority] || ''}`}>{r.priority}</span></td>
                          <td className='py-2.5 px-2'><span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusColors[r.status] || ''}`}>{r.status}</span></td>
                          <td className='py-2.5 px-2 text-center font-semibold'>{fmtDuration(r.duration)}</td>
                          <td className='py-2.5 px-2 text-right font-semibold'>{fmtCost(r.cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          <div className='bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4'>
            {renderSectionHeader('constats', 'Constats Enregistrés', <Eye className='w-5 h-5 text-slate-600' />, bilanData.constats.length)}
            {expandedSections.constats && (
              <div className='max-h-96 overflow-y-auto pt-2'>
                {bilanData.constats.length === 0 ? (
                  <p className='text-xs text-slate-400 italic py-8 text-center'>Aucun constat pour cette période.</p>
                ) : (
                  <table className='w-full text-left border-collapse text-xs'>
                    <thead className='sticky top-0 bg-slate-50'><tr className='border-b border-slate-200 text-slate-500 uppercase font-bold'><th className='py-3 px-3'>Réf</th><th className='py-3 px-3'>Date</th><th className='py-3 px-3'>Localisation</th><th className='py-3 px-3'>Domaine</th><th className='py-3 px-2'>Priorité</th><th className='py-3 px-2'>Statut</th><th className='py-3 px-3'>Description</th></tr></thead>
                    <tbody className='divide-y divide-slate-100'>
                      {bilanData.constats.map((r) => (
                        <tr key={r.id} className='hover:bg-slate-50 transition-colors'>
                          <td className='py-2.5 px-3 font-mono font-bold text-emerald-800 whitespace-nowrap'>{r.reference}</td>
                          <td className='py-2.5 px-3 whitespace-nowrap text-slate-500'>{new Date(r.createdAt).toLocaleDateString('fr-FR')}</td>
                          <td className='py-2.5 px-3'><div className='font-bold text-slate-800'>{r.unitName}</div><div className='text-slate-400 text-[10px]'>{r.zone}</div></td>
                          <td className='py-2.5 px-3 font-semibold text-slate-700'>{r.categoryName}</td>
                          <td className='py-2.5 px-2'><span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${priorityColors[r.priority] || ''}`}>{r.priority}</span></td>
                          <td className='py-2.5 px-2'><span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusColors[r.status] || ''}`}>{r.status}</span></td>
                          <td className='py-2.5 px-3 max-w-[300px] truncate text-slate-700'>{r.description || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-6">
            <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50">
              <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-10">Le Chef de Service Maintenance</div>
              <div className="border-t border-slate-300 pt-1 text-[11px] text-slate-500 text-center font-medium">Nom, Prénom, Date et Visa</div>
            </div>
            <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50">
              <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-10">Le Directeur Technique EGCSO</div>
              <div className="border-t border-slate-300 pt-1 text-[11px] text-slate-500 text-center font-medium">Nom, Prénom, Date et Visa</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
