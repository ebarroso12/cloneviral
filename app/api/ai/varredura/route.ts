import { route, loadCtx, bad } from "@/lib/api";
import { getStore } from "@/lib/store";
import { charge, refund, COSTS } from "@/lib/credits";
import { genScripts, analyzeTop, type ScriptType, type Pattern } from "@/lib/ai";
import type { Post } from "@/lib/metrics";

const TARGETS = ["perfil", "um-perfil", "nicho", "conteudo"];
export const POST = route(async (user, req) => {
  const b = await req.json();
  const target = TARGETS.includes(b.target) ? b.target : "perfil";
  const types: ScriptType[] = (Array.isArray(b.types) ? b.types : []).filter((t: string) => ["viral", "emocional", "tecnico"].includes(t));
  if (!types.length) bad("Marque pelo menos um tipo de conteúdo.");
  if (target !== "perfil") bad("Por enquanto só a varredura do seu próprio perfil tem dado completo. Escolha 'Meu perfil'.");
  const analyze = [3, 5, 10].includes(Number(b.analyze)) ? Number(b.analyze) : 5;
  const scriptsN = Math.min(10, Math.max(1, Number(b.scripts ?? 5)));
  const store = getStore();
  const posts = (await store.list("posts", user.id)) as unknown as Post[];
  if (posts.length < 3) bad("Seu perfil ainda não tem posts medidos. Conecte o Instagram e sincronize.");
  const cost = COSTS.varredura(scriptsN);
  const sweep = await store.insert("sweeps", user.id, { target, dest: b.dest === "criativo" ? "criativo" : "reel", types, theme: String(b.theme ?? ""), analyze, scriptsN, duration: b.duration ?? "variado", status: "rodando", cost, refund: 0 });
  await charge(user.id, cost, `Varredura do seu perfil`, sweep.id);
  const patterns: Pattern[] = analyzeTop(posts, analyze);
  const savedPatterns = [];
  for (const p of patterns) savedPatterns.push(await store.insert("patterns", user.id, { ...p, sweepId: sweep.id }));
  const ctx = await loadCtx(user.id);
  const topics = patterns.map((p) => p.examples[0]).filter(Boolean);
  const out = [];
  for (let i = 0; i < scriptsN; i++) {
    const type = types[i % types.length];
    const [s] = await genScripts(ctx, { type, dest: sweep.dest, theme: sweep.theme, n: 1, seconds: b.duration && b.duration !== "variado" ? Number(b.duration) : undefined, patterns: [patterns[i % patterns.length]], topics: topics.length ? [topics[i % topics.length]] : undefined });
    if (s) out.push(await store.insert("scripts", user.id, { ...s, source: "varredura", sweepId: sweep.id, patternId: savedPatterns[i % savedPatterns.length]?.id, recorded: false }));
  }
  // devolve o que não foi entregue
  const delivered = COSTS.varredura(out.length);
  const back = cost - delivered;
  if (back > 0) await refund(user.id, back, "Varredura do seu perfil", "A varredura rendeu menos do que o previsto, e a diferença voltou para você.", sweep.id);
  await store.update("sweeps", sweep.id, user.id, { status: "pronto", refund: Math.max(0, back), delivered: out.length });
  return { sweepId: sweep.id, patterns: savedPatterns, scripts: out };
});
