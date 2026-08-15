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

describe('Warning Engine', () => {
  it('warns about unresolved crowding', () => {
    const warnings = generateWarnings([makeBalance('upper', -2.3)], [], assumptions);
    expect(warnings.some((w) => w.message.includes('Upper arch remains'))).toBe(true);
  });

  it('warns about excess space', () => {
    const warnings = generateWarnings([makeBalance('upper', 4.8)], [], assumptions);
    expect(warnings.some((w) => w.message.includes('remaining space'))).toBe(true);
  });

  it('does not warn when balanced', () => {
    const warnings = generateWarnings([makeBalance('upper', 0.0)], [], assumptions);
    expect(warnings.some((w) => w.arch === 'upper' && w.level === 'warning')).toBe(false);
  });

  it('warns about IPR exceeding threshold', () => {
    const mechanics: TreatmentMechanic[] = [
      { id: 'm1', scenarioId: 's1', type: 'IPR', arch: 'upper', parameters: { iprPerContact: 0.8, numberOfContacts: 5 }, spaceEffect: 4.0 },
    ];
    const warnings = generateWarnings([makeBalance('upper', 0)], mechanics, assumptions);
    expect(warnings.some((w) => w.message.includes('IPR value of 0.8'))).toBe(true);
  });

  it('does not warn about IPR within threshold', () => {
    const mechanics: TreatmentMechanic[] = [
      { id: 'm1', scenarioId: 's1', type: 'IPR', arch: 'upper', parameters: { iprPerContact: 0.3, numberOfContacts: 5 }, spaceEffect: 1.5 },
    ];
    const warnings = generateWarnings([makeBalance('upper', 0)], mechanics, assumptions);
    expect(warnings.some((w) => w.message.includes('IPR value'))).toBe(false);
  });

  it('warns about excessive dependency on one mechanic', () => {
    const mechanics: TreatmentMechanic[] = [
      { id: 'm1', scenarioId: 's1', type: 'EXPANSION', arch: 'upper', parameters: {}, spaceEffect: 4.0 },
      { id: 'm2', scenarioId: 's1', type: 'IPR', arch: 'upper', parameters: {}, spaceEffect: 1.0 },
    ];
    const warnings = generateWarnings([makeBalance('upper', 0)], mechanics, assumptions);
    expect(warnings.some((w) => w.message.includes('Expansion') && w.message.includes('%'))).toBe(true);
  });

  it('generates warnings for both arches', () => {
    const warnings = generateWarnings(
      [makeBalance('upper', -3.0), makeBalance('lower', 3.0)],
      [],
      assumptions,
    );
    expect(warnings.some((w) => w.arch === 'upper')).toBe(true);
    expect(warnings.some((w) => w.arch === 'lower')).toBe(true);
  });
});
