// ═══════════════════════════════════════════════════════════════════════════
// OrthoMath — Core Domain Types
// ═══════════════════════════════════════════════════════════════════════════

export type Arch = 'upper' | 'lower';
export type Sex = 'male' | 'female' | 'unspecified';
export type DentitionStage = 'mixed' | 'permanent';

// ── Patient ────────────────────────────────────────────────────────────────

export interface Patient {
  id: string;
  name: string;
  dateOfBirth?: string;
  age?: number;
  sex: Sex;
  dentitionStage: DentitionStage;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Diagnostic Record ──────────────────────────────────────────────────────

export interface ArchMeasurement {
  arch: Arch;
  crowdingSpacing?: number;
  archPerimeter?: number;
  toothMaterial?: number;
}

export interface DiagnosticRecord {
  id: string;
  patientId: string;
  archMeasurements: ArchMeasurement[];
  toothMeasurements: ToothMeasurement[];
  cephalometric: CephalometricValues;
  includeBolton: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Tooth Measurements ─────────────────────────────────────────────────────

export interface ToothMeasurement {
  id: string;
  fdiNumber: number;
  arch: Arch;
  mesiodistalWidth: number;
}

// ── Cephalometric / Optional Diagnostic Values ─────────────────────────────

export interface CephalometricValues {
  SNA?: number;
  SNB?: number;
  ANB?: number;
  Wits?: number;
  FMA?: number;
  'SN-MP'?: number;
  IMPA?: number;
  'U1-SN'?: number;
  overjet?: number;
  overbite?: number;
  upperMidlineDeviation?: number;
  lowerMidlineDeviation?: number;
  molarRelationshipRight?: string;
  molarRelationshipLeft?: string;
  canineRelationshipRight?: string;
  canineRelationshipLeft?: string;
}

// ── Treatment Scenario ─────────────────────────────────────────────────────

export interface TreatmentScenario {
  id: string;
  patientId: string;
  name: string;
  description?: string;
  isPreferred: boolean;
  mechanics: TreatmentMechanic[];
  clinicalNotes?: string;
  assumptions: CalculationAssumptions;
  createdAt: string;
  updatedAt: string;
}

// ── Mechanics ──────────────────────────────────────────────────────────────

export type MechanicType =
  | 'IPR'
  | 'EXPANSION'
  | 'DISTALIZATION'
  | 'EXTRACTION'
  | 'INCISOR_MOVEMENT'
  | 'CUSTOM';

export interface TreatmentMechanic {
  id: string;
  scenarioId: string;
  type: MechanicType;
  arch: Arch;
  parameters: MechanicParameters;
  spaceEffect: number;
}

export interface MechanismParameters {
  // IPR
  iprPerContact?: number;
  numberOfContacts?: number;
  // Expansion
  expansionAmount?: number;
  expansionCoefficient?: number;
  expansionMode?: 'manual' | 'calculated';
  manualSpaceGain?: number;
  // Distalization
  rightDistalization?: number;
  leftDistalization?: number;
  expectedUsableSpace?: number;
  // Extraction
  extractedTeeth?: number[];
  toothWidths?: Record<number, number>;
  extractionUtilizationPercent?: number;
  extractionAllocation?: ExtractionAllocation;
  // Incisor movement
  incisorMovement?: number;
  incisorCoefficient?: number;
  // Custom
  customName?: string;
  customSpaceEffect?: number;
}

export type MechanicParameters = MechanismParameters;

// ── Extraction Space Allocation ────────────────────────────────────────────

export interface ExtractionAllocation {
  alignment?: number;
  incisorRetraction?: number;
  anchorageLoss?: number;
  molarMovement?: number;
  other?: number;
}

// ── Calculation Assumptions (snapshot per scenario) ────────────────────────

export interface CalculationAssumptions {
  expansionCoefficient: number;
  incisorAdvancementCoefficient: number;
  incisorRetractionCoefficient: number;
  extractionSpaceUtilization: number;
  iprWarningThreshold: number;
  balancedTolerance: number;
}

// ── User Settings ──────────────────────────────────────────────────────────

export interface UserSettings {
  defaultAssumptions: CalculationAssumptions;
  balancedTolerance: number;
  minorDiscrepancyThreshold: number;
  boltonDiscrepancyTolerance: number;   // mm — below this = "within tolerance"
  boltonRelevantThreshold: number;       // mm — above this = "requires clinical review"
}

// ── Calculation Results ────────────────────────────────────────────────────

export interface SpaceBalanceResult {
  arch: Arch;
  startingDiscrepancy: number;
  totalSpaceCreated: number;
  totalSpaceConsumed: number;
  finalBalance: number;
  mechanicEffects: MechanicEffectBreakdown[];
  status: BalanceStatus;
}

export interface MechanicEffectBreakdown {
  mechanicId: string;
  type: MechanicType;
  label: string;
  spaceEffect: number;
}

export type BalanceStatus = 'balanced' | 'minor' | 'unresolved';

// ── Warnings ───────────────────────────────────────────────────────────────

export type WarningLevel = 'info' | 'review' | 'conflict';

export interface Warning {
  id: string;
  level: WarningLevel;
  arch?: Arch;
  message: string;
}

// ── Condylography (Future Module — data model only) ────────────────────────

export interface CondylographyData {
  sciRight?: number;
  sciLeft?: number;
  tciRight?: number;
  tciLeft?: number;
  protrusionPathway?: string;
  mediotrusion?: string;
  retrusion?: string;
  therapeuticPosition?: string;
  anteriorDisplacement?: number;
  verticalDisplacement?: number;
  transverseDisplacement?: number;
  tmjMriFindings?: string;
  discPosition?: string;
  reciprocalClicking?: string;
  pain?: string;
  functionalNotes?: string;
}