import { route, loadCtx, bad } from "@/lib/api";
import { getStore } from "@/lib/store";
import { genPersonaDoc, llmJson } from "@/lib/ai";

export const POST = route(async (user, req) => {
  const b = await req.json();
  const answers = (b.answers ?? {}) as Record<string, string>;
  if (!answers.cliente?.trim() || !answers.dor?.trim()) bad("Responda ao menos quem é o seu cliente e a dor dele.");
  const store = getStore();
  const ctx = await loadCtx(user.id);
  const cur = (await store.list("persona", user.id))[0];
  const filled = ["cliente", "dor", "desejo", "objecao", "decisao"].filter((k) => (answers[k] ?? "").trim().length > 8).length;
  const tunedPct = Math.round((filled / 5) * 100);
  const base = genPersonaDoc(answers, ctx.business);
  const ai = await llmJson<{ document: string }>(
    "Você escreve documentos de persona em português do Brasil, em Markdown. Responda SOMENTE um objeto JSON {document}. Não invente dados que não foram informados.",
    `Reescreva e aprofunde este documento, mantendo as seções:\n${base}`,
    user.id,
  );
  const fromAi = typeof ai?.document === "string" && ai.document.length > 400;
  const data = { answers, document: fromAi ? ai!.document : base, source: "app", generator: fromAi ? "ia" : "modelo", tunedPct };
  return cur ? store.update("persona", cur.id, user.id, data) : store.insert("persona", user.id, data);
});
