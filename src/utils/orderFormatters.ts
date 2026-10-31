/**
 * Deterministic date and time formatters for Institutional Quant Terminal orders.
 * Strictly adheres to:
 * - Date format: dd-mmm-yyyy (e.g., 29-Oct-2026)
 * - Time format: [hh]:mm:ss (24-hour clock, zero-padded, bracketed hour, NO AM/PM, e.g., [14]:32:15)
 */

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
] as const;

/**
 * Formats a Date or timestamp string strictly into `dd-mmm-yyyy`
 * e.g., "29-Oct-2026"
 */
export function formatOrderDate(input?: Date | string | number | null): string {
  if (typeof input === 'string') {
    // If already in dd-mmm-yyyy format, validate and return
    const match = input.match(/\b(\d{1,2})-([A-Za-z]{3})-(\d{4})\b/);
    if (match) {
      const d = match[1].padStart(2, '0');
      const m = match[2].charAt(0).toUpperCase() + match[2].slice(1, 3).toLowerCase();
      const y = match[3];
      return `${d}-${m}-${y}`;
    }
  }

  const d = input ? new Date(input) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;

  const day = String(validDate.getDate()).padStart(2, '0');
  const month = MONTH_NAMES[validDate.getMonth()];
  const year = validDate.getFullYear();

  return `${day}-${month}-${year}`;
}

/**
 * Formats a Date or timestamp string strictly into `[hh]:mm:ss`
 * 24-hour time with brackets around the hour and strictly no AM/PM.
 * e.g., "[14]:32:15", "[09]:15:00"
 */
export function formatOrderTime(input?: Date | string | number | null): string {
  if (typeof input === 'string') {
    // If already in [hh]:mm:ss format, normalize and return
    const bracketMatch = input.match(/\[(\d{1,2})\]:(\d{2}):(\d{2})/);
    if (bracketMatch) {
      const hh = bracketMatch[1].padStart(2, '0');
      const mm = bracketMatch[2];
      const ss = bracketMatch[3];
      return `[${hh}]:${mm}:${ss}`;
    }

    // If string has standard 24-hour time hh:mm:ss (e.g. "14:32:15" or "14:32:15 IST")
    const plainMatch = input.match(/\b(\d{1,2}):(\d{2}):(\d{2})\b/);
    if (plainMatch) {
      const hh = plainMatch[1].padStart(2, '0');
      const mm = plainMatch[2];
      const ss = plainMatch[3];
      return `[${hh}]:${mm}:${ss}`;
    }

    // If 12-hour format with AM/PM (e.g. "02:30:15 PM")
    const ampmMatch = input.match(/\b(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)\b/i);
    if (ampmMatch) {
      let hh = parseInt(ampmMatch[1], 10);
      const isPm = ampmMatch[4].toUpperCase() === 'PM';
      if (isPm && hh < 12) hh += 12;
      if (!isPm && hh === 12) hh = 0;
      const hhStr = String(hh).padStart(2, '0');
      const mm = ampmMatch[2];
      const ss = ampmMatch[3];
      return `[${hhStr}]:${mm}:${ss}`;
    }
  }

  const d = input ? new Date(input) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;

  const hh = String(validDate.getHours()).padStart(2, '0');
  const mm = String(validDate.getMinutes()).padStart(2, '0');
  const ss = String(validDate.getSeconds()).padStart(2, '0');

  return `[${hh}]:${mm}:${ss}`;
}
