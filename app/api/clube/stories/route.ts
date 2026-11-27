import { route, loadCtx, bad } from "@/lib/api";
import { getStore } from "@/lib/store";
import { applyVoice } from "@/lib/ai";

// Sequência de stories: 5 telas com intenção definida, na voz do negócio.
export const POST = route(async (user, req) => {
  const b = await req.json();
  const goal = String(b.goal ?? "").trim().slice(0, 200);
  if (!goal) bad("Diga o objetivo da sequência.");
  const ctx = await loadCtx(user.id);
  const dor = (ctx.persona.answers.dor || goal).toLowerCase();
  const cta = ctx.business.voice?.cta || "Responda esta mensagem para saber mais.";
  const frames = [
    { role: "Abertura", text: `Pergunta rápida: você também sente isso? ${dor}` },
    { role: "Contexto", text: `Eu já vi muita gente travada em ${goal.toLowerCase()}. Vou te mostrar o que mudou o jogo.` },
    { role: "Virada", text: `O ponto é simples: ${ctx.business.differentiator || "dar um passo pequeno por dia"}.` },
    { role: "Prova", text: (ctx.business as any).proof || "Mostre aqui um resultado real ou um print de mensagem (com autorização)." },
    { role: "Convite", text: cta },
  ].map((f) => ({ ...f, text: applyVoice(f.text, ctx.business) }));
  return getStore().insert("stories", user.id, { goal, frames });
});
