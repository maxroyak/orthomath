// ═══════════════════════════════════════════════════════════════════════════
// Warning Engine — Rule-based mathematical warnings
//
// Warnings are NOT clinical diagnoses. They flag mathematical inconsistencies
// for the clinician to review.
//
// Severity levels:
//   info    — informational note
//   review  — clinician should review biomechanical feasibility
//   conflict — mathematical inconsistency in the plan
// ═══════════════════════════════════════════════════════════════════════════

import type {
  TreatmentMechanic,
  SpaceBalanceResult,
  Warning,
  CalculationAssumptions,
  Arch,
} from '../types';
import {
  calculateExtractionTotalSpace,
  getExtractionAllocationTotal,
} from '../calculations/spaceBalance';

export function generateWarnings(
  balances: SpaceBalanceResult[],
  mechanics: TreatmentMechanic[],
  assumptions: CalculationAssumptions,
): Warning[] {
  const warnings: Warning[] = [];

  for (const balance of balances) {
    // ── Residual crowding ───────────────────────────────────────────────────
    if (balance.finalBalance < -assumptions.balancedTolerance) {
      warnings.push({
        id: `unresolved-${balance.arch}`,
        level: 'review',
        arch: balance.arch,
        message: `${balance.arch === 'upper' ? 'Upper' : 'Lower'} arch remains ${Math.abs(balance.finalBalance).toFixed(1)} mm deficient after all planned mechanics.`,
      });
    }

    // ── Excess space ────────────────────────────────────────────────────────
    if (balance.finalBalance > assumptions.balancedTolerance) {
      warnings.push({
        id: `excess-${balance.arch}`,
        level: 'review',
        arch: balance.arch,
        message: `${balance.arch === 'upper' ? 'Upper' : 'Lower'} arch has ${balance.finalBalance.toFixed(1)} mm of space remaining after planned mechanics. Confirm whether this space is intended for incisor retraction or other planned movement.`,
      });
    }
  }

  // ── Heavy dependency on one mechanic ──────────────────────────────────────
  for (const arch of ['upper', 'lower'] as Arch[]) {
    const archMechanics = mechanics.filter(
      (m) => m.arch === arch && m.spaceEffect > 0,
    );
    const totalSpaceCreated = archMechanics.reduce((s, m) => s + m.spaceEffect, 0);

    if (totalSpaceCreated > 0) {
      const byType = new Map<string, number>();
      for (const m of archMechanics) {
        byType.set(m.type, (byType.get(m.type) || 0) + m.spaceEffect);
      }

      for (const [type, amount] of byType) {
        const pct = (amount / totalSpaceCreated) * 100;
        if (pct > 60) {
          const label = type === 'IPR' ? 'IPR' :
            type === 'EXPANSION' ? 'expansion' :
            type === 'DISTALIZATION' ? 'distalization' :
            type === 'EXTRACTION' ? 'extraction' :
            type === 'INCISOR_MOVEMENT' ? 'incisor movement' : 'a custom mechanic';
          warnings.push({
            id: `dependency-${arch}-${type}`,
            level: 'info',
            arch,
            message: `${pct.toFixed(0)}% of generated space in this scenario depends on ${label}. Review biomechanical feasibility.`,
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
          level: 'review',
          arch: m.arch,
          message: `IPR value of ${m.parameters.iprPerContact} mm per contact exceeds the currently configured limit of ${assumptions.iprWarningThreshold} mm. Review clinical feasibility.`,
        });
      }
    }
  }

  // ── Extraction allocation warnings ────────────────────────────────────────
  for (const m of mechanics) {
    if (m.type === 'EXTRACTION') {
      const widths = Object.values(m.parameters.toothWidths || {});
      const totalSpace = calculateExtractionTotalSpace(widths);
      const allocationTotal = getExtractionAllocationTotal(m.parameters.extractionAllocation);
      const unallocated = totalSpace - allocationTotal;

      if (m.parameters.extractionAllocation) {
        if (unallocated > 0.01) {
          warnings.push({
            id: `extraction-unallocated-${m.id}`,
            level: 'info',
            arch: m.arch,
            message: `${unallocated.toFixed(1)} mm of extraction space remains unallocated.`,
          });
        } else if (unallocated < -0.01) {
          warnings.push({
            id: `extraction-overallocation-${m.id}`,
            level: 'conflict',
            arch: m.arch,
            message: `Planned extraction-space allocation exceeds available space by ${Math.abs(unallocated).toFixed(1)} mm. Review plan assumptions.`,
          });
        }
      } else if (totalSpace > 0) {
        // No allocation at all
        warnings.push({
          id: `extraction-no-allocation-${m.id}`,
          level: 'info',
          arch: m.arch,
          message: `${totalSpace.toFixed(1)} mm of extraction space has not been allocated.`,
        });
      }
    }
  }

  return warnings;
}