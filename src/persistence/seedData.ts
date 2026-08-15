// ═══════════════════════════════════════════════════════════════════════════
// Seed Data — Demo patients for immediate exploration
// ═══════════════════════════════════════════════════════════════════════════

import type {
  Patient,
  DiagnosticRecord,
  TreatmentScenario,
  CalculationAssumptions,
  ToothMeasurement,
} from '../domain/types';

// Use deterministic UUIDs for seed data so relationships are stable
const SEED_PATIENT_ID = 'seed-patient-anna';
const SEED_DIAG_ID = 'seed-diag-anna';

function seedTeeth(widths: Record<number, number>): ToothMeasurement[] {
  return Object.entries(widths).map(([fdi, width]) => ({
    id: `seed-tooth-${fdi}`,
    fdiNumber: parseInt(fdi),
    arch: parseInt(fdi) >= 10 && parseInt(fdi) <= 27 ? 'upper' : 'lower',
    mesiodistalWidth: width,
  }));
}

// Realistic mesiodistal widths (mm) — synthetic demo data
const UPPER_WIDTHS: Record<number, number> = {
  11: 8.5, 12: 6.5, 13: 8.0, 14: 7.0, 15: 6.7, 16: 10.5,
  21: 8.5, 22: 6.5, 23: 8.0, 24: 7.0, 25: 6.7, 26: 10.5,
  17: 9.5, 27: 9.5,
};

const LOWER_WIDTHS: Record<number, number> = {
  41: 5.3, 42: 5.5, 43: 7.0, 44: 7.0, 45: 7.2, 46: 11.0,
  31: 5.3, 32: 5.5, 33: 7.0, 34: 7.0, 35: 7.2, 36: 11.0,
  47: 10.5, 37: 10.5,
};

export function createSeedData(assumptions: CalculationAssumptions): {
  patients: Patient[];
  diagnostics: DiagnosticRecord[];
  scenarios: TreatmentScenario[];
} {
  const now = new Date().toISOString();

  const patient: Patient = {
    id: SEED_PATIENT_ID,
    name: 'Anna Petrova',
    age: 17,
    sex: 'female',
    dentitionStage: 'permanent',
    notes: 'Demo patient — synthetic data for exploration.',
    createdAt: now,
    updatedAt: now,
  };

  const teeth = [...seedTeeth(UPPER_WIDTHS), ...seedTeeth(LOWER_WIDTHS)];

  const diagnostic: DiagnosticRecord = {
    id: SEED_DIAG_ID,
    patientId: SEED_PATIENT_ID,
    archMeasurements: [
      { arch: 'upper', crowdingSpacing: -6.4 },
      { arch: 'lower', crowdingSpacing: -4.2 },
    ],
    toothMeasurements: teeth,
    cephalometric: {
      SNA: 82, SNB: 79, ANB: 3, Wits: 1, FMA: 25,
      'SN-MP': 32, IMPA: 95, 'U1-SN': 105,
      overjet: 4.0, overbite: 3.0,
    },
    includeBolton: true,
    createdAt: now,
    updatedAt: now,
  };

  // ── Scenario A: Non-extraction ─────────────────────────────────────────────
  const scenarioA: TreatmentScenario = {
    id: 'seed-scenario-a',
    patientId: SEED_PATIENT_ID,
    name: 'Non-extraction',
    description: 'Expansion + IPR + Distalization approach',
    isPreferred: false,
    assumptions: { ...assumptions },
    clinicalNotes: 'Favorable growth pattern, mild crowding. Attempt non-extraction first.',
    createdAt: now,
    updatedAt: now,
    mechanics: [
      {
        id: 'seed-mech-a1',
        scenarioId: 'seed-scenario-a',
        type: 'EXPANSION',
        arch: 'upper',
        parameters: {
          expansionMode: 'calculated',
          expansionAmount: 3.0,
          expansionCoefficient: 0.6,
        },
        spaceEffect: 1.8,
      },
      {
        id: 'seed-mech-a2',
        scenarioId: 'seed-scenario-a',
        type: 'IPR',
        arch: 'upper',
        parameters: { iprPerContact: 0.2, numberOfContacts: 12 },
        spaceEffect: 2.4,
      },
      {
        id: 'seed-mech-a3',
        scenarioId: 'seed-scenario-a',
        type: 'DISTALIZATION',
        arch: 'upper',
        parameters: {
          rightDistalization: 0.75,
          leftDistalization: 0.75,
          expectedUsableSpace: 1.5,
        },
        spaceEffect: 1.5,
      },
      {
        id: 'seed-mech-a4',
        scenarioId: 'seed-scenario-a',
        type: 'IPR',
        arch: 'lower',
        parameters: { iprPerContact: 0.25, numberOfContacts: 8 },
        spaceEffect: 2.0,
      },
      {
        id: 'seed-mech-a5',
        scenarioId: 'seed-scenario-a',
        type: 'INCISOR_MOVEMENT',
        arch: 'lower',
        parameters: { incisorMovement: 1.0, incisorCoefficient: 2.0 },
        spaceEffect: 2.0,
      },
    ],
  };

  // ── Scenario B: Upper premolar extraction (14/24) ────────────────────────
  const scenarioB: TreatmentScenario = {
    id: 'seed-scenario-b',
    patientId: SEED_PATIENT_ID,
    name: 'Extraction 14/24',
    description: 'Upper premolar extraction with moderate anchorage',
    isPreferred: true,
    assumptions: { ...assumptions },
    clinicalNotes: 'Moderate upper crowding. Upper 4s extraction with Nance button anchorage.',
    createdAt: now,
    updatedAt: now,
    mechanics: [
      {
        id: 'seed-mech-b1',
        scenarioId: 'seed-scenario-b',
        type: 'EXTRACTION',
        arch: 'upper',
        parameters: {
          extractedTeeth: [14, 24],
          toothWidths: { 14: 7.0, 24: 7.0 },
          extractionUtilizationPercent: 50,
        },
        spaceEffect: 7.0,
      },
      {
        id: 'seed-mech-b2',
        scenarioId: 'seed-scenario-b',
        type: 'IPR',
        arch: 'lower',
        parameters: { iprPerContact: 0.25, numberOfContacts: 8 },
        spaceEffect: 2.0,
      },
      {
        id: 'seed-mech-b3',
        scenarioId: 'seed-scenario-b',
        type: 'INCISOR_MOVEMENT',
        arch: 'lower',
        parameters: { incisorMovement: 1.0, incisorCoefficient: 2.0 },
        spaceEffect: 2.0,
      },
    ],
  };

  // ── Scenario C: Four premolar extraction ──────────────────────────────────
  const scenarioC: TreatmentScenario = {
    id: 'seed-scenario-c',
    patientId: SEED_PATIENT_ID,
    name: 'Extraction 14/24/34/44',
    description: 'Four-premolar extraction with anchorage preparation',
    isPreferred: false,
    assumptions: { ...assumptions },
    clinicalNotes: 'Significant crowding in both arches. Four-premolar extraction plan.',
    createdAt: now,
    updatedAt: now,
    mechanics: [
      {
        id: 'seed-mech-c1',
        scenarioId: 'seed-scenario-c',
        type: 'EXTRACTION',
        arch: 'upper',
        parameters: {
          extractedTeeth: [14, 24],
          toothWidths: { 14: 7.0, 24: 7.0 },
          extractionUtilizationPercent: 50,
        },
        spaceEffect: 7.0,
      },
      {
        id: 'seed-mech-c2',
        scenarioId: 'seed-scenario-c',
        type: 'EXTRACTION',
        arch: 'lower',
        parameters: {
          extractedTeeth: [34, 44],
          toothWidths: { 34: 7.0, 44: 7.0 },
          extractionUtilizationPercent: 50,
        },
        spaceEffect: 7.0,
      },
    ],
  };

  return {
    patients: [patient],
    diagnostics: [diagnostic],
    scenarios: [scenarioA, scenarioB, scenarioC],
  };
}