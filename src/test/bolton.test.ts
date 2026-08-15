import { describe, it, expect } from 'vitest';
import { calculateBolton, BOLTON_OVERALL_REFERENCE, BOLTON_ANTERIOR_REFERENCE } from '../domain/calculations/bolton';
import type { ToothMeasurement } from '../domain/types';

function makeTooth(fdi: number, width: number): ToothMeasurement {
  return {
    id: `tooth-${fdi}`,
    fdiNumber: fdi,
    arch: fdi >= 10 && fdi <= 27 ? 'upper' : 'lower',
    mesiodistalWidth: width,
  };
}

describe('Bolton Analysis', () => {
  it('returns null results when no teeth entered', () => {
    const result = calculateBolton([]);
    expect(result.overall).toBeNull();
    expect(result.anterior).toBeNull();
    expect(result.message).toContain('no tooth measurements');
  });

  it('calculates anterior ratio with all anterior teeth present', () => {
    const teeth = [
      // Upper anterior
      makeTooth(11, 8.5), makeTooth(12, 6.5), makeTooth(13, 8.0),
      makeTooth(21, 8.5), makeTooth(22, 6.5), makeTooth(23, 8.0),
      // Lower anterior
      makeTooth(41, 5.3), makeTooth(42, 5.5), makeTooth(43, 7.0),
      makeTooth(31, 5.3), makeTooth(32, 5.5), makeTooth(33, 7.0),
    ];
    const result = calculateBolton(teeth);
    expect(result.anterior).not.toBeNull();
    if (result.anterior) {
      const upperSum = 8.5 + 6.5 + 8.0 + 8.5 + 6.5 + 8.0; // 46
      const lowerSum = 5.3 + 5.5 + 7.0 + 5.3 + 5.5 + 7.0; // 35.6
      const expectedRatio = +((lowerSum / upperSum) * 100).toFixed(1);
      expect(result.anterior.ratio).toBe(expectedRatio);
      expect(result.anterior.reference).toBe(BOLTON_ANTERIOR_REFERENCE);
    }
  });

  it('reports missing teeth in message', () => {
    const teeth = [
      makeTooth(11, 8.5), makeTooth(21, 8.5),
      makeTooth(41, 5.3), makeTooth(31, 5.3),
    ];
    const result = calculateBolton(teeth);
    expect(result.message).toContain('missing');
  });

  it('calculates overall ratio with all 12 teeth per arch', () => {
    const teeth = [
      // Upper 12
      makeTooth(11, 8.5), makeTooth(12, 6.5), makeTooth(13, 8.0),
      makeTooth(14, 7.0), makeTooth(15, 6.7), makeTooth(16, 10.5),
      makeTooth(21, 8.5), makeTooth(22, 6.5), makeTooth(23, 8.0),
      makeTooth(24, 7.0), makeTooth(25, 6.7), makeTooth(26, 10.5),
      // Lower 12
      makeTooth(41, 5.3), makeTooth(42, 5.5), makeTooth(43, 7.0),
      makeTooth(44, 7.0), makeTooth(45, 7.2), makeTooth(46, 11.0),
      makeTooth(31, 5.3), makeTooth(32, 5.5), makeTooth(33, 7.0),
      makeTooth(34, 7.0), makeTooth(35, 7.2), makeTooth(36, 11.0),
    ];
    const result = calculateBolton(teeth);
    expect(result.overall).not.toBeNull();
    if (result.overall) {
      expect(result.overall.reference).toBe(BOLTON_OVERALL_REFERENCE);
    }
  });

  it('detects discrepancy direction', () => {
    // Make lower teeth disproportionately large
    const teeth = [
      makeTooth(11, 8.0), makeTooth(12, 6.0), makeTooth(13, 7.0),
      makeTooth(21, 8.0), makeTooth(22, 6.0), makeTooth(23, 7.0),
      // Lower anterior much larger
      makeTooth(41, 7.0), makeTooth(42, 7.0), makeTooth(43, 9.0),
      makeTooth(31, 7.0), makeTooth(32, 7.0), makeTooth(33, 9.0),
    ];
    const result = calculateBolton(teeth);
    if (result.anterior) {
      expect(result.anterior.discrepancyDirection).toBe('mandibular_excess');
    }
  });
});
