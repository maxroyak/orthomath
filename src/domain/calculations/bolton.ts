// ═══════════════════════════════════════════════════════════════════════════
// Bolton Analysis Calculation
//
// Bolton Overall Ratio = (Σ mandibular 12 / Σ maxillary 12) × 100
//   Reference: ~91.3%
// Bolton Anterior Ratio = (Σ mandibular anterior 6 / Σ maxillary anterior 6) × 100
//   Reference: ~77.2%
//
// Discrepancy status uses configurable thresholds — NOT biological constants.
// ═══════════════════════════════════════════════════════════════════════════

import type { ToothMeasurement } from '../types';

const UPPER_ANTERIOR_FDI = [13, 12, 11, 21, 22, 23];
const LOWER_ANTERIOR_FDI = [43, 42, 41, 31, 32, 33];
const UPPER_12_FDI = [16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26];
const LOWER_12_FDI = [46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36];

export const BOLTON_OVERALL_REFERENCE = 91.3;
export const BOLTON_ANTERIOR_REFERENCE = 77.2;

export type BoltonStatus = 'within_tolerance' | 'minor_discrepancy' | 'relevant_discrepancy';

export interface BoltonResult {
  overall: BoltonRatioResult | null;
  anterior: BoltonRatioResult | null;
  message: string;
}

export interface BoltonRatioResult {
  ratio: number;
  reference: number;
  difference: number;
  discrepancyMm: number;
  discrepancyDirection: 'maxillary_excess' | 'mandibular_excess' | 'none';
  /** Signed discrepancy: positive = mandibular excess, negative = maxillary excess */
  signedDiscrepancyMm: number;
  status: BoltonStatus;
}

function sumWidths(teeth: ToothMeasurement[], fdiSet: number[]): number {
  return fdiSet.reduce((sum, fdi) => {
    const tooth = teeth.find((t) => t.fdiNumber === fdi);
    return sum + (tooth?.mesiodistalWidth || 0);
  }, 0);
}

function findMissing(teeth: ToothMeasurement[], fdiSet: number[]): number[] {
  return fdiSet.filter((fdi) => !teeth.find((t) => t.fdiNumber === fdi));
}

export function classifyBoltonDiscrepancy(
  discrepancyMm: number,
  tolerance: number,
  relevantThreshold: number,
): BoltonStatus {
  const abs = Math.abs(discrepancyMm);
  if (abs <= tolerance) return 'within_tolerance';
  if (abs <= relevantThreshold) return 'minor_discrepancy';
  return 'relevant_discrepancy';
}

interface BoltonThresholds {
  boltonDiscrepancyTolerance: number;
  boltonRelevantThreshold: number;
}

export function calculateBolton(
  toothMeasurements: ToothMeasurement[],
  thresholds?: BoltonThresholds,
): BoltonResult {
  const tol = thresholds?.boltonDiscrepancyTolerance ?? 0.5;
  const rel = thresholds?.boltonRelevantThreshold ?? 1.5;

  if (toothMeasurements.length === 0) {
    return {
      overall: null,
      anterior: null,
      message: 'Bolton analysis cannot be calculated because no tooth measurements have been entered.',
    };
  }

  // ── Anterior ─────────────────────────────────────────────────────────────
  const missingAnterior = [
    ...findMissing(toothMeasurements, UPPER_ANTERIOR_FDI),
    ...findMissing(toothMeasurements, LOWER_ANTERIOR_FDI),
  ];

  let anterior: BoltonRatioResult | null = null;

  if (missingAnterior.length === 0) {
    const upperSum = sumWidths(toothMeasurements, UPPER_ANTERIOR_FDI);
    const lowerSum = sumWidths(toothMeasurements, LOWER_ANTERIOR_FDI);

    if (upperSum > 0) {
      const ratio = +((lowerSum / upperSum) * 100).toFixed(1);
      const difference = +(ratio - BOLTON_ANTERIOR_REFERENCE).toFixed(1);
      const signedDiscrepancyMm = +(lowerSum - (upperSum * BOLTON_ANTERIOR_REFERENCE / 100)).toFixed(2);

      anterior = {
        ratio,
        reference: BOLTON_ANTERIOR_REFERENCE,
        difference,
        discrepancyMm: Math.abs(signedDiscrepancyMm),
        signedDiscrepancyMm,
        discrepancyDirection:
          signedDiscrepancyMm > 0.01
            ? 'mandibular_excess'
            : signedDiscrepancyMm < -0.01
              ? 'maxillary_excess'
              : 'none',
        status: classifyBoltonDiscrepancy(signedDiscrepancyMm, tol, rel),
      };
    }
  }

  // ── Overall ──────────────────────────────────────────────────────────────
  const missingOverall = [
    ...findMissing(toothMeasurements, UPPER_12_FDI),
    ...findMissing(toothMeasurements, LOWER_12_FDI),
  ];

  let overall: BoltonRatioResult | null = null;

  if (missingOverall.length === 0) {
    const upperSum = sumWidths(toothMeasurements, UPPER_12_FDI);
    const lowerSum = sumWidths(toothMeasurements, LOWER_12_FDI);

    if (upperSum > 0) {
      const ratio = +((lowerSum / upperSum) * 100).toFixed(1);
      const difference = +(ratio - BOLTON_OVERALL_REFERENCE).toFixed(1);
      const signedDiscrepancyMm = +(lowerSum - (upperSum * BOLTON_OVERALL_REFERENCE / 100)).toFixed(2);

      overall = {
        ratio,
        reference: BOLTON_OVERALL_REFERENCE,
        difference,
        discrepancyMm: Math.abs(signedDiscrepancyMm),
        signedDiscrepancyMm,
        discrepancyDirection:
          signedDiscrepancyMm > 0.01
            ? 'mandibular_excess'
            : signedDiscrepancyMm < -0.01
              ? 'maxillary_excess'
              : 'none',
        status: classifyBoltonDiscrepancy(signedDiscrepancyMm, tol, rel),
      };
    }
  }

  // ── Message based on worst status ────────────────────────────────────────
  const allMissing = [...missingAnterior, ...missingOverall];
  let message = '';

  if (allMissing.length > 0) {
    const uniqueMissing = [...new Set(allMissing)];
    message = `Bolton analysis is incomplete — missing teeth: ${uniqueMissing.map((t) => `#${t}`).join(', ')}. Available ratios are shown below.`;
  } else {
    const results = [anterior, overall].filter((r): r is BoltonRatioResult => r !== null);
    const hasRelevant = results.some((r) => r.status === 'relevant_discrepancy');
    const hasMinor = results.some((r) => r.status === 'minor_discrepancy');

    if (hasRelevant) {
      message = 'Tooth-size discrepancy requires clinical review.';
    } else if (hasMinor) {
      message = 'Minor tooth-size discrepancy detected.';
    } else {
      message = 'Bolton ratios are within configured tolerance.';
    }
  }

  return { overall, anterior, message };
}