// Assistente de Stories: formatos prontos sem custo; com uma IA ligada, escreve e ajusta na sua voz.
import { applyVoice, llmJson, voiceBrief, type Ctx } from "./ai";
import { HttpError } from "./auth";

export type Frame = { role: string; text: string };
export const FORMATS = [
  ["sequencia", "Sequência com convite"],
  ["enquete", "Enquete"],
  ["perguntas", "Caixinha de perguntas"],
  ["bastidor", "Bastidor"],
  ["oferta", "Oferta"],
] as const;
export type Format = (typeof FORMATS)[number][0];
export const COUNTS = [3, 5, 7];

function local(c: Ctx, format: Format, goal: string): Frame[] {
  const b = c.business;
  const dor = (c.persona.answers.dor || goal).toLowerCase();
  const desejo = (c.persona.answers.desejo || "chegar lá").toLowerCase();
  const objecao = c.persona.answers.objecao || "isso não é para mim";
  const cta = b.voice?.cta || "Responda esta mensagem para saber mais.";
  const proof = (b as any).proof || "Mostre aqui um resultado real ou um print de mensagem (com autorização).";
  const way = b.differentiator || "dar um passo pequeno por dia";
  const f = (role: string, text: string) => ({ role, text });
  const sets: Record<Format, Frame[]> = {
    sequencia: [f("Abertura", `Pergunta rápida: você também sente isso? ${dor}`), f("Contexto", `Eu já vi muita gente travada em ${goal.toLowerCase()}. Vou te mostrar o que mudou o jogo.`), f("Virada", `O ponto é simples: ${way}.`), f("Prova", proof), f("Convite", cta), f("Dúvida", `"${objecao}". Se você pensou nisso, responda aqui que eu explico.`), f("Último aviso", `Quem quer ${desejo} começa hoje. ${cta}`)],
    enquete: [f("Abertura", `Vamos falar de ${goal.toLowerCase()}? Vote no próximo.`), f("Enquete", `Isso acontece com você: ${dor}? Opções: "Sim, direto" e "Às vezes".`), f("Resposta", `Se votou sim, o primeiro ajuste é: ${way}.`), f("Enquete 2", `O que mais trava? Opções: "Tempo" e "${objecao}".`), f("Explicação", `${proof}`), f("Enquete 3", `Quer um passo a passo? Opções: "Quero" e "Depois".`), f("Convite", cta)],
    perguntas: [f("Abertura", `Hoje eu respondo sobre ${goal.toLowerCase()}.`), f("Caixinha", `Abra a caixinha de perguntas: "Qual a sua maior dúvida sobre ${goal.toLowerCase()}?"`), f("Resposta 1", `Pergunta comum: "${objecao}". Minha resposta: comece pequeno, com ${way}.`), f("Resposta 2", `Sobre ${dor}: observe quando acontece antes de tentar mudar.`), f("Resposta 3", `Sobre ${desejo}: defina como você vai saber que chegou.`), f("Prova", proof), f("Convite", cta)],
    bastidor: [f("Abertura", "Vem ver o que acontece antes de você ver o resultado."), f("Cena", `Mostre onde você prepara ${goal.toLowerCase()}, sem arrumar demais.`), f("Decisão", `Conte uma escolha que você faz sempre: ${way}.`), f("Erro", "Conte um erro seu e o que mudou depois dele."), f("Pergunta", "Você imaginava que era assim? Responda aqui."), f("Aprendizado", `O que isso tem a ver com você: ${desejo} pede constância.`), f("Convite", cta)],
    oferta: [f("Abertura", `Se ${dor}, preste atenção nos próximos.`), f("Oferta", `${b.offerMain || "Descreva o que você oferece"}: feito para ${desejo}.`), f("Como funciona", `${b.method || "Explique em três passos"}.`), f("Prova", proof), f("Objeção", `"${objecao}". Responda com um exemplo real.`), f("Para quem não é", "Diga para quem isto não serve. Isso dá confiança em quem fica."), f("Convite", cta)],
  };
  return sets[format];
}

export async function genStories(c: Ctx, o: { goal: string; format?: string; count?: number; previous?: Frame[]; instruction?: string }) {
  const format = (FORMATS.some(([k]) => k === o.format) ? o.format : "sequencia") as Format;
  const count = COUNTS.includes(Number(o.count)) ? Number(o.count) : 5;
  const ai = await llmJson<Frame[]>(
    "Você escreve sequências de Stories do Instagram em português do Brasil, curtas e faladas. Responda SOMENTE um array JSON de {role,text}.",
    `${voiceBrief(c)}\nObjetivo: ${o.goal}. Formato: ${format}. Quantidade de telas: ${count}. Não invente números, depoimentos nem promessas.${o.previous ? `\nSequência atual: ${JSON.stringify(o.previous)}. Ajuste pedido: ${o.instruction}` : ""}`,
    c.userId,
  );
  const ok = Array.isArray(ai) && ai.length > 0 && ai.every((x) => typeof x?.text === "string");
  if (o.previous && !ok) throw new HttpError(400, "Para ajustar com um pedido seu é preciso uma IA ligada em IA e integrações.");
  let frames: Frame[];
  if (ok) frames = ai!.slice(0, 10).map((x) => ({ role: String(x.role ?? "Tela").slice(0, 40), text: String(x.text).slice(0, 600) }));
  else {
    const all = local(c, format, o.goal);
    // com menos telas, a última continua sendo o convite
    const invite = all.find((x) => x.role === "Convite") ?? all[all.length - 1];
    frames = [...all.filter((x) => x !== invite).slice(0, count - 1), invite];
  }
  return { goal: o.goal, format, generator: ok ? ("ia" as const) : ("modelo" as const), frames: frames.map((x) => ({ ...x, text: applyVoice(x.text, c.business) })) };
}
