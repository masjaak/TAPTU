/**
 * Formats an attendance timestamp into a display HH:mm string.
 *
 * Input states:
 *   empty / undefined            → "--.--"
 *   ISO with Z or offset         → new Date() → local HH:mm  (backend UTC safe)
 *   ISO without Z/offset         → slice(11,16)              (demo local format)
 *   plain HH:mm or other string  → return as-is
 */
export function formatAttendanceTime(value?: string): string {
  if (!value) return "--.--";

  if (value.includes("T") && value.length >= 16) {
    const hasUtcIndicator = value.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(value);

    if (hasUtcIndicator) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      }
    }

    return value.slice(11, 16);
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  return value;
}
