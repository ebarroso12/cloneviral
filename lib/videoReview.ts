// Análise de vídeo por IA: ela assiste ao arquivo e devolve o que ajustar antes de postar.
import { getStore, type Doc } from "./store";
import { readVideo, deleteVideo } from "./videos";
import { getAi, askVideo, readJson, VIDEO_BUDGET, VIDEO_SLOW } from "./providers";
import { voiceBrief, type Ctx } from "./ai";
import { HttpError } from "./auth";
import type { Check } from "./review";

export async function analyzeVideo(c: Ctx, v: Doc, pollMs?: number, budgetMs = VIDEO_BUDGET) {
  const deadline = Date.now() + budgetMs;
  const userId = c.userId!;
  try {
    const cfg = await getAi("video", userId);
    if (!cfg) throw new HttpError(400, "Para a IA assistir ao vídeo, ligue o Gemini em IA e integrações.");
    const bytes = await readVideo(userId, v);
    let answer: string;
    try {
      if (Date.now() >= deadline) throw new Error(VIDEO_SLOW);
      answer = await askVideo(cfg, bytes, v.ext === ".mov" ? "video/quicktime" : "video/mp4", `${voiceBrief(c)}\nAssista a este vídeo curto para Instagram e avalie em português do Brasil: gancho nos primeiros segundos, fala e clareza, ritmo e cortes, enquadramento e luz, legendas na tela e convite final. Comente só o que você vê e ouve. Responda SOMENTE um objeto JSON {resumo, pontos:[{item, status: "bom"|"ajustar"|"conferir", advice}]}.`, pollMs, deadline);
    } catch (e: any) {
      throw new HttpError(502, e?.name === "TimeoutError" ? VIDEO_SLOW : String(e?.message ?? "A IA não respondeu.").slice(0, 250));
    }
    const j = readJson<{ resumo?: string; pontos?: Check[] }>(answer);
    const checks: Check[] = (j?.pontos ?? []).filter((p) => p?.item && p?.advice).slice(0, 12).map((p) => ({ item: String(p.item).slice(0, 80), status: ["bom", "ajustar"].includes(p.status) ? p.status : "conferir", advice: String(p.advice).slice(0, 600) }));
    const summary = String(j?.resumo ?? (checks.length ? "" : answer)).slice(0, 3000);
    return await getStore().insert("analyses", userId, { kind: "video", name: v.name, summaryText: summary, checks, model: cfg.model });
  } finally {
    // arquivo enviado só para a análise não ocupa o espaço do planejador
    if (v.source === "analise") await deleteVideo(userId, v.id).catch((e) => console.error(e));
  }
}
