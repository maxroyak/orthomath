// ═══════════════════════════════════════════════════════════════════════════
// Bolton Analysis Calculation
//
// Bolton Overall Ratio = (Σ mandibular 12 / Σ maxillary 12) × 100
//   Reference: ~91.3%
// Bolton Anterior Ratio = (Σ mandibular anterior 6 / Σ maxillary anterior 6) × 100
//   Reference: ~77.2%
// ═══════════════════════════════════════════════════════════════════════════

import type { ToothMeasurement } from '../types';

// FDI numbering:
// Upper anterior: 13,12,11,21,22,23
// Lower anterior: 43,42,41,31,32,33
// Upper 12: 17,16,15,14,13,12,11,21,22,23,24,25,26,27
// Lower 12: 47,46,45,44,43,42,41,31,32,33,34,35,36,37

const UPPER_ANTERIOR_FDI = [13, 12, 11, 21, 22, 23];
const LOWER_ANTERIOR_FDI = [43, 42, 41, 31, 32, 33];
const UPPER_12_FDI = [16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26];
const LOWER_12_FDI = [46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36];

export const BOLTON_OVERALL_REFERENCE = 91.3;
export const BOLTON_ANTERIOR_REFERENCE = 77.2;

export interface BoltonResult {
  overall: BoltonRatioResult | null;
  anterior: BoltonRatioResult | null;
  message: string;
}

export interface BoltonRatioResult {
  ratio: number;
  reference: number;
  difference: number; // ratio - reference (percentage points)
  /** Estimated tooth-size discrepancy in mm */
  discrepancyMm: number;
  /** Which arch has excess tooth material */
  discrepancyDirection: 'maxillary_excess' | 'mandibular_excess' | 'none';
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

export function calculateBolton(toothMeasurements: ToothMeasurement[]): BoltonResult {
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

      // Discrepancy in mm: if ratio > reference, lower teeth are too big.
      // Estimated excess = lowerSum - (upperSum * reference / 100)
      const discrepancyMm = +(lowerSum - (upperSum * BOLTON_ANTERIOR_REFERENCE / 100)).toFixed(2);

      anterior = {
        ratio,
        reference: BOLTON_ANTERIOR_REFERENCE,
        difference,
        discrepancyMm: Math.abs(discrepancyMm),
        discrepancyDirection:
          discrepancyMm > 0.1
            ? 'mandibular_excess'
            : discrepancyMm < -0.1
              ? 'maxillary_excess'
              : 'none',
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
      const discrepancyMm = +(lowerSum - (upperSum * BOLTON_OVERALL_REFERENCE / 100)).toFixed(2);

      overall = {
        ratio,
        reference: BOLTON_OVERALL_REFERENCE,
        difference,
        discrepancyMm: Math.abs(discrepancyMm),
        discrepancyDirection:
          discrepancyMm > 0.1
            ? 'mandibular_excess'
            : discrepancyMm < -0.1
              ? 'maxillary_excess'
              : 'none',
      };
    }
  }

  const allMissing = [...missingAnterior, ...missingOverall];
  let message = '';
  if (allMissing.length > 0) {
    const uniqueMissing = [...new Set(allMissing)];
    message = `Bolton analysis is incomplete — missing teeth: ${uniqueMissing.map((t) => `#${t}`).join(', ')}. Available ratios are shown below.`;
  } else if (anterior && overall) {
    if (anterior.discrepancyDirection !== 'none' || overall.discrepancyDirection !== 'none') {
      message = 'Tooth-size discrepancy detected. Clinical interpretation required.';
    } else {
      message = 'Bolton ratios are within normal range.';
    }
  } else {
    message = 'Bolton analysis cannot be calculated because some required tooth measurements are missing.';
  }

  return { overall, anterior, message };
}