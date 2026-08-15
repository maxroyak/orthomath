// ═══════════════════════════════════════════════════════════════════════════
// Persistence Layer — localStorage-based store
//
// Simple localStorage persistence for MVP. The data model is designed to be
// portable to SQLite/Prisma in the future.
// ═══════════════════════════════════════════════════════════════════════════

import type {
  Patient,
  DiagnosticRecord,
  TreatmentScenario,
  UserSettings,
} from '../domain/types';
import { createSeedData } from './seedData';

const STORAGE_KEY = 'orthomath-data-v1';

interface AppData {
  patients: Patient[];
  diagnostics: DiagnosticRecord[];
  scenarios: TreatmentScenario[];
  settings: UserSettings;
  firstUse: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  defaultAssumptions: {
    expansionCoefficient: 0.6,
    incisorAdvancementCoefficient: 2.0,
    incisorRetractionCoefficient: 2.0,
    extractionSpaceUtilization: 50,
    iprWarningThreshold: 0.5,
    balancedTolerance: 0.5,
  },
  balancedTolerance: 0.5,
  minorDiscrepancyThreshold: 2.0,
  boltonDiscrepancyTolerance: 0.5,
  boltonRelevantThreshold: 1.5,
};

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      // Merge with defaults to handle missing fields
      return {
        patients: parsed.patients || [],
        diagnostics: parsed.diagnostics || [],
        scenarios: parsed.scenarios || [],
        settings: {
          ...DEFAULT_SETTINGS,
          ...parsed.settings,
          defaultAssumptions: { ...DEFAULT_SETTINGS.defaultAssumptions, ...parsed.settings?.defaultAssumptions },
          boltonDiscrepancyTolerance: parsed.settings?.boltonDiscrepancyTolerance ?? DEFAULT_SETTINGS.boltonDiscrepancyTolerance,
          boltonRelevantThreshold: parsed.settings?.boltonRelevantThreshold ?? DEFAULT_SETTINGS.boltonRelevantThreshold,
        },
        firstUse: parsed.firstUse ?? true,
      };
    }
  } catch {
    // Fall through to seed
  }

  // First run — seed with demo data
  const seed = createSeedData(DEFAULT_SETTINGS.defaultAssumptions);
  const data: AppData = {
    patients: seed.patients,
    diagnostics: seed.diagnostics,
    scenarios: seed.scenarios,
    settings: DEFAULT_SETTINGS,
    firstUse: true,
  };
  saveData(data);
  return data;
}

function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── API ────────────────────────────────────────────────────────────────────

export const store = {
  // ── Patients ──────────────────────────────────────────────────────────────
  getPatients(): Patient[] {
    return loadData().patients;
  },

  getPatient(id: string): Patient | undefined {
    return loadData().patients.find((p) => p.id === id);
  },

  savePatient(patient: Patient): void {
    const data = loadData();
    const idx = data.patients.findIndex((p) => p.id === patient.id);
    const updated = { ...patient, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
      data.patients[idx] = updated;
    } else {
      data.patients.push(updated);
    }
    saveData(data);
  },

  deletePatient(id: string): void {
    const data = loadData();
    data.patients = data.patients.filter((p) => p.id !== id);
    data.diagnostics = data.diagnostics.filter((d) => d.patientId !== id);
    data.scenarios = data.scenarios.filter((s) => s.patientId !== id);
    saveData(data);
  },

  // ── Diagnostics ──────────────────────────────────────────────────────────
  getDiagnostic(patientId: string): DiagnosticRecord | undefined {
    return loadData().diagnostics.find((d) => d.patientId === patientId);
  },

  saveDiagnostic(record: DiagnosticRecord): void {
    const data = loadData();
    const idx = data.diagnostics.findIndex((d) => d.patientId === record.patientId);
    const updated = { ...record, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
      data.diagnostics[idx] = updated;
    } else {
      data.diagnostics.push(updated);
    }
    saveData(data);
  },

  // ── Scenarios ──────────────────────────────────────────────────────────────
  getScenarios(patientId: string): TreatmentScenario[] {
    return loadData().scenarios.filter((s) => s.patientId === patientId);
  },

  getScenario(id: string): TreatmentScenario | undefined {
    return loadData().scenarios.find((s) => s.id === id);
  },

  saveScenario(scenario: TreatmentScenario): void {
    const data = loadData();
    const idx = data.scenarios.findIndex((s) => s.id === scenario.id);
    const updated = { ...scenario, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
      data.scenarios[idx] = updated;
    } else {
      data.scenarios.push(updated);
    }

    // If this scenario is preferred, unprefer all others for this patient
    if (updated.isPreferred) {
      data.scenarios = data.scenarios.map((s) =>
        s.patientId === updated.patientId && s.id !== updated.id
          ? { ...s, isPreferred: false }
          : s,
      );
    }
    saveData(data);
  },

  deleteScenario(id: string): void {
    const data = loadData();
    data.scenarios = data.scenarios.filter((s) => s.id !== id);
    saveData(data);
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  getSettings(): UserSettings {
    return loadData().settings;
  },

  saveSettings(settings: UserSettings): void {
    const data = loadData();
    data.settings = settings;
    saveData(data);
  },

  // ── First Use ─────────────────────────────────────────────────────────────
  isFirstUse(): boolean {
    return loadData().firstUse;
  },

  setFirstUseComplete(): void {
    const data = loadData();
    data.firstUse = false;
    saveData(data);
  },

  // ── Raw Data (for debugging/testing) ──────────────────────────────────────
  getAll(): AppData {
    return loadData();
  },

  resetAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  },
};