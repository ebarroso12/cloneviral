import { route, loadCtx, bad } from "@/lib/api";
import { getStore } from "@/lib/store";
import { genSweep, analyzeTop, patternsFromText, type ScriptType, type Pattern } from "@/lib/ai";
import type { Post } from "@/lib/metrics";

export const maxDuration = 120;
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
  const sweep = await store.insert("sweeps", user.id, { target, dest: b.dest === "criativo" ? "criativo" : "reel", types, theme: String(b.theme ?? ""), analyze, scriptsN, duration: b.duration ?? "variado", status: "rodando" });
  const patterns: Pattern[] = target === "perfil" ? analyzeTop(posts, analyze) : pasted;
  const savedPatterns = [];
  for (const p of patterns) savedPatterns.push(await store.insert("patterns", user.id, { ...p, sweepId: sweep.id }));
  const ctx = await loadCtx(user.id);
  const topics = target === "perfil" ? patterns.map((p) => p.examples[0]).filter(Boolean) : [];
  const items = Array.from({ length: scriptsN }, (_, i) => ({ type: types[i % types.length], pattern: patterns[i % patterns.length], topic: topics.length ? topics[i % topics.length] : undefined }));
  const written = await genSweep(ctx, { dest: sweep.dest, theme: sweep.theme, seconds: b.duration && b.duration !== "variado" ? Number(b.duration) : undefined, items });
  const out = [];
  for (const [i, s] of written.entries())
    out.push(await store.insert("scripts", user.id, { ...s, source: "varredura", sweepId: sweep.id, patternId: savedPatterns[i % savedPatterns.length]?.id, recorded: false }));
  await store.update("sweeps", sweep.id, user.id, { status: "pronto", delivered: out.length });
  return { sweepId: sweep.id, patterns: savedPatterns, scripts: out };
});
