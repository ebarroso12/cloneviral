import { route, loadCtx, bad } from "@/lib/api";
import { getStore, uid } from "@/lib/store";
import { withCharge, refund, COSTS } from "@/lib/credits";
import { genScripts, analyzeTop, patternsFromText, type ScriptType, type Pattern } from "@/lib/ai";
import type { Post } from "@/lib/metrics";

const TARGETS = ["perfil", "um-perfil", "nicho", "conteudo"];
export const POST = route(async (user, req) => {
  const b = await req.json();
  const target = TARGETS.includes(b.target) ? b.target : "perfil";
  const types: ScriptType[] = (Array.isArray(b.types) ? b.types : []).filter((t: string) => ["viral", "emocional", "tecnico"].includes(t));
  if (!types.length) bad("Marque pelo menos um tipo de conteúdo.");
  const analyze = [3, 5, 10].includes(Number(b.analyze)) ? Number(b.analyze) : 5;
  const scriptsN = Math.min(10, Math.max(1, Number(b.scripts ?? 5)));
  const store = getStore();
  const pasted = target === "perfil" ? [] : patternsFromText(String(b.sample ?? "").slice(0, 20000), analyze);
  if (target !== "perfil" && !pasted.length) bad("Cole as legendas ou roteiros que você quer estudar, separando cada um com uma linha em branco.");
  const posts = target === "perfil" ? ((await store.list("posts", user.id)) as unknown as Post[]) : [];
  if (target === "perfil" && posts.length < 3) bad("Seu perfil ainda não tem posts medidos. Conecte o Instagram e sincronize.");
  const cost = COSTS.varredura(scriptsN);
  const label = ({ perfil: "Varredura do seu perfil", "um-perfil": "Varredura de um perfil", nicho: "Varredura do nicho", conteudo: "Varredura de um conteúdo" } as Record<string, string>)[target];
  const sweepId = uid();
  return withCharge(user.id, cost, label, async () => {
  const sweep = await store.insert("sweeps", user.id, { id: sweepId, target, dest: b.dest === "criativo" ? "criativo" : "reel", types, theme: String(b.theme ?? ""), analyze, scriptsN, duration: b.duration ?? "variado", status: "rodando", cost, refund: 0 });
  const patterns: Pattern[] = target === "perfil" ? analyzeTop(posts, analyze) : pasted;
  const savedPatterns = [];
  for (const p of patterns) savedPatterns.push(await store.insert("patterns", user.id, { ...p, sweepId: sweep.id }));
  const ctx = await loadCtx(user.id);
  const topics = target === "perfil" ? patterns.map((p) => p.examples[0]).filter(Boolean) : [];
  const out = [];
  for (let i = 0; i < scriptsN; i++) {
    const type = types[i % types.length];
    const [s] = await genScripts(ctx, { type, dest: sweep.dest, theme: sweep.theme, n: 1, seconds: b.duration && b.duration !== "variado" ? Number(b.duration) : undefined, patterns: [patterns[i % patterns.length]], topics: topics.length ? [topics[i % topics.length]] : undefined });
    if (s) out.push(await store.insert("scripts", user.id, { ...s, source: "varredura", sweepId: sweep.id, patternId: savedPatterns[i % savedPatterns.length]?.id, recorded: false }));
  }
  // devolve o que não foi entregue
  const delivered = COSTS.varredura(out.length);
  const back = cost - delivered;
  if (back > 0) await refund(user.id, back, label, "A varredura rendeu menos do que o previsto, e a diferença voltou para você.", sweep.id);
  await store.update("sweeps", sweep.id, user.id, { status: "pronto", refund: Math.max(0, back), delivered: out.length });
  return { sweepId: sweep.id, patterns: savedPatterns, scripts: out };
  }, sweepId);
});
