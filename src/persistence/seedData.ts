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
  // Upper: -6.4 + 1.8 + 2.0 + 2.5 = -0.1 (balanced)
  // Lower: -4.2 + 2.0 + 2.2 = 0.0 (balanced)
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
        parameters: { expansionMode: 'calculated', expansionAmount: 3.0, expansionCoefficient: 0.6 },
        spaceEffect: 1.8,
      },
      {
        id: 'seed-mech-a2',
        scenarioId: 'seed-scenario-a',
        type: 'IPR',
        arch: 'upper',
        parameters: { iprPerContact: 0.2, numberOfContacts: 10 },
        spaceEffect: 2.0,
      },
      {
        id: 'seed-mech-a3',
        scenarioId: 'seed-scenario-a',
        type: 'DISTALIZATION',
        arch: 'upper',
        parameters: { rightDistalization: 1.5, leftDistalization: 1.5, expectedUsableSpace: 2.5 },
        spaceEffect: 2.5,
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
        parameters: { incisorMovement: 1.1, incisorCoefficient: 2.0 },
        spaceEffect: 2.2,
      },
    ],
  };

  // ── Scenario B: Extraction 14/24 ──────────────────────────────────────────
  // Upper: 14 + 24 = 7.0 + 7.0 = 14.0 mm extraction space
  // Allocation: alignment 6.4, incisor retraction 5.0, anchorage 1.5, other 0.5 = 13.4
  // Unallocated: 0.6 mm (demonstrates warning)
  // Space effect for alignment = 6.4 → -6.4 + 6.4 = 0.0 (balanced)
  // Lower: -4.2 + 2.0 + 2.2 = 0.0 (balanced)
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
          extractionAllocation: {
            alignment: 6.4,
            incisorRetraction: 5.0,
            anchorageLoss: 1.5,
            other: 0.5,
          },
        },
        spaceEffect: 6.4, // alignment portion
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
        parameters: { incisorMovement: 1.1, incisorCoefficient: 2.0 },
        spaceEffect: 2.2,
      },
    ],
  };

  // ── Scenario C: Four premolar extraction ──────────────────────────────────
  // Upper: 14+24 = 14.0, allocation: alignment 6.4, incisor retraction 4.0, anchorage 2.0, other 1.0 = 13.4
  // Unallocated: 0.6 → -6.4 + 6.4 = 0.0
  // Lower: 34+44 = 7.0+7.0 = 14.0, allocation: alignment 4.2, incisor retraction 5.0, anchorage 3.0, other 1.5 = 13.7
  // Unallocated: 0.3 → -4.2 + 4.2 = 0.0
  const scenarioC: TreatmentScenario = {
    id: 'seed-scenario-c',
    patientId: SEED_PATIENT_ID,
    name: 'Four-premolar extraction',
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
          extractionAllocation: {
            alignment: 6.4,
            incisorRetraction: 4.0,
            anchorageLoss: 2.0,
            other: 1.0,
          },
        },
        spaceEffect: 6.4,
      },
      {
        id: 'seed-mech-c2',
        scenarioId: 'seed-scenario-c',
        type: 'EXTRACTION',
        arch: 'lower',
        parameters: {
          extractedTeeth: [34, 44],
          toothWidths: { 34: 7.0, 44: 7.0 },
          extractionAllocation: {
            alignment: 4.2,
            incisorRetraction: 5.0,
            anchorageLoss: 3.0,
            other: 1.5,
          },
        },
        spaceEffect: 4.2,
      },
    ],
  };

  return {
    patients: [patient],
    diagnostics: [diagnostic],
    scenarios: [scenarioA, scenarioB, scenarioC],
  };
}