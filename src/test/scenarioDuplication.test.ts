import { describe, it, expect } from 'vitest';
import { duplicateScenario, reassignMechanicIds } from '../domain/scenarios/scenarioEngine';
import type { TreatmentScenario, CalculationAssumptions } from '../domain/types';

const assumptions: CalculationAssumptions = {
  expansionCoefficient: 0.6,
  incisorAdvancementCoefficient: 2.0,
  incisorRetractionCoefficient: 2.0,
  extractionSpaceUtilization: 50,
  iprWarningThreshold: 0.5,
  balancedTolerance: 0.5,
};

const original: TreatmentScenario = {
  id: 'original-id',
  patientId: 'patient-1',
  name: 'Scenario A',
  isPreferred: true,
  mechanics: [
    { id: 'm1', scenarioId: 'original-id', type: 'IPR', arch: 'upper', parameters: { iprPerContact: 0.2, numberOfContacts: 10 }, spaceEffect: 2.0 },
    { id: 'm2', scenarioId: 'original-id', type: 'EXPANSION', arch: 'upper', parameters: { expansionAmount: 3, expansionCoefficient: 0.6 }, spaceEffect: 1.8 },
  ],
  assumptions: { ...assumptions },
  clinicalNotes: 'Test notes',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('Scenario Duplication', () => {
  it('creates a copy with new ID', () => {
    const dup = duplicateScenario(original, 'Scenario A copy');
    expect(dup.id).not.toBe(original.id);
    expect(dup.name).toBe('Scenario A copy');
  });

  it('duplicate is not preferred', () => {
    const dup = duplicateScenario(original, 'copy');
    expect(dup.isPreferred).toBe(false);
  });

  it('mechanics get new IDs', () => {
    const dup = duplicateScenario(original, 'copy');
    dup.mechanics.forEach((m) => {
      expect(m.id).not.toBe('m1');
      expect(m.id).not.toBe('m2');
    });
  });

  it('assumptions are copied', () => {
    const dup = duplicateScenario(original, 'copy');
    expect(dup.assumptions).toEqual(original.assumptions);
    expect(dup.assumptions).not.toBe(original.assumptions); // Different reference
  });

  it('reassignMechanicIds updates scenarioId', () => {
    const dup = duplicateScenario(original, 'copy');
    const reassigned = reassignMechanicIds(dup, 'new-scenario-id');
    reassigned.mechanics.forEach((m) => {
      expect(m.scenarioId).toBe('new-scenario-id');
    });
  });
});
