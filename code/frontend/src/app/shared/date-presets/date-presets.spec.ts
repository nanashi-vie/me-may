import { DATE_PRESETS, matchingPreset, presetRange, shopDay } from './date-presets';

describe('date presets', () => {
  // 28/11 00:30 in Vietnam is still 27/11 in UTC.
  const now = new Date('2026-11-27T17:30:00Z');

  it('counts days on the shop clock, not UTC', () => {
    expect(shopDay(now)).toBe('2026-11-28');
    expect(presetRange(DATE_PRESETS[0], now)).toEqual({ from: '2026-11-28', to: '2026-11-28' });
    expect(presetRange(DATE_PRESETS[1], now)).toEqual({ from: '2026-11-27', to: '2026-11-27' });
  });

  it('crosses month boundaries', () => {
    expect(presetRange(DATE_PRESETS[1], new Date('2026-12-01T03:00:00Z')).from).toBe('2026-11-30');
  });

  it('recognises only exact one-day ranges', () => {
    expect(matchingPreset('2026-11-28', '2026-11-28', now)?.key).toBe('today');
    expect(matchingPreset('2026-11-27', '2026-11-27', now)?.key).toBe('yesterday');
    expect(matchingPreset('2026-11-27', '2026-11-28', now)).toBeUndefined();
    expect(matchingPreset('', '', now)).toBeUndefined();
  });
});
