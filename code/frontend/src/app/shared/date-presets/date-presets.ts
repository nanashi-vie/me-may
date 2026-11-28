/** Quick day ranges shared by admin lists and the overview: days follow the shop's clock (Asia/Ho_Chi_Minh). */
const isoDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short' });

export interface DatePreset {
  key: 'today' | 'yesterday';
  label: string;
  /** Days back from today. */
  daysAgo: number;
}
export interface DayRange {
  from: string;
  to: string;
}

export const DATE_PRESETS: readonly DatePreset[] = [
  { key: 'today', label: 'Hôm nay', daysAgo: 0 },
  { key: 'yesterday', label: 'Hôm qua', daysAgo: 1 },
];

/** Shop date (yyyy-MM-dd) for an instant. */
export function shopDay(now = new Date()): string {
  return isoDay.format(now);
}

export function presetRange(preset: DatePreset, now = new Date()): DayRange {
  const day = new Date(shopDay(now) + 'T00:00:00Z');
  day.setUTCDate(day.getUTCDate() - preset.daysAgo);
  const iso = day.toISOString().slice(0, 10);
  return { from: iso, to: iso };
}

/** The preset whose range is exactly `from`..`to`, if any. */
export function matchingPreset(from: string | undefined, to: string | undefined, now = new Date()) {
  return DATE_PRESETS.find((p) => {
    const r = presetRange(p, now);
    return r.from === from && r.to === to;
  });
}
