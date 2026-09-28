const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const ABSOLUTE = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 1000 * 60 * 60 * 24 * 365],
  ['month', 1000 * 60 * 60 * 24 * 30],
  ['week', 1000 * 60 * 60 * 24 * 7],
  ['day', 1000 * 60 * 60 * 24],
  ['hour', 1000 * 60 * 60],
  ['minute', 1000 * 60]
];

/** "3 hours ago" without pulling in a date library. */
export function formatRelative(date: Date | string): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  const deltaMs = value.getTime() - Date.now();

  for (const [unit, ms] of UNITS) {
    if (Math.abs(deltaMs) >= ms) {
      return RELATIVE.format(Math.round(deltaMs / ms), unit);
    }
  }
  return 'just now';
}

/** "Sep 28, 2026, 6:30 PM" */
export function formatAbsolute(date: Date | string): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  return ABSOLUTE.format(value);
}
