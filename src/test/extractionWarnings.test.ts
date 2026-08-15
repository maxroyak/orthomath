import { describe, it, expect } from 'vitest';
import { generateWarnings } from '../domain/warnings/warningEngine';
import type { SpaceBalanceResult, TreatmentMechanic, CalculationAssumptions } from '../domain/types';

const assumptions: CalculationAssumptions = {
  expansionCoefficient: 0.6,
  incisorAdvancementCoefficient: 2.0,
  incisorRetractionCoefficient: 2.0,
  extractionSpaceUtilization: 50,
  iprWarningThreshold: 0.5,
  balancedTolerance: 0.5,
};

function makeBalance(arch: 'upper' | 'lower', finalBalance: number): SpaceBalanceResult {
  return {
    arch,
    startingDiscrepancy: -5,
    totalSpaceCreated: 5 + finalBalance,
    totalSpaceConsumed: 0,
    finalBalance,
    mechanicEffects: [],
    status: Math.abs(finalBalance) <= 0.5 ? 'balanced' : Math.abs(finalBalance) <= 2.0 ? 'minor' : 'unresolved',
  };
}

describe('Extraction Allocation Warnings', () => {
  it('warns about unallocated extraction space', () => {
    const mechanics: TreatmentMechanic[] = [
      {
        id: 'm1', scenarioId: 's1', type: 'EXTRACTION', arch: 'upper',
        parameters: {
          extractedTeeth: [14, 24],
          toothWidths: { 14: 7.0, 24: 7.0 },
          extractionAllocation: { alignment: 6.0, incisorRetraction: 5.0, anchorageLoss: 1.5, other: 0.5 },
        },
        spaceEffect: 6.0,
      },
    ];
    const warnings = generateWarnings([makeBalance('upper', 0)], mechanics, assumptions);
    // 14.0 total - 13.0 allocated = 1.0 unallocated
    expect(warnings.some((w) => w.message.includes('unallocated'))).toBe(true);
  });

  it('warns about over-allocation', () => {
    const mechanics: TreatmentMechanic[] = [
      {
        id: 'm1', scenarioId: 's1', type: 'EXTRACTION', arch: 'upper',
        parameters: {
          extractedTeeth: [14, 24],
          toothWidths: { 14: 7.0, 24: 7.0 },
          extractionAllocation: { alignment: 10.0, incisorRetraction: 5.0 },
        },
        spaceEffect: 10.0,
      },
    ];
    const warnings = generateWarnings([makeBalance('upper', 0)], mechanics, assumptions);
    expect(warnings.some((w) => w.message.includes('exceeds available'))).toBe(true);
    expect(warnings.some((w) => w.level === 'conflict')).toBe(true);
  });

  it('does not warn when fully allocated', () => {
    const mechanics: TreatmentMechanic[] = [
      {
        id: 'm1', scenarioId: 's1', type: 'EXTRACTION', arch: 'upper',
        parameters: {
          extractedTeeth: [14, 24],
          toothWidths: { 14: 7.0, 24: 7.0 },
          extractionAllocation: { alignment: 6.0, incisorRetraction: 5.0, anchorageLoss: 2.0, other: 1.0 },
        },
        spaceEffect: 6.0,
      },
    ];
    const warnings = generateWarnings([makeBalance('upper', 0)], mechanics, assumptions);
    expect(warnings.some((w) => w.message.includes('unallocated'))).toBe(false);
    expect(warnings.some((w) => w.message.includes('exceeds'))).toBe(false);
  });

  it('warns when no allocation exists', () => {
    const mechanics: TreatmentMechanic[] = [
      {
        id: 'm1', scenarioId: 's1', type: 'EXTRACTION', arch: 'upper',
        parameters: {
          extractedTeeth: [14, 24],
          toothWidths: { 14: 7.0, 24: 7.0 },
        },
        spaceEffect: 7.0,
      },
    ];
    const warnings = generateWarnings([makeBalance('upper', 0)], mechanics, assumptions);
    expect(warnings.some((w) => w.message.includes('not been allocated'))).toBe(true);
  });
});