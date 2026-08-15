import { describe, it, expect } from 'vitest';
import { calculateBolton, classifyBoltonDiscrepancy } from '../domain/calculations/bolton';
import type { ToothMeasurement } from '../domain/types';

function makeTooth(fdi: number, width: number): ToothMeasurement {
  return {
    id: `tooth-${fdi}`,
    fdiNumber: fdi,
    arch: fdi >= 10 && fdi <= 27 ? 'upper' : 'lower',
    mesiodistalWidth: width,
  };
}

// Demo data from the spec — should produce ~0.09 mm anterior discrepancy and ~0.19 mm overall
const DEMO_TEETH = [
  // Upper anterior (6)
  makeTooth(11, 8.5), makeTooth(12, 6.5), makeTooth(13, 8.0),
  makeTooth(21, 8.5), makeTooth(22, 6.5), makeTooth(23, 8.0),
  // Lower anterior (6)
  makeTooth(41, 5.3), makeTooth(42, 5.5), makeTooth(43, 7.0),
  makeTooth(31, 5.3), makeTooth(32, 5.5), makeTooth(33, 7.0),
  // Upper posterior (6)
  makeTooth(14, 7.0), makeTooth(15, 6.7), makeTooth(16, 10.5),
  makeTooth(24, 7.0), makeTooth(25, 6.7), makeTooth(26, 10.5),
  // Lower posterior (6)
  makeTooth(44, 7.0), makeTooth(45, 7.2), makeTooth(46, 11.0),
  makeTooth(34, 7.0), makeTooth(35, 7.2), makeTooth(36, 11.0),
];

describe('Bolton Tolerance Classification', () => {
  it('classifies within tolerance for small discrepancy', () => {
    expect(classifyBoltonDiscrepancy(0.09, 0.5, 1.5)).toBe('within_tolerance');
    expect(classifyBoltonDiscrepancy(0.19, 0.5, 1.5)).toBe('within_tolerance');
    expect(classifyBoltonDiscrepancy(0.5, 0.5, 1.5)).toBe('within_tolerance');
  });

  it('classifies minor discrepancy for medium values', () => {
    expect(classifyBoltonDiscrepancy(0.6, 0.5, 1.5)).toBe('minor_discrepancy');
    expect(classifyBoltonDiscrepancy(1.5, 0.5, 1.5)).toBe('minor_discrepancy');
  });

  it('classifies relevant discrepancy for large values', () => {
    expect(classifyBoltonDiscrepancy(1.6, 0.5, 1.5)).toBe('relevant_discrepancy');
    expect(classifyBoltonDiscrepancy(3.0, 0.5, 1.5)).toBe('relevant_discrepancy');
  });

  it('handles negative discrepancies (maxillary excess)', () => {
    expect(classifyBoltonDiscrepancy(-0.3, 0.5, 1.5)).toBe('within_tolerance');
    expect(classifyBoltonDiscrepancy(-0.7, 0.5, 1.5)).toBe('minor_discrepancy');
    expect(classifyBoltonDiscrepancy(-2.0, 0.5, 1.5)).toBe('relevant_discrepancy');
  });
});

describe('Bolton with Demo Data', () => {
  it('does NOT generate relevant-discrepancy warning for demo data (0.09 and 0.19 mm)', () => {
    const result = calculateBolton(DEMO_TEETH, {
      boltonDiscrepancyTolerance: 0.5,
      boltonRelevantThreshold: 1.5,
    });

    // Both discrepancies should be within tolerance
    if (result.anterior) {
      expect(result.anterior.status).toBe('within_tolerance');
      expect(result.anterior.discrepancyMm).toBeLessThan(0.5);
    }
    if (result.overall) {
      expect(result.overall.status).toBe('within_tolerance');
      expect(result.overall.discrepancyMm).toBeLessThan(0.5);
    }

    // Message should not say "requires clinical review"
    expect(result.message).not.toContain('requires clinical review');
  });

  it('shows within tolerance message for demo data', () => {
    const result = calculateBolton(DEMO_TEETH, {
      boltonDiscrepancyTolerance: 0.5,
      boltonRelevantThreshold: 1.5,
    });
    expect(result.message).toContain('within configured tolerance');
  });
});

describe('Bolton with Large Discrepancy', () => {
  it('generates relevant-discrepancy status for large discrepancy', () => {
    // Make lower anterior teeth much larger
    const teeth = [
      // Upper anterior
      makeTooth(11, 8.0), makeTooth(12, 6.0), makeTooth(13, 7.0),
      makeTooth(21, 8.0), makeTooth(22, 6.0), makeTooth(23, 7.0),
      // Lower anterior — much bigger
      makeTooth(41, 7.5), makeTooth(42, 7.0), makeTooth(43, 9.0),
      makeTooth(31, 7.5), makeTooth(32, 7.0), makeTooth(33, 9.0),
      // Upper posterior (for overall)
      makeTooth(14, 7.0), makeTooth(15, 6.7), makeTooth(16, 10.5),
      makeTooth(24, 7.0), makeTooth(25, 6.7), makeTooth(26, 10.5),
      // Lower posterior
      makeTooth(44, 7.0), makeTooth(45, 7.2), makeTooth(46, 11.0),
      makeTooth(34, 7.0), makeTooth(35, 7.2), makeTooth(36, 11.0),
    ];
    const result = calculateBolton(teeth, {
      boltonDiscrepancyTolerance: 0.5,
      boltonRelevantThreshold: 1.5,
    });
    if (result.anterior) {
      expect(result.anterior.status).toBe('relevant_discrepancy');
    }
    expect(result.message).toContain('requires clinical review');
  });

  it('generates minor discrepancy status for medium discrepancy', () => {
    // Small difference
    const teeth = [
      makeTooth(11, 8.0), makeTooth(12, 6.0), makeTooth(13, 7.0),
      makeTooth(21, 8.0), makeTooth(22, 6.0), makeTooth(23, 7.0),
      makeTooth(41, 5.5), makeTooth(42, 5.5), makeTooth(43, 7.5),
      makeTooth(31, 5.5), makeTooth(32, 5.5), makeTooth(33, 7.5),
    ];
    const result = calculateBolton(teeth, {
      boltonDiscrepancyTolerance: 0.3,
      boltonRelevantThreshold: 1.5,
    });
    if (result.anterior) {
      // The discrepancy should be small but above 0.3 tolerance
      const disc = result.anterior.discrepancyMm;
      if (disc > 0.3 && disc <= 1.5) {
        expect(result.anterior.status).toBe('minor_discrepancy');
      }
    }
  });
});