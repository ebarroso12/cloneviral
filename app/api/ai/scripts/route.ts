import { route, loadCtx, bad } from "@/lib/api";
import { getStore } from "@/lib/store";
import { charge, COSTS } from "@/lib/credits";
import { genScripts, type ScriptType } from "@/lib/ai";

export const POST = route(async (user, req) => {
  const b = await req.json();
  const type = (["viral", "emocional", "tecnico"].includes(b.type) ? b.type : "viral") as ScriptType;
  const n = Math.min(10, Math.max(1, Number(b.count ?? 1)));
  const theme = String(b.theme ?? "").slice(0, 300);
  const ctx = await loadCtx(user.id);
  await charge(user.id, COSTS.roteiro * n, n > 1 ? `${n} roteiros` : "Roteiro");
  const list = await genScripts(ctx, { type, dest: b.dest === "criativo" ? "criativo" : "reel", theme, n, seconds: b.seconds ? Number(b.seconds) : undefined });
  if (!list.length) bad("Não consegui gerar. Tente outro tema.");
  const saved = [];
  for (const s of list) saved.push(await getStore().insert("scripts", user.id, { ...s, source: "manual", recorded: false }));
  return saved;
});
