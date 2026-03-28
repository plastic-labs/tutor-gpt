import { describe, expect, test } from 'vitest';
import { PROVIDER_PRESETS, clampTemperature } from '@/utils/ai';

// ---------------------------------------------------------------------------
// Unit tests — PROVIDER_PRESETS
// ---------------------------------------------------------------------------
describe('PROVIDER_PRESETS', () => {
  test('has openrouter preset with correct base URL', () => {
    expect(PROVIDER_PRESETS.openrouter).toBeDefined();
    expect(PROVIDER_PRESETS.openrouter.baseURL).toBe(
      'https://openrouter.ai/api/v1'
    );
    expect(PROVIDER_PRESETS.openrouter.defaultModel).toBe('gpt-3.5-turbo');
  });

  test('openrouter preset includes HTTP-Referer header', () => {
    expect(PROVIDER_PRESETS.openrouter.headers).toBeDefined();
    expect(PROVIDER_PRESETS.openrouter.headers!['HTTP-Referer']).toBe(
      'https://chat.bloombot.ai'
    );
    expect(PROVIDER_PRESETS.openrouter.headers!['X-Title']).toBe('Bloombot');
  });

  test('has minimax preset with correct base URL', () => {
    expect(PROVIDER_PRESETS.minimax).toBeDefined();
    expect(PROVIDER_PRESETS.minimax.baseURL).toBe(
      'https://api.minimax.io/v1'
    );
    expect(PROVIDER_PRESETS.minimax.defaultModel).toBe('MiniMax-M2.7');
  });

  test('minimax preset does not include extra headers', () => {
    expect(PROVIDER_PRESETS.minimax.headers).toBeUndefined();
  });

  test('presets contain distinct base URLs', () => {
    const urls = Object.values(PROVIDER_PRESETS).map((p) => p.baseURL);
    expect(new Set(urls).size).toBe(urls.length);
  });

  test('preset models are non-empty strings', () => {
    for (const [name, preset] of Object.entries(PROVIDER_PRESETS)) {
      expect(preset.defaultModel.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Unit tests — clampTemperature
// ---------------------------------------------------------------------------
describe('clampTemperature', () => {
  test('returns undefined when temperature is undefined', () => {
    expect(clampTemperature('minimax', undefined)).toBeUndefined();
    expect(clampTemperature('openrouter', undefined)).toBeUndefined();
  });

  test('passes through temperature for non-minimax providers', () => {
    expect(clampTemperature('openrouter', 0)).toBe(0);
    expect(clampTemperature('openrouter', 0.5)).toBe(0.5);
    expect(clampTemperature('openrouter', 2)).toBe(2);
    expect(clampTemperature('custom', 0)).toBe(0);
  });

  test('clamps zero to 0.01 for minimax', () => {
    expect(clampTemperature('minimax', 0)).toBe(0.01);
  });

  test('clamps negative to 0.01 for minimax', () => {
    expect(clampTemperature('minimax', -1)).toBe(0.01);
  });

  test('clamps values above 1 to 1 for minimax', () => {
    expect(clampTemperature('minimax', 1.5)).toBe(1);
    expect(clampTemperature('minimax', 2)).toBe(1);
  });

  test('keeps valid minimax temperatures unchanged', () => {
    expect(clampTemperature('minimax', 0.5)).toBe(0.5);
    expect(clampTemperature('minimax', 0.7)).toBeCloseTo(0.7);
    expect(clampTemperature('minimax', 1)).toBe(1);
    expect(clampTemperature('minimax', 0.01)).toBe(0.01);
  });

  test('handles edge case of exactly 0.01 for minimax', () => {
    expect(clampTemperature('minimax', 0.01)).toBe(0.01);
  });

  test('handles very small positive values for minimax', () => {
    expect(clampTemperature('minimax', 0.001)).toBe(0.01);
    expect(clampTemperature('minimax', 0.009)).toBe(0.01);
  });
});
