// Renderiza um slide 1080x1440 como SVG (texto quebrado à mão) e exporta PNG no navegador.
export type Look = { bg: string; fg: string; accent: string; muted: string; font: string; logo?: string | null };
export const W = 1080, H = 1440;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const safeLook = (k: Look): Look => ({ bg: esc(String(k.bg)), fg: esc(String(k.fg)), accent: esc(String(k.accent)), muted: esc(String(k.muted)), font: String(k.font).replace(/"/g, "'"), logo: validCover(k.logo) });
/** Só PNG ou JPEG embutidos (até ~1,5 MB): endereço externo viraria rastreio e SVG pode carregar código. */
export function validCover(v: unknown): string | null {
  return typeof v === "string" && v.length <= 2_000_000 && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(v) ? v : null;
}
function wrap(text: string, max: number) {
  const out: string[] = []; let line = "";
  for (const w of text.split(/\s+/)) { if ((line + " " + w).trim().length > max) { if (line) out.push(line); line = w; } else line = (line + " " + w).trim(); }
  if (line) out.push(line);
  return out;
}
export function slideSvg(s: { role: string; title: string; text: string }, i: number, n: number, look: Look, handle = "", coverImage?: string | null) {
  const k = safeLook(look);
  const cover = i === 0;
  const tsize = cover ? 92 : 70, tmax = cover ? 16 : 20;
  const tl = wrap(s.title, tmax).slice(0, 6);
  const bl = wrap(s.text, 34).slice(0, 12);
  const ty = cover ? 520 : 330;
  const lines = tl.map((l, j) => `<text x="90" y="${ty + j * (tsize + 14)}" font-size="${tsize}" font-weight="700" fill="${k.fg}">${esc(l)}</text>`).join("");
  const by = ty + tl.length * (tsize + 14) + 40;
  const body = cover ? "" : bl.map((l, j) => `<text x="90" y="${by + j * 54}" font-size="40" fill="${k.muted}">${esc(l)}</text>`).join("");
  const photo = cover ? validCover(coverImage) : null;
  // o véu na cor de fundo mantém o título legível sobre a foto
  const picture = photo ? `<image href="${photo}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/><rect width="${W}" height="${H}" fill="${k.bg}" opacity="0.55"/>` : "";
  const logo = k.logo ? `<image href="${k.logo}" x="${W - 250}" y="110" width="160" height="160" preserveAspectRatio="xMaxYMid meet"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${esc(k.font)}"><rect width="${W}" height="${H}" fill="${k.bg}"/>${picture}<rect x="90" y="150" width="120" height="12" rx="6" fill="${k.accent}"/><text x="90" y="230" font-size="34" letter-spacing="6" fill="${k.accent}">${esc(s.role.toUpperCase())}</text>${lines}${body}<text x="90" y="${H - 90}" font-size="30" fill="${k.muted}">${esc(handle)}</text>${logo}<text x="${W - 90}" y="${H - 90}" font-size="30" text-anchor="end" fill="${k.muted}">${i + 1}/${n}</text></svg>`;
}
export function svgToPng(svg: string): Promise<Blob> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; c.getContext("2d")!.drawImage(img, 0, 0, W, H); c.toBlob((b) => (b ? res(b) : rej(new Error("png"))), "image/png"); };
    img.onerror = () => rej(new Error("Não consegui renderizar o slide."));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
}
