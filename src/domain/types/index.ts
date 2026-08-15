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
  dateOfBirth?: string; // ISO date or undefined if age used directly
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
  /** Manual entry: crowding (negative) or spacing (positive) in mm */
  crowdingSpacing?: number;
  /** Available arch perimeter in mm (optional detailed mode) */
  archPerimeter?: number;
  /** Required tooth material in mm (optional detailed mode) */
  toothMaterial?: number;
}

export interface DiagnosticRecord {
  id: string;
  patientId: string;
  archMeasurements: ArchMeasurement[];
  toothMeasurements: ToothMeasurement[];
  cephalometric: CephalometricValues;
  /** Whether to include Bolton analysis */
  includeBolton: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Tooth Measurements ─────────────────────────────────────────────────────

// FDI numbering system. Upper right: 11-17, upper left: 21-27,
// lower left: 31-37, lower right: 41-47
export interface ToothMeasurement {
  id: string;
  fdiNumber: number;
  arch: Arch;
  mesiodistalWidth: number; // mm
}

// ── Cephalometric / Optional Diagnostic Values ─────────────────────────────
// Stored but not yet used by the calculation engine. Future-proofing.

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
  /** Calculated space effect in mm. Positive = creates space, negative = consumes */
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
  extractedTeeth?: number[]; // FDI numbers
  toothWidths?: Record<number, number>; // fallback manual widths
  extractionUtilizationPercent?: number;
  // Incisor movement
  incisorMovement?: number; // mm, positive=advancement, negative=retraction
  incisorCoefficient?: number;
  // Custom
  customName?: string;
  customSpaceEffect?: number;
}

// Use the concrete type for parameters
export type MechanicParameters = MechanismParameters;

// ── Calculation Assumptions ────────────────────────────────────────────────

export interface CalculationAssumptions {
  expansionCoefficient: number;
  incisorAdvancementCoefficient: number;
  incisorRetractionCoefficient: number;
  extractionSpaceUtilization: number; // percentage 0-100
  iprWarningThreshold: number; // mm per contact
  balancedTolerance: number; // ±mm
}

// ── User Settings ──────────────────────────────────────────────────────────

export interface UserSettings {
  defaultAssumptions: CalculationAssumptions;
  balancedTolerance: number; // ±mm for green/yellow/red
  minorDiscrepancyThreshold: number; // beyond this = red
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

export interface Warning {
  id: string;
  level: 'info' | 'warning';
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