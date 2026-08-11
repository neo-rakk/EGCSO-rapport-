export interface Part {
  name: string;
  quantity: number;
}

export interface Photo {
  name: string;
  phase: "before" | "after";
  url?: string;
  data?: string; // base64 string for new uploads
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
  duration: number; // in minutes
  cost: number; // in DZD
  photos: Photo[];
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
}
