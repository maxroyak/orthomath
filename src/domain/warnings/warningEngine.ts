// ═══════════════════════════════════════════════════════════════════════════
// Warning Engine — Rule-based mathematical warnings
//
// Warnings are NOT clinical diagnoses. They flag mathematical inconsistencies
// for the clinician to review.
// ═══════════════════════════════════════════════════════════════════════════

import type {
  TreatmentMechanic,
  SpaceBalanceResult,
  Warning,
  CalculationAssumptions,
  Arch,
} from '../types';

export function generateWarnings(
  balances: SpaceBalanceResult[],
  mechanics: TreatmentMechanic[],
  assumptions: CalculationAssumptions,
): Warning[] {
  const warnings: Warning[] = [];

  for (const balance of balances) {
    // ── Unresolved crowding ──────────────────────────────────────────────────
    if (balance.finalBalance < -assumptions.balancedTolerance) {
      warnings.push({
        id: `unresolved-${balance.arch}`,
        level: 'warning',
        arch: balance.arch,
        message: `${balance.arch === 'upper' ? 'Upper' : 'Lower'} arch remains ${Math.abs(balance.finalBalance).toFixed(1)} mm deficient after all planned mechanics.`,
      });
    }

    // ── Excess space ─────────────────────────────────────────────────────────
    if (balance.finalBalance > assumptions.balancedTolerance) {
      warnings.push({
        id: `excess-${balance.arch}`,
        level: 'warning',
        arch: balance.arch,
        message: `${balance.arch === 'upper' ? 'Upper' : 'Lower'} arch shows +${balance.finalBalance.toFixed(1)} mm remaining space. Confirm whether this space is intended for incisor retraction or other planned movement.`,
      });
    }
  }

  // ── Excessive dependency on one mechanic ──────────────────────────────────
  for (const arch of ['upper', 'lower'] as Arch[]) {
    const archMechanics = mechanics.filter(
      (m) => m.arch === arch && m.spaceEffect > 0,
    );
    const totalSpaceCreated = archMechanics.reduce((s, m) => s + m.spaceEffect, 0);

    if (totalSpaceCreated > 0) {
      // Group by type
      const byType = new Map<string, number>();
      for (const m of archMechanics) {
        byType.set(m.type, (byType.get(m.type) || 0) + m.spaceEffect);
      }

      for (const [type, amount] of byType) {
        const pct = (amount / totalSpaceCreated) * 100;
        if (pct > 60) {
          const label = type === 'IPR' ? 'IPR' :
            type === 'EXPANSION' ? 'Expansion' :
            type === 'DISTALIZATION' ? 'Distalization' :
            type === 'EXTRACTION' ? 'Extraction' :
            type === 'INCISOR_MOVEMENT' ? 'Incisor movement' : 'Custom mechanic';
          warnings.push({
            id: `dependency-${arch}-${type}`,
            level: 'info',
            arch,
            message: `${pct.toFixed(0)}% of required space in the ${arch} arch is expected from ${label}. Review biomechanical feasibility.`,
          });
        }
      }
    }
  }

  // ── IPR warning ───────────────────────────────────────────────────────────
  for (const m of mechanics) {
    if (m.type === 'IPR' && m.parameters.iprPerContact) {
      if (m.parameters.iprPerContact > assumptions.iprWarningThreshold) {
        warnings.push({
          id: `ipr-limit-${m.id}`,
          level: 'warning',
          arch: m.arch,
          message: `IPR value of ${m.parameters.iprPerContact} mm per contact exceeds the configured limit of ${assumptions.iprWarningThreshold} mm. Review biomechanical feasibility.`,
        });
      }
    }
  }

  return warnings;
}