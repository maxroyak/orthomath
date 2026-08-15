import { describe, it, expect } from 'vitest';
import {
  calculateSpaceBalance,
  calculateIPREffect,
  calculateExpansionEffect,
  calculateDistalizationEffect,
  calculateExtractionEffect,
  calculateIncisorMovementEffect,
  classifyBalance,
} from '../domain/calculations/spaceBalance';
import type { TreatmentMechanic } from '../domain/types';

describe('Space Balance', () => {
  it('calculates basic space balance with crowding', () => {
    const result = calculateSpaceBalance(-8.4, [], 'upper');
    expect(result.finalBalance).toBe(-8.4);
    expect(result.status).toBe('unresolved');
  });

  it('calculates balance with mechanics that resolve crowding', () => {
    const mechanics: TreatmentMechanic[] = [
      { id: '1', scenarioId: 's1', type: 'EXPANSION', arch: 'upper', parameters: {}, spaceEffect: 2.1 },
      { id: '2', scenarioId: 's1', type: 'IPR', arch: 'upper', parameters: {}, spaceEffect: 2.8 },
      { id: '3', scenarioId: 's1', type: 'DISTALIZATION', arch: 'upper', parameters: {}, spaceEffect: 2.0 },
      { id: '4', scenarioId: 's1', type: 'INCISOR_MOVEMENT', arch: 'upper', parameters: {}, spaceEffect: 1.3 },
    ];
    const result = calculateSpaceBalance(-8.4, mechanics, 'upper');
    expect(result.finalBalance).toBeCloseTo(-0.2, 1);
    expect(result.status).toBe('balanced');
  });

  it('classifies balanced within tolerance', () => {
    expect(classifyBalance(0, 0.5, 2.0)).toBe('balanced');
    expect(classifyBalance(0.5, 0.5, 2.0)).toBe('balanced');
    expect(classifyBalance(-0.5, 0.5, 2.0)).toBe('balanced');
  });

  it('classifies minor discrepancy', () => {
    expect(classifyBalance(0.6, 0.5, 2.0)).toBe('minor');
    expect(classifyBalance(2.0, 0.5, 2.0)).toBe('minor');
    expect(classifyBalance(-2.0, 0.5, 2.0)).toBe('minor');
  });

  it('classifies unresolved discrepancy', () => {
    expect(classifyBalance(2.1, 0.5, 2.0)).toBe('unresolved');
    expect(classifyBalance(-2.1, 0.5, 2.0)).toBe('unresolved');
  });

  it('handles positive spacing', () => {
    const result = calculateSpaceBalance(3.0, [], 'upper');
    expect(result.finalBalance).toBe(3.0);
    expect(result.status).toBe('unresolved');
  });

  it('handles zero crowding', () => {
    const result = calculateSpaceBalance(0, [], 'upper');
    expect(result.finalBalance).toBe(0);
    expect(result.status).toBe('balanced');
  });
});

describe('IPR Calculation', () => {
  it('calculates IPR effect correctly', () => {
    expect(calculateIPREffect(0.2, 10)).toBe(2.0);
  });

  it('calculates IPR with decimal values', () => {
    expect(calculateIPREffect(0.25, 8)).toBe(2.0);
  });

  it('handles zero contacts', () => {
    expect(calculateIPREffect(0.3, 0)).toBe(0);
  });

  it('handles zero IPR per contact', () => {
    expect(calculateIPREffect(0, 10)).toBe(0);
  });

  it('handles negative values as zero', () => {
    expect(calculateIPREffect(-0.5, 10)).toBe(0);
  });
});

describe('Expansion Calculation', () => {
  it('calculates expansion with coefficient', () => {
    expect(calculateExpansionEffect('calculated', 3.0, 0.6, 0)).toBe(1.8);
  });

  it('returns manual space gain in manual mode', () => {
    expect(calculateExpansionEffect('manual', 3.0, 0.6, 1.5)).toBe(1.5);
  });

  it('handles zero expansion', () => {
    expect(calculateExpansionEffect('calculated', 0, 0.6, 0)).toBe(0);
  });
});

describe('Distalization Calculation', () => {
  it('sums right and left', () => {
    expect(calculateDistalizationEffect(1.5, 1.5)).toBe(3.0);
  });

  it('uses expected usable space when provided', () => {
    expect(calculateDistalizationEffect(1.5, 1.5, 2.4)).toBe(2.4);
  });

  it('handles zeros', () => {
    expect(calculateDistalizationEffect(0, 0)).toBe(0);
  });
});

describe('Extraction Calculation', () => {
  it('applies utilization percentage', () => {
    expect(calculateExtractionEffect([7.0, 7.0], 50)).toBe(7.0);
  });

  it('handles 100% utilization', () => {
    expect(calculateExtractionEffect([7.0, 7.0], 100)).toBe(14.0);
  });

  it('handles 0% utilization', () => {
    expect(calculateExtractionEffect([7.0, 7.0], 0)).toBe(0);
  });

  it('handles single tooth', () => {
    expect(calculateExtractionEffect([7.5], 50)).toBe(3.75);
  });
});

describe('Incisor Movement Calculation', () => {
  it('advancement creates space', () => {
    expect(calculateIncisorMovementEffect(1.0, 2.0)).toBe(2.0);
  });

  it('retraction consumes space', () => {
    expect(calculateIncisorMovementEffect(-1.0, 2.0)).toBe(-2.0);
  });

  it('handles zero movement', () => {
    expect(calculateIncisorMovementEffect(0, 2.0)).toBe(0);
  });
});
