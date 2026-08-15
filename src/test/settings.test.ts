import { describe, it, expect } from 'vitest';
import { classifyBalance } from '../domain/calculations/spaceBalance';

describe('Settings-based thresholds', () => {
  it('respects custom balanced tolerance', () => {
    // With 1.0mm tolerance, 0.8 is balanced
    expect(classifyBalance(0.8, 1.0, 2.0)).toBe('balanced');
    // With 0.5mm tolerance, 0.8 is minor
    expect(classifyBalance(0.8, 0.5, 2.0)).toBe('minor');
  });

  it('respects custom minor threshold', () => {
    // With 3.0mm minor threshold, 2.5 is minor
    expect(classifyBalance(2.5, 0.5, 3.0)).toBe('minor');
    // With 2.0mm minor threshold, 2.5 is unresolved
    expect(classifyBalance(2.5, 0.5, 2.0)).toBe('unresolved');
  });

  it('handles very large values', () => {
    expect(classifyBalance(100, 0.5, 2.0)).toBe('unresolved');
    expect(classifyBalance(-100, 0.5, 2.0)).toBe('unresolved');
  });

  it('handles decimal precision', () => {
    expect(classifyBalance(0.49, 0.5, 2.0)).toBe('balanced');
    expect(classifyBalance(0.51, 0.5, 2.0)).toBe('minor');
  });
});
