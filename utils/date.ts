/**
 * utils/date.ts
 *
 * IMP-1: Shared IST (India Standard Time) date utilities.
 *
 * Previously, the block below was copy-pasted 5+ times across:
 *   - app/actions.ts
 *   - app/patients/actions.ts
 *
 * Using this helper ensures a single source of truth for date handling.
 */

/**
 * Returns today's date string in "YYYY-MM-DD" format,
 * correctly adjusted to IST (UTC+5:30) regardless of server timezone.
 *
 * @example
 * const today = getISTDateString(); // "2026-05-09"
 */
export function getISTDateString(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().split('T')[0];
}

/**
 * Returns the current time in IST as a Date object.
 * Useful when you need the IST hour/minute for slot calculations.
 */
export function getISTNow(): Date {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + istOffset);
}
