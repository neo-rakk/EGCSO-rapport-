export interface Part {
  name: string;
  quantity: number;
}

export interface Photo {
  name: string;
  phase: "before" | "after";
  url?: string;
  data?: string;
}

export interface AudioNote {
  name: string;
  url?: string;
  data?: string;
}

export interface Report {
  id: string;
  reference: string;
  createdAt: string;
  updatedAt: string;
  unitId: string;
  unitName: string;
  zone: string;
  subzone: string;
  categoryId: string;
  categoryName: string;
  reportType: "Technique" | "Suivi" | "Constat";
  priority: "Urgente" | "Normale" | "Basse";
  status: "Ouvert" | "En cours" | "Résolu" | "Clôturé";
  technicians: string[];
  description: string;
  actions: string;
  parts: Part[];
  duration: number;
  cost: number;
  photos: Photo[];
  audioNotes?: AudioNote[];
  linkedReportId?: string;
  nextVisitDate?: string;
  additionalObservations?: string;
  author: string;
  isValidated: boolean;
  folderPath?: string;
}

export interface UnitZone {
  name: string;
  subzones: string[];
  floors?: string[];
  roomsPerFloor?: number;
}

export interface Unit {
  id: string;
  name: string;
  zones: UnitZone[];
}

export interface BreakdownCategory {
  id: string;
  name: string;
}

export interface AppSettings {
  storageRoot: string;
  companyName: string;
  departmentName: string;
  referenceFormat: string;
  githubRepo?: string;
  chiefMaintenanceName?: string;
}

export type BilanPeriod = "hebdomadaire" | "mensuel" | "annuel";

export interface BilanData {
  period: BilanPeriod;
  periodLabel: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  companyName: string;
  departmentName: string;
  summary: {
    total: number;
    ouvert: number;
    enCours: number;
    resolu: number;
    cloture: number;
    urgentCount: number;
    totalDuration: number;
    totalCost: number;
    validatedCount: number;
    constatCount: number;
    techniqueCount: number;
    suiviCount: number;
  };
  byUnit: { unitName: string; count: number; cost: number; duration: number; details: Report[] }[];
  byCategory: { categoryName: string; count: number; cost: number }[];
  byPriority: { priority: string; count: number; percentage: number }[];
  byStatus: { status: string; count: number; percentage: number }[];
  byType: { type: string; count: number; percentage: number }[];
  byTechnician: { name: string; count: number; duration: number }[];
  weeklyTrend?: { weekLabel: string; count: number }[];
  monthlyTrend?: { monthLabel: string; count: number }[];
  interventions: Report[];
  constats: Report[];
}

export interface CustomFollowUpSection {
  title: string;
  items: string[];
}

export interface CustomFollowUpSheet {
  id: string;
  title: string;
  unitId: string;
  unitName: string;
  zone: string;
  subzone: string;
  room: string;
  occupant: string;
  createdAt: string;
  updatedAt: string;
  sections: CustomFollowUpSection[];
}
