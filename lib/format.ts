// Formatação pt-BR usada em todas as telas.
export const fmtInt = (n: number) => new Intl.NumberFormat("pt-BR").format(Math.round(n));
export function fmtCompact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (a >= 1_000) return `${(n / 1_000).toFixed(1).replace(".", ",")} mil`;
  return fmtInt(n);
}
export const fmtPct = (n: number, d = 1) => `${n.toFixed(d).replace(".", ",")}%`;
export const fmtDec = (n: number, d = 2) => n.toFixed(d).replace(".", ",");
export function fmtDate(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${String(d.getUTCFullYear()).slice(2)}`;
}
export function fmtShort(date: string) {
  // YYYY-MM-DD -> dd/mm
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}
export function timeAgo(iso: string, ref = new Date()) {
  const days = Math.floor((ref.getTime() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return "hoje";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(days / 365);
  return `há ${years} ${years === 1 ? "ano" : "anos"}`;
}
export function fmtDateTimePt(iso: string) {
  const d = new Date(iso);
  const meses = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
  return `${d.getDate()} de ${meses[d.getMonth()]}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
