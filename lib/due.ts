/** Momento do agendamento. tzOffset é o getTimezoneOffset() do aparelho de quem agendou. */
export function dueTime(p: { date?: unknown; time?: unknown; tzOffset?: unknown }) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(`${p.date}T${p.time}`);
  if (!m) return NaN;
  if (typeof p.tzOffset !== "number") return new Date(`${p.date}T${p.time}:00`).getTime();
  const [, y, mo, d, h, mi] = m.map(Number);
  return Date.UTC(y, mo - 1, d, h, mi) + p.tzOffset * 60000;
}
