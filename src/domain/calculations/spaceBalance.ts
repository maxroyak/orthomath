// ═══════════════════════════════════════════════════════════════════════════
// Space Balance Calculation Engine
//
// finalBalance = startingDiscrepancy + Σ(spaceEffects)
//
// Convention:
//   negative = crowding / space deficiency
//   positive = excess space
// ═══════════════════════════════════════════════════════════════════════════

import type {
  Arch,
  TreatmentMechanic,
  SpaceBalanceResult,
  MechanicEffectBreakdown,
  BalanceStatus,
  CalculationAssumptions,
  ExtractionAllocation,
  ToothMeasurement,
} from '../types';

export function calculateSpaceBalance(
  startingDiscrepancy: number,
  mechanics: TreatmentMechanic[],
  arch: Arch,
  tolerance: number = 0.5,
  minorThreshold: number = 2.0,
): SpaceBalanceResult {
  const archMechanics = mechanics.filter((m) => m.arch === arch);

  const breakdowns: MechanicEffectBreakdown[] = archMechanics.map((m) => ({
    mechanicId: m.id,
    type: m.type,
    label: mechanicLabel(m),
    spaceEffect: m.spaceEffect,
  }));

  const totalSpaceCreated = archMechanics
    .filter((m) => m.spaceEffect > 0)
    .reduce((sum, m) => sum + m.spaceEffect, 0);

  const totalSpaceConsumed = archMechanics
    .filter((m) => m.spaceEffect < 0)
    .reduce((sum, m) => sum + Math.abs(m.spaceEffect), 0);

  const finalBalance = startingDiscrepancy + archMechanics.reduce((s, m) => s + m.spaceEffect, 0);

  return {
    arch,
    startingDiscrepancy,
    totalSpaceCreated,
    totalSpaceConsumed,
    finalBalance,
    mechanicEffects: breakdowns,
    status: classifyBalance(finalBalance, tolerance, minorThreshold),
  };
}

export function classifyBalance(
  balance: number,
  tolerance: number,
  minorThreshold: number,
): BalanceStatus {
  const abs = Math.abs(balance);
  if (abs <= tolerance) return 'balanced';
  if (abs <= minorThreshold) return 'minor';
  return 'unresolved';
}

export function mechanicLabel(m: TreatmentMechanic): string {
  switch (m.type) {
    case 'IPR':
      return 'IPR';
    case 'EXPANSION':
      return 'Expansion';
    case 'DISTALIZATION':
      return 'Distalization';
    case 'EXTRACTION':
      return 'Extraction';
    case 'INCISOR_MOVEMENT':
      return m.parameters.incisorMovement && m.parameters.incisorMovement > 0
        ? 'Incisor Advancement'
        : 'Incisor Retraction';
    case 'CUSTOM':
      return m.parameters.customName || 'Custom Adjustment';
    default:
      return 'Unknown';
  }
}

// ── Individual Mechanic Space Effect Calculations ──────────────────────────

export function calculateIPREffect(
  iprPerContact: number,
  numberOfContacts: number,
): number {
  if (iprPerContact < 0 || numberOfContacts < 0) return 0;
  return +(iprPerContact * numberOfContacts).toFixed(2);
}

export function calculateExpansionEffect(
  mode: 'manual' | 'calculated',
  expansionAmount: number,
  coefficient: number,
  manualSpaceGain: number,
): number {
  if (mode === 'manual') return manualSpaceGain;
  return +(expansionAmount * coefficient).toFixed(2);
}

export function calculateDistalizationEffect(
  rightDistalization: number,
  leftDistalization: number,
  expectedUsableSpace?: number,
): number {
  const potential = rightDistalization + leftDistalization;
  if (expectedUsableSpace !== undefined) return expectedUsableSpace;
  return potential;
}

export function calculateExtractionTotalSpace(
  toothWidths: number[],
): number {
  return toothWidths.reduce((s, w) => s + w, 0);
}

export function calculateExtractionEffect(
  toothWidths: number[],
  utilizationPercent: number,
): number {
  const totalSpace = calculateExtractionTotalSpace(toothWidths);
  return +((totalSpace * utilizationPercent) / 100).toFixed(2);
}

// ── Extraction Allocation ──────────────────────────────────────────────────

export function getExtractionAllocationTotal(allocation: ExtractionAllocation | undefined): number {
  if (!allocation) return 0;
  return (allocation.alignment || 0) +
    (allocation.incisorRetraction || 0) +
    (allocation.anchorageLoss || 0) +
    (allocation.molarMovement || 0) +
    (allocation.other || 0);
}

export function getExtractionUnallocated(
  totalExtractionSpace: number,
  allocation: ExtractionAllocation | undefined,
): number {
  return +(totalExtractionSpace - getExtractionAllocationTotal(allocation)).toFixed(2);
}

export function getExtractionSpaceForAlignment(
  totalExtractionSpace: number,
  allocation: ExtractionAllocation | undefined,
): number {
  // If allocation exists, the space effect is the alignment portion
  if (allocation) {
    return allocation.alignment || 0;
  }
  // Without allocation, use utilization percent approach (legacy)
  return totalExtractionSpace;
}

export function calculateIncisorMovementEffect(
  movement: number,
  coefficient: number,
): number {
  return +(movement * coefficient).toFixed(2);
}

export function calculateCustomEffect(spaceEffect: number): number {
  return spaceEffect;
}

// ── Mechanic Space Effect Resolver ─────────────────────────────────────────

export function resolveMechanicSpaceEffect(
  mechanic: TreatmentMechanic,
  assumptions: CalculationAssumptions,
): number {
  const p = mechanic.parameters;
  switch (mechanic.type) {
    case 'IPR':
      return calculateIPREffect(p.iprPerContact || 0, p.numberOfContacts || 0);
    case 'EXPANSION':
      return calculateExpansionEffect(
        p.expansionMode || 'calculated',
        p.expansionAmount || 0,
        p.expansionCoefficient ?? assumptions.expansionCoefficient,
        p.manualSpaceGain || 0,
      );
    case 'DISTALIZATION':
      return calculateDistalizationEffect(
        p.rightDistalization || 0,
        p.leftDistalization || 0,
        p.expectedUsableSpace,
      );
    case 'EXTRACTION': {
      const widths = Object.values(p.toothWidths || {});
      // If allocation exists, space effect = alignment portion
      if (p.extractionAllocation) {
        return p.extractionAllocation.alignment || 0;
      }
      // Without allocation, use utilization percent
      return calculateExtractionEffect(widths, p.extractionUtilizationPercent ?? assumptions.extractionSpaceUtilization);
    }
    case 'INCISOR_MOVEMENT':
      return calculateIncisorMovementEffect(
        p.incisorMovement || 0,
        p.incisorMovement && p.incisorMovement > 0
          ? (p.incisorCoefficient ?? assumptions.incisorAdvancementCoefficient)
          : (p.incisorCoefficient ?? assumptions.incisorRetractionCoefficient),
      );
    case 'CUSTOM':
      return calculateCustomEffect(p.customSpaceEffect || 0);
    default:
      return 0;
  }
}

// ── Tooth Width Lookup ────────────────────────────────────────────────────

export function getToothWidth(
  fdiNumber: number,
  toothMeasurements: ToothMeasurement[],
): number | undefined {
  const tooth = toothMeasurements.find((t) => t.fdiNumber === fdiNumber);
  return tooth?.mesiodistalWidth;
}

export function getToothWidthsForExtraction(
  extractedTeeth: number[],
  toothMeasurements: ToothMeasurement[],
  manualWidths?: Record<number, number>,
): Record<number, number> {
  const result: Record<number, number> = {};
  for (const fdi of extractedTeeth) {
    const measured = getToothWidth(fdi, toothMeasurements);
    if (measured !== undefined) {
      result[fdi] = measured;
    } else if (manualWidths?.[fdi] !== undefined) {
      result[fdi] = manualWidths[fdi];
    }
  }
  return result;
}