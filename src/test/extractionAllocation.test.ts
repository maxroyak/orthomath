import { describe, it, expect } from 'vitest';
import {
  calculateExtractionTotalSpace,
  getExtractionAllocationTotal,
  getExtractionUnallocated,
} from '../domain/calculations/spaceBalance';
import type { ExtractionAllocation } from '../domain/types';

describe('Extraction Allocation', () => {
  it('calculates total extraction space from tooth widths', () => {
    expect(calculateExtractionTotalSpace([7.0, 7.0])).toBe(14.0);
  });

  it('handles single tooth', () => {
    expect(calculateExtractionTotalSpace([7.5])).toBe(7.5);
  });

  it('handles empty array', () => {
    expect(calculateExtractionTotalSpace([])).toBe(0);
  });

  it('calculates allocation total', () => {
    const alloc: ExtractionAllocation = {
      alignment: 6.4,
      incisorRetraction: 5.0,
      anchorageLoss: 1.5,
      other: 0.5,
    };
    expect(getExtractionAllocationTotal(alloc)).toBe(13.4);
  });

  it('handles partial allocation', () => {
    const alloc: ExtractionAllocation = {
      alignment: 6.0,
    };
    expect(getExtractionAllocationTotal(alloc)).toBe(6.0);
  });

  it('handles undefined allocation', () => {
    expect(getExtractionAllocationTotal(undefined)).toBe(0);
  });

  it('calculates unallocated space', () => {
    const alloc: ExtractionAllocation = {
      alignment: 6.4,
      incisorRetraction: 5.0,
      anchorageLoss: 1.5,
      other: 0.5,
    };
    expect(getExtractionUnallocated(14.0, alloc)).toBeCloseTo(0.6, 1);
  });

  it('detects over-allocation', () => {
    const alloc: ExtractionAllocation = {
      alignment: 8.0,
      incisorRetraction: 5.0,
      anchorageLoss: 2.0,
      other: 1.0,
    };
    const unallocated = getExtractionUnallocated(14.0, alloc);
    expect(unallocated).toBeLessThan(0);
    expect(Math.abs(unallocated)).toBeCloseTo(2.0, 1);
  });

  it('handles exact allocation', () => {
    const alloc: ExtractionAllocation = {
      alignment: 7.0,
      incisorRetraction: 7.0,
    };
    expect(getExtractionUnallocated(14.0, alloc)).toBe(0);
  });
});