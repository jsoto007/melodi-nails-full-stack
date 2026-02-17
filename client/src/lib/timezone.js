import { format, toDate, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { parseISO } from 'date-fns';

export const TIMEZONE = 'America/New_York';

/**
 * Formats a date in the NYC timezone.
 * @param {Date|string|number} date - The date to format.
 * @param {string} fmt - The format string (e.g., 'yyyy-MM-dd HH:mm').
 * @returns {string} The formatted date string.
 */
export function formatInNyc(date, fmt) {
    if (!date) return '';
    // Ensure we have a Date object
    const d = typeof date === 'string' ? parseISO(date) : toDate(date);
    // Convert to zoned time (this creates a Date that *looks* like the zoned time in local env, 
    // but date-fns-tz handles it correctly when formatting if we provide the timeZone)
    // Actually, format from date-fns-tz handles the conversion if we pass timeZone option.
    return format(d, fmt, { timeZone: TIMEZONE });
}

/**
 * Converts a UTC string (from API) to a "YYYY-MM-DDTHH:mm" string representing NYC time.
 * This is used for <input type="datetime-local" /> which expects "local" time values.
 * We want the input to show the NYC time.
 * @param {string} utcString - UTC ISO string (e.g., "2023-10-27T14:00:00Z")
 * @returns {string} - "2023-10-27T10:00" (if NYC is UTC-4)
 */
export function utcToNycInput(utcString) {
    if (!utcString) return '';
    const d = typeof utcString === 'string' ? parseISO(utcString) : toDate(utcString);
    return format(d, "yyyy-MM-dd'T'HH:mm", { timeZone: TIMEZONE });
}

/**
 * Converts a "YYYY-MM-DDTHH:mm" string (interpreted as NYC time) to a UTC ISO string.
 * This is used when sending data back to the API.
 * @param {string} nycString - "2023-10-27T10:00"
 * @returns {string|null} - "2023-10-27T14:00:00.000Z" (if NYC is UTC-4)
 */
export function nycInputToUtc(nycString) {
    if (!nycString) return null;
    // fromZonedTime takes a string or date that represents time in X zone, and gives back a UTC date
    const d = fromZonedTime(nycString, TIMEZONE);
    return d.toISOString();
}

/**
 * Returns the current time in NYC as a Date object (approximated for local manipulation if needed)
 * or simply use as a reference. 
 * Note: `new Date()` is always browser local or UTC. 
 * `toZonedTime(new Date(), TIMEZONE)` returns a Date instance where getHours() etc match NYC.
 */
export function nowInNyc() {
    return toZonedTime(new Date(), TIMEZONE);
}

/**
 * Helpers for getting start of day/week/month in NYC
 */
export function startOfDayNyc(date) {
    const zoned = toZonedTime(date, TIMEZONE);
    zoned.setHours(0, 0, 0, 0);
    return fromZonedTime(zoned, TIMEZONE); // Return UTC date representing NYC start of day
}
