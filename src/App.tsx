import { useState, useEffect } from "react";
import { Report, Unit, BreakdownCategory, AppSettings } from "./types";
import Dashboard from "./components/Dashboard";
import ReportForm from "./components/ReportForm";
import ReportList from "./components/ReportList";
import Settings from "./components/Settings";
import { 
  LayoutDashboard, 
  FileText, 
  FolderSearch, 
  Settings2, 
  Menu, 
  X,
  Bell,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function App() {
  // Navigation
  const [currentView, setCurrentView] = useState<"dashboard" | "form" | "list" | "settings">("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core App State
  const [reports, setReports] = useState<Report[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<BreakdownCategory[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    storageRoot: "./EGCSO_Maintenance",
    companyName: "EPIC EGCSO",
    departmentName: "Service Maintenance",
    referenceFormat: "EGCSO-[CODE_UNITE]-[TYPE]-[AAAAMMJJ]-[SEQ]"
  });

  // Editor states
  const [formInitialData, setFormInitialData] = useState<Partial<Report> | null>(null);

  // Global Alerts
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Load initial data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [reportsRes, unitsRes, categoriesRes, settingsRes] = await Promise.all([
        fetch("/api/reports"),
        fetch("/api/config/unites"),
        fetch("/api/config/categories"),
        fetch("/api/settings")
      ]);

      if (reportsRes.ok) setReports(await reportsRes.json());
      if (unitsRes.ok) setUnits(await unitsRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
      if (settingsRes.ok) setSettings(await settingsRes.json());
    } catch (err) {
      console.error("Error fetching application data:", err);
      triggerAlert("error", "Impossible de contacter le serveur local de maintenance.");
    }
  };

  const triggerAlert = (type: "success" | "error", message: string) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert(null);
    }, 5000);
  };

  // CRUD Actions

  // Submit report to server
  const handleFormSubmit = async (reportData: any) => {
    try {
      const isEdit = !!reportData.id;
      const url = isEdit ? `/api/reports/${reportData.id}` : "/api/reports";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportData)
      });

      if (response.ok) {
        const savedReport = await response.json();
        triggerAlert("success", `Rapport ${savedReport.reference} enregistré avec succès !`);
        
        // Refresh and navigate
        await fetchData();
        setCurrentView("list");
        setFormInitialData(null);
      } else {
        const errData = await response.json();
        triggerAlert("error", errData.error || "Échec d'enregistrement du rapport.");
      }
    } catch (err) {
      console.error("Error saving report:", err);
      triggerAlert("error", "Erreur réseau lors de la sauvegarde du rapport.");
    }
  };

  // Edit action
  const handleEditReport = (report: Report) => {
    setFormInitialData(report);
    setCurrentView("form");
  };

  // Duplicate action
  const handleDuplicateReport = async (report: Report) => {
    try {
      const response = await fetch(`/api/reports/duplicate/${report.id}`, { method: "POST" });
      if (response.ok) {
        const duplicatedData = await response.json();
        setFormInitialData(duplicatedData);
        setCurrentView("form");
        triggerAlert("success", `Nouveau brouillon créé par copie de ${report.reference}`);
      }
    } catch (err) {
      triggerAlert("error", "Impossible de dupliquer ce rapport.");
    }
  };

  // Convert Constat to Technical report
  const handleConvertConstat = async (report: Report) => {
    try {
      const response = await fetch(`/api/reports/convert-constat/${report.id}`, { method: "POST" });
      if (response.ok) {
        const convertedData = await response.json();
        setFormInitialData(convertedData);
        setCurrentView("form");
        triggerAlert("success", `Création d'intervention initiée à partir du constat ${report.reference}`);
      }
    } catch (err) {
      triggerAlert("error", "Impossible de convertir ce constat.");
    }
  };

  // Delete action
  const handleDeleteReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
      if (response.ok) {
        triggerAlert("success", "Rapport supprimé avec succès.");
        fetchData();
      } else {
        triggerAlert("error", "Échec de suppression du rapport.");
      }
    } catch (err) {
      triggerAlert("error", "Erreur réseau lors de la suppression.");
    }
  };

  // Print HTML action (opens in new tab)
  const handleViewHtml = (report: Report) => {
    window.open(`/api/reports/${report.id}/html`, "_blank");
  };

  // Update Settings from Admin
  const handleUpdateSettings = async (newSettings: AppSettings) => {
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings)
      });
      if (response.ok) {
        setSettings(await response.json());
        triggerAlert("success", "Paramètres de stockage mis à jour !");
        fetchData();
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  // Update Units hierarchy
  const handleUpdateUnits = async (newUnits: Unit[]) => {
    try {
      const response = await fetch("/api/config/unites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUnits)
      });
      if (response.ok) {
        setUnits(newUnits);
        triggerAlert("success", "Hiérarchie du complexe sportif mise à jour !");
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  // Update Categories
  const handleUpdateCategories = async (newCategories: BreakdownCategory[]) => {
    try {
      const response = await fetch("/api/config/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategories)
      });
      if (response.ok) {
        setCategories(newCategories);
        triggerAlert("success", "Catégories de pannes enregistrées !");
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  // Reconstruct file index
  const handleReconstructIndex = async () => {
    try {
      const response = await fetch("/api/reports/reconstruct", { method: "POST" });
      if (response.ok) {
        const result = await response.json();
        fetchData();
        return result;
      }
    } catch (err) {
      console.error(err);
    }
    return { success: false, count: 0, message: "Échec de connexion." };
  };

  const menuItems = [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { id: "form", label: "Nouveau Rapport", icon: FileText, action: () => setFormInitialData(null) },
    { id: "list", label: "Base de rapports", icon: FolderSearch },
    { id: "settings", label: "Paramètres", icon: Settings2 }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex" id="app-wrapper">
      
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-300">
        <div className="p-6 border-b border-slate-800 flex items-center gap-2.5">
          <div className="w-9 h-9 bg-emerald-700 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-md border border-emerald-500/30">
            EGCSO
          </div>
          <div>
            <h1 className="font-extrabold text-white text-sm tracking-wide leading-tight">EGCSO Rapport</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Service Maintenance</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {menuItems.map(item => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.action) item.action();
                  setCurrentView(item.id as any);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  active 
                    ? "bg-emerald-800 text-white shadow-md font-extrabold" 
                    : "hover:bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 text-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          EGCSO RAPPORT &bull; v2.1.2
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP BAR / HEADER */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500">
              <span>Nomenclature :</span>
              <span className="bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded border border-slate-200">
                {settings.referenceFormat}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-500 hidden md:inline-block">
              EPIC EGCSO Oran &bull; {new Date().toLocaleDateString("fr-FR", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <div className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer relative">
              <Bell className="w-5 h-5" />
              {reports.filter(r => r.status === "Ouvert").length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full text-[9px] font-bold w-4.5 h-4.5 flex items-center justify-center">
                  {reports.filter(r => r.status === "Ouvert").length}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* ALERTS SYSTEM */}
        {alert && (
          <div className="fixed top-20 right-6 z-50 animate-fade-in">
            <div className={`p-4 rounded-xl shadow-lg border flex items-center gap-3 text-sm font-semibold max-w-md ${
              alert.type === "success" 
                ? "bg-green-50 border-green-200 text-green-700" 
                : "bg-red-50 border-red-200 text-red-700"
            }`}>
              {alert.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span>{alert.message}</span>
              <button 
                onClick={() => setAlert(null)}
                className="ml-auto text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* PAGE CONTENT */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          
          {currentView === "dashboard" && (
            <Dashboard
              reports={reports}
              units={units}
              onCreateReport={() => {
                setFormInitialData(null);
                setCurrentView("form");
              }}
              onSelectReport={(report) => {
                handleEditReport(report);
              }}
              onNavigateToSearch={() => setCurrentView("list")}
              storageRoot={settings.storageRoot}
            />
          )}

          {currentView === "form" && (
            <ReportForm
              initialData={formInitialData}
              units={units}
              categories={categories}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setFormInitialData(null);
                setCurrentView("list");
              }}
            />
          )}

          {currentView === "list" && (
            <ReportList
              reports={reports}
              units={units}
              categories={categories}
              onEdit={handleEditReport}
              onDuplicate={handleDuplicateReport}
              onConvertConstat={handleConvertConstat}
              onDelete={handleDeleteReport}
              onViewHtml={handleViewHtml}
            />
          )}

          {currentView === "settings" && (
            <Settings
              appSettings={settings}
              onUpdateSettings={handleUpdateSettings}
              onReconstructIndex={handleReconstructIndex}
              units={units}
              onUpdateUnits={handleUpdateUnits}
              categories={categories}
              onUpdateCategories={handleUpdateCategories}
            />
          )}

        </main>
      </div>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 lg:hidden flex">
          <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full animate-slide-right">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-700 rounded-lg flex items-center justify-center text-white font-black text-[10px] border border-emerald-500/30">
                  EGCSO
                </div>
                <h1 className="font-extrabold text-white text-xs">EGCSO Rapport</h1>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1">
              {menuItems.map(item => {
                const Icon = item.icon;
                const active = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.action) item.action();
                      setCurrentView(item.id as any);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                      active 
                        ? "bg-emerald-800 text-white shadow-md font-extrabold" 
                        : "hover:bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-800 text-center text-[9px] text-slate-500 font-bold uppercase">
              EGCSO RAPPORT &bull; v2.1.2
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)}></div>
        </div>
      )}

    </div>
  );
}
