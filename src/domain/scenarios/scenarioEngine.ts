// ═══════════════════════════════════════════════════════════════════════════
// Scenario Engine — Scenario duplication and management
// ═══════════════════════════════════════════════════════════════════════════

import type { TreatmentScenario } from '../types';

export function duplicateScenario(
  scenario: TreatmentScenario,
  newName: string,
): TreatmentScenario {
  const now = new Date().toISOString();

  return {
    ...scenario,
    id: crypto.randomUUID(),
    name: newName,
    isPreferred: false, // Duplicates are never preferred by default
    createdAt: now,
    updatedAt: now,
    mechanics: scenario.mechanics.map((m) => ({
      ...m,
      id: crypto.randomUUID(),
      scenarioId: '', // Will be set by caller
      parameters: { ...m.parameters },
    })),
    assumptions: { ...scenario.assumptions },
  };
}

export function reassignMechanicIds(
  scenario: TreatmentScenario,
  newScenarioId: string,
): TreatmentScenario {
  return {
    ...scenario,
    mechanics: scenario.mechanics.map((m) => ({
      ...m,
      scenarioId: newScenarioId,
    })),
  };
}