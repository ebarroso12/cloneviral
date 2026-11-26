import { route, loadCtx, bad } from "@/lib/api";
import { getStore } from "@/lib/store";
import { charge, COSTS } from "@/lib/credits";
import { genSeries } from "@/lib/ai";

export const POST = route(async (user, req) => {
  const b = await req.json();
  const theme = String(b.theme ?? "").trim().slice(0, 300);
  if (!theme) bad("Escreva o tema da série.");
  const n = [3, 5, 7, 10].includes(Number(b.chapters)) ? Number(b.chapters) : 7;
  const store = getStore();
  const ctx = await loadCtx(user.id);
  await charge(user.id, COSTS.serie(n), `Série de ${n} capítulos`);
  const serie = await store.insert("series", user.id, { theme, chapters: n, status: "pronta" });
  const scripts = await genSeries(ctx, { theme, chapters: n });
  const saved = [];
  for (const s of scripts) saved.push(await store.insert("scripts", user.id, { ...s, source: "serie", seriesId: serie.id, recorded: false }));
  return { serie, scripts: saved };
});
