import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { route, bad } from "@/lib/api";
import { getStore } from "@/lib/store";

const safe = (s: string) => s.replace(/[‐-―]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ]/g, "");

async function make(title: string, blocks: { h?: string; p: string }[]) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595, H = 842, M = 56;
  let page = pdf.addPage([W, H]);
  let y = H - M;
  const line = (text: string, size: number, f = font, color = rgb(0.1, 0.1, 0.15)) => {
    const words = safe(text).split(/\s+/);
    let cur = "";
    const flush = () => {
      if (y < M + size) { page = pdf.addPage([W, H]); y = H - M; }
      page.drawText(cur, { x: M, y, size, font: f, color });
      y -= size * 1.5;
      cur = "";
    };
    for (const w of words) {
      const t = cur ? cur + " " + w : w;
      if (f.widthOfTextAtSize(t, size) > W - 2 * M) { flush(); cur = w; } else cur = t;
    }
    if (cur) flush();
  };
  line(title, 22, bold);
  y -= 10;
  for (const b of blocks) {
    if (b.h) { y -= 6; line(b.h, 14, bold, rgb(0.2, 0.25, 0.6)); }
    line(b.p, 11.5);
    y -= 6;
  }
  return pdf.save();
}

type P = { params: Promise<{ kind: string; id: string }> };
export const runtime = "nodejs";
export async function GET(req: Request, ctx: P) {
  return route(async (user) => {
    const { kind, id } = await ctx.params;
    const store = getStore();
    let bytes: Uint8Array;
    let name = "documento";
    if (kind === "script") {
      const s = (await store.get("scripts", id)) as any;
      if (!s || s.userId !== user.id) bad("Roteiro não encontrado.", 404);
      name = "roteiro";
      bytes = await make(s.title, [{ h: "Gancho", p: s.hook }, { h: "Roteiro", p: s.body }, { h: "Chamada", p: s.cta }, { p: `Tipo: ${s.type} | Destino: ${s.dest} | Duração: ${s.seconds}s` }]);
    } else if (kind === "isca") {
      const m = (await store.get("lead_magnets", id)) as any;
      if (!m || m.userId !== user.id) bad("Isca não encontrada.", 404);
      name = "isca";
      bytes = await make(m.title, m.sections.map((x: any) => ({ h: x.h, p: x.p })));
    } else bad("Tipo desconhecido.", 404);
    return new Response(Buffer.from(bytes!), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${name}-${id.slice(0, 6)}.pdf"` } });
  })(req);
}
