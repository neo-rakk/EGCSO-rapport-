import { create } from "zustand";
import type { Report, Unit, BreakdownCategory, AppSettings } from "@/types";

type ViewType = "dashboard" | "form" | "list" | "blankSheet" | "bilan" | "settings";

type Alert = { type: "success" | "error"; message: string } | null;

interface AppState {
  // Navigation
  currentView: ViewType;
  setCurrentView: (v: ViewType) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;

  // Core data
  appVersion: string;
  setAppVersion: (v: string) => void;
  reports: Report[];
  setReports: (r: Report[]) => void;
  units: Unit[];
  setUnits: (u: Unit[]) => void;
  categories: BreakdownCategory[];
  setCategories: (c: BreakdownCategory[]) => void;
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;

  // Editor states
  formInitialData: Partial<Report> | null;
  setFormInitialData: (d: Partial<Report> | null) => void;

  // Alerts
  alert: Alert;
  setAlert: (a: Alert) => void;
  triggerAlert: (type: "success" | "error", message: string) => void;
}

const defaultSettings: AppSettings = {
  storageRoot: "./EGCSO_Maintenance",
  companyName: "EPIC EGCSO",
  departmentName: "Service Maintenance",
  referenceFormat: "EGCSO-[CODE_UNITE]-[TYPE]-[AAAAMMJJ]-[SEQ]",
};

export const useAppStore = create<AppState>((set) => ({
  currentView: "dashboard",
  setCurrentView: (v) => set({ currentView: v }),
  mobileMenuOpen: false,
  setMobileMenuOpen: (v) => set({ mobileMenuOpen: v }),
  appVersion: "2.3.1",
  setAppVersion: (v) => set({ appVersion: v }),
  reports: [],
  setReports: (r) => set({ reports: r }),
  units: [],
  setUnits: (u) => set({ units: u }),
  categories: [],
  setCategories: (c) => set({ categories: c }),
  settings: defaultSettings,
  setSettings: (s) => set({ settings: s }),
  formInitialData: null,
  setFormInitialData: (d) => set({ formInitialData: d }),
  alert: null,
  setAlert: (a) => set({ alert: a }),
  triggerAlert: (type, message) => {
    set({ alert: { type, message } });
    setTimeout(() => set({ alert: null }), 5000);
  },
}));
