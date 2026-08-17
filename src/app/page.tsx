'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/hooks/use-app-store';
import Dashboard from '@/components/egcso/Dashboard';
import ReportForm from '@/components/egcso/ReportForm';
import ReportList from '@/components/egcso/ReportList';
import BlankFollowUpSheet from '@/components/egcso/BlankFollowUpSheet';
import Settings from '@/components/egcso/Settings';
import { LayoutDashboard, FileText, FolderSearch, ClipboardList, Settings2, Menu, X, Bell, CheckCircle2, AlertCircle, FileBarChart } from 'lucide-react';

import BilanReport from '@/components/egcso/BilanReport';

type ViewType = 'dashboard' | 'form' | 'list' | 'blankSheet' | 'bilan' | 'settings';

export default function HomePage() {
   const store = useAppStore();
   const { currentView, setCurrentView, mobileMenuOpen, setMobileMenuOpen, alert, setAlert, triggerAlert, appVersion, setAppVersion, reports, setReports, units, setUnits, categories, setCategories, settings, setSettings: applySettings, formInitialData, setFormInitialData } = store;

  const fetchData = async () => {
    try {
      const [reportsRes, unitsRes, categoriesRes, settingsRes, versionRes] = await Promise.all([
        fetch('/api/reports'),
        fetch('/api/config/unites'),
        fetch('/api/config/categories'),
        fetch('/api/settings'),
        fetch('/api/version'),
      ]);
      if (reportsRes.ok) setReports(await reportsRes.json());
      if (unitsRes.ok) setUnits(await unitsRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
      if (settingsRes.ok) applySettings(await settingsRes.json());
      if (versionRes.ok) { const v = await versionRes.json(); if (v.version) setAppVersion(v.version); }
    } catch {
      triggerAlert('error', 'Impossible de contacter le serveur.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const menuItems: { id: ViewType; label: string; icon: any; action?: () => void }[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'form', label: 'Nouveau Rapport', icon: FileText, action: () => setFormInitialData(null) },
    { id: 'list', label: 'Base de rapports', icon: FolderSearch },
    { id: 'bilan', label: 'Bilan de Maintenance', icon: FileBarChart },
    { id: 'blankSheet', label: 'Fiche de suivi', icon: ClipboardList },
    { id: 'settings', label: 'Paramètres', icon: Settings2 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-300">
        <div className="p-6 border-b border-slate-800 flex items-center gap-2.5">
          {typeof window !== 'undefined' && <img src="/icon.png" alt="EGCSO" className="w-9 h-9 object-contain rounded-lg bg-white p-1 border border-slate-700 shadow-sm" />}
          <div><h1 className="font-extrabold text-white text-sm tracking-wide leading-tight">EGCSO Rapport</h1><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Service Maintenance</p></div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button key={item.id} onClick={() => { item.action?.(); setCurrentView(item.id); }} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${active ? 'bg-emerald-800 text-white shadow-md font-extrabold' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}><Icon className="w-4 h-4" />{item.label}</button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800 text-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">EGCSO RAPPORT &bull; v{appVersion}</div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-600 hover:text-slate-900"><Menu className="w-6 h-6" /></button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500"><span>Nomenclature :</span><span className="bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded border border-slate-200">{settings.referenceFormat}</span></div>
          </div>
          <div className="flex items-center gap-4">
            <span suppressHydrationWarning className="text-xs font-semibold text-slate-500 hidden md:inline-block">EPIC EGCSO Oran &bull; {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <div className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer relative">
              <Bell className="w-5 h-5" />
              {reports.filter((r) => r.status === 'Ouvert').length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full text-[9px] font-bold w-4.5 h-4.5 flex items-center justify-center">{reports.filter((r) => r.status === 'Ouvert').length}</span>}
            </div>
          </div>
        </header>

        {/* Alert */}
        {alert && (
          <div className="fixed top-20 right-6 z-50">
            <div className={`p-4 rounded-xl shadow-lg border flex items-center gap-3 text-sm font-semibold max-w-md ${alert.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {alert.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span>{alert.message}</span>
              <button onClick={() => setAlert(null)} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          {currentView === 'dashboard' && <Dashboard reports={reports} units={units} />}
          {currentView === 'form' && <ReportForm initialData={formInitialData} units={units} categories={categories} />}
          {currentView === 'list' && <ReportList reports={reports} units={units} categories={categories} />}
          {currentView === 'bilan' && <BilanReport reports={reports} companyName={settings.companyName} departmentName={settings.departmentName} />}
          {currentView === 'blankSheet' && <BlankFollowUpSheet units={units} companyName={settings.companyName} departmentName={settings.departmentName} />}
          {currentView === 'settings' && <Settings appSettings={settings} units={units} categories={categories} />}
        </main>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 lg:hidden flex">
          <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/icon.png" alt="EGCSO" className="w-8 h-8 object-contain rounded-lg bg-white p-1 border border-slate-700 shadow-sm" />
                <h1 className="font-extrabold text-white text-xs">EGCSO Rapport</h1>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = currentView === item.id;
                return (
                  <button key={item.id} onClick={() => { item.action?.(); setCurrentView(item.id); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${active ? 'bg-emerald-800 text-white shadow-md font-extrabold' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}><Icon className="w-4 h-4" />{item.label}</button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-800 text-center text-[9px] text-slate-500 font-bold uppercase">EGCSO RAPPORT &bull; v{appVersion}</div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}
    </div>
  );
}
