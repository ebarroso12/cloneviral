import { route, loadCtx, bad } from "@/lib/api";
import { getStore } from "@/lib/store";
import { withCharge, COSTS } from "@/lib/credits";
import { genScripts, type ScriptType } from "@/lib/ai";
import { saveScripts } from "@/lib/scripts";

export const POST = route(async (user, req) => {
  const b = await req.json();
  const type = (["viral", "emocional", "tecnico"].includes(b.type) ? b.type : "viral") as ScriptType;
  const replaceId = b.replaceId ? String(b.replaceId) : undefined;
  if (replaceId) {
    const cur = await getStore().get("scripts", replaceId);
    if (!cur || cur.userId !== user.id) bad("Roteiro não encontrado.", 404);
  }
  const n = replaceId ? 1 : Math.min(10, Math.max(1, Number(b.count ?? 1)));
  const theme = String(b.theme ?? "").slice(0, 300);
  const ctx = await loadCtx(user.id);
  return withCharge(user.id, COSTS.roteiro * n, n > 1 ? `${n} roteiros` : "Roteiro", async () => {
    const list = await genScripts(ctx, { type, dest: b.dest === "criativo" ? "criativo" : "reel", theme, n, seconds: b.seconds ? Number(b.seconds) : undefined });
    if (!list.length) bad("Não consegui gerar. Tente outro tema.");
    return saveScripts(user.id, list, replaceId);
  });
});
