// Geradores de conteúdo. Sem IA ligada: por regras e modelos (sem custo, determinístico).
// Com um provedor ligado (lib/providers.ts), o texto vem da IA e o modelo local é a reserva.
import type { Post } from "./metrics";
import type { CarouselModel } from "./templates";
import { getAi, askText, readJson } from "./providers";
import { getStore } from "./store";
import { HttpError } from "./auth";

export type Persona = { answers: Record<string, string>; document?: string };
export type Business = {
  name: string;
  brand: string;
  offerMain: string;
  differentiator: string;
  method: string;
  focus: string;
  voice: { style: string; reference: string; never: string; always: string; cta: string };
};
export type Ctx = { persona: Persona; business: Business; userId?: string };

export type ScriptType = "viral" | "emocional" | "tecnico";
export type ScriptOut = { generator?: "ia" | "modelo"; type: ScriptType; dest: "reel" | "criativo"; seconds: number; title: string; hook: string; body: string; cta: string };
export type Pattern = { id?: string; label: string; hookType: "pergunta" | "numero" | "ordem" | "afirmacao"; format: string; captionLength: number; hasCta: boolean; examples: string[] };

const hash = (s: string) => [...s].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) | 0, 7);
const pick = <T,>(arr: T[], seed: number) => arr[Math.abs(seed) % arr.length];
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

export function applyVoice(text: string, b?: Business) {
  let t = text;
  if (/travess/i.test(b?.voice?.never ?? "")) t = t.replace(/\s?[—–]\s?/g, ", ");
  return t;
}
const lc = (s?: string) => (s ?? "").replace(/[.\s]+$/, "");

export type AiAnswer<T> = { on: boolean; data: T | null; error?: string };

/** Como llmJson, mas diz se havia IA ligada e por que não veio resposta. */
export async function askJson<T>(system: string, user: string, userId?: string): Promise<AiAnswer<T>> {
  let on = false;
  try {
    const cfg = await getAi("text", userId);
    if (!cfg) return { on, data: null };
    on = true;
    return { on, data: readJson<T>(await askText(cfg, system, user)) };
  } catch (e: any) {
    const error = e?.name === "TimeoutError" ? "a IA demorou demais para responder" : String(e?.message ?? e).slice(0, 200);
    console.error(error);
    return { on, data: null, error };
  }
}
export const llmJson = async <T>(system: string, user: string, userId?: string) => (await askJson<T>(system, user, userId)).data;

/** Para o que não tem modelo local: sem IA, pede para ligar; com IA, conta o que deu errado. */
export function aiFailure(a: AiAnswer<unknown>, off: string): HttpError {
  if (a.error) return new HttpError(502, `A IA não conseguiu agora (${a.error}). Tente de novo.`);
  return a.on ? new HttpError(502, "A IA respondeu fora do formato esperado. Tente de novo.") : new HttpError(400, off);
}

/** Resumo do negócio e da persona da conta, para pedidos fora dos geradores. */
export async function loadVoice(userId: string) {
  const s = getStore();
  const business = ((await s.list("business", userId))[0] as any) ?? { voice: {} };
  const persona = ((await s.list("persona", userId))[0] as any) ?? { answers: {} };
  return voiceBrief({ business: { ...business, voice: business.voice ?? {} }, persona }) + ` Negócio: ${business.brand || business.name || ""}. Oferta: ${business.offerMain ?? ""}.`;
}

export function voiceBrief(c: Ctx) {
  const v: Partial<Business["voice"]> = c.business.voice ?? {};
  const a = c.persona.answers ?? {};
  return `Voz: ${v.style ?? ""} Nunca usar: ${v.never ?? ""}. Sempre usar: ${v.always ?? ""}. CTA padrão: ${v.cta ?? ""}. Cliente: ${a.cliente ?? ""}. Dor: ${a.dor ?? ""}. Desejo: ${a.desejo ?? ""}. Método: ${c.business.method ?? ""}.`;
}

// ---------- roteiros ----------
export async function genScripts(c: Ctx, o: { type: ScriptType; dest: "reel" | "criativo"; theme?: string; n: number; seconds?: number; patterns?: Pattern[]; topics?: string[] }): Promise<ScriptOut[]> {
  const llm = await llmJson<ScriptOut[]>(
    "Você escreve roteiros curtos de vídeo em português do Brasil. Responda SOMENTE um array JSON de objetos {type,dest,seconds,title,hook,body,cta}.",
    `${voiceBrief(c)}\nEscreva ${o.n} roteiros do tipo ${o.type} para ${o.dest}. Tema: ${o.theme || "variado, dentro do nicho"}. Padrões de estrutura: ${JSON.stringify(o.patterns ?? [])}.`,
    c.userId,
  );
  if (llm && Array.isArray(llm) && llm.length) return llm.slice(0, o.n).map((s) => ({ ...s, generator: "ia" as const, type: o.type, dest: o.dest, hook: applyVoice(s.hook, c.business), body: applyVoice(s.body, c.business), cta: applyVoice(s.cta, c.business) }));

  const out: ScriptOut[] = [];
  for (let i = 0; i < o.n; i++) {
    const topic = o.theme?.trim() || o.topics?.[i % (o.topics.length || 1)] || c.persona.answers.dor || c.business.focus || "o seu assunto";
    const p = o.patterns?.length ? o.patterns[i % o.patterns.length] : undefined;
    out.push(templateScript(c, o.type, o.dest, topic, i, o.seconds, p));
  }
  return out;
}

function hookFor(kind: Pattern["hookType"] | undefined, topic: string, i: number, type: ScriptType, c: Ctx) {
  const t = lc(topic).toLowerCase();
  const dor = lc(c.persona.answers.dor || "isso").toLowerCase();
  const desejo = lc(c.persona.answers.desejo || "o que você quer").toLowerCase();
  const byKind: Record<string, string[]> = {
    pergunta: [`E se ${t} não fosse o problema de verdade?`, `Você já parou para pensar por que ${t} se repete na sua vida?`, `Quem te ensinou que ${t} é normal?`],
    numero: [`3 sinais de que ${t} está custando caro`, `Em 3 passos você muda ${t}`, `2 coisas que eu faria hoje sobre ${t}`],
    ordem: [`Pare de tratar ${t} como se fosse normal.`, `Respire e leia isto antes de falar de ${t}.`, `Anote isto sobre ${t}.`],
    afirmacao: [`${cap(t)} não é falta de esforço.`, `Ninguém te contou isto sobre ${t}.`, `O que trava ${desejo} não é o que você pensa.`],
  };
  const kinds: Pattern["hookType"][] = type === "viral" ? ["afirmacao", "ordem", "numero", "pergunta"] : type === "emocional" ? ["pergunta", "afirmacao"] : ["numero", "pergunta", "ordem"];
  const k = kind ?? kinds[i % kinds.length];
  void dor;
  return pick(byKind[k], i + hash(topic));
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function templateScript(c: Ctx, type: ScriptType, dest: "reel" | "criativo", topic: string, i: number, secs: number | undefined, p?: Pattern): ScriptOut {
  const b = c.business;
  const dor = lc(c.persona.answers.dor || topic);
  const desejo = lc(c.persona.answers.desejo || "viver melhor");
  const objecao = lc(c.persona.answers.objecao || "isso não é para mim");
  const steps = (b.method || "Clareza, Constância e Convite").split(/,| e /).map((x) => x.trim()).filter(Boolean);
  const hook = hookFor(p?.hookType, topic, i, type, c);
  const cta = b.voice.cta || "Acesse o link da bio.";
  let body = "";
  let seconds = secs ?? 30;
  if (type === "viral") {
    seconds = secs ?? pick([15, 20, 25, 30], i);
    body = `${cap(dor)}. Quase todo mundo acha que o problema é falta de força de vontade. Não é. O que falta é um caminho simples. Quando você troca ${lc(topic).toLowerCase()} por um passo pequeno e repetível, ${desejo.toLowerCase()} deixa de ser promessa e vira rotina. Concorda ou discorda? Me conta.`;
  } else if (type === "emocional") {
    seconds = secs ?? pick([30, 40, 45], i);
    body = `Teve um dia em que ${dor.toLowerCase()}. Eu sei como pesa. Você segura sozinha, sorri por fora e guarda por dentro. E aí vem a ideia de que ${objecao.toLowerCase()}. Mas olha: isso não define quem você é. Dar um primeiro passo, mesmo pequeno, já muda o caminho. ${cap(desejo.toLowerCase())} começa quando você decide ser gentil com você mesma e agir.`;
  } else {
    seconds = secs ?? 90;
    body = `Vou te mostrar como eu resolvo ${lc(topic).toLowerCase()} em ${steps.length} passos. ${steps.map((s, k) => `Passo ${k + 1}: ${s}. ${stepLine(s)}`).join(" ")} Resumindo: com ${steps.join(", ")}, você chega em ${desejo.toLowerCase()} sem depender de sorte.`;
  }
  const title = cap(clean(hook).replace(/[.?]$/, "")).slice(0, 80);
  return { generator: "modelo", type, dest, seconds, title, hook: applyVoice(hook, b), body: applyVoice(body, b), cta: applyVoice(cta, b) };
}
const stepLine = (s: string) => `Comece por ${s.toLowerCase()} hoje e anote o que mudou.`;

// ---------- padrões (Varredura) ----------
const score = (p: Post) => p.reach * 0.4 + p.likes + p.comments * 4 + p.saves * 6 + p.shares * 8;
export function analyzeTop(posts: Post[], n: number): Pattern[] {
  const top = [...posts].filter((p) => p.reach > 0).sort((a, b) => score(b) - score(a)).slice(0, n);
  const kindOf = (cap: string): Pattern["hookType"] => {
    const first = clean(cap).split(/(?<=[.!?])\s/)[0] ?? "";
    if (/\?/.test(first)) return "pergunta";
    if (/^\d/.test(first)) return "numero";
    if (/^(pare|salve|comente|anote|veja|saiba|respire|escreva)/i.test(first)) return "ordem";
    return "afirmacao";
  };
  return top.map((p, i) => ({
    label: `Padrão ${i + 1}`,
    hookType: kindOf(p.caption),
    format: p.type === "VIDEO" ? "reel" : p.type === "CAROUSEL_ALBUM" ? "carrossel" : "imagem",
    captionLength: clean(p.caption).length,
    hasCta: /(salve|comente|compartilh|link|me conta)/i.test(p.caption),
    examples: [clean(p.caption).split(/(?<=[.!?])\s/)[0] ?? ""],
  }));
}

/** Padrões de textos colados pelo dono (outro perfil, nicho ou um conteúdo), um bloco por parágrafo. */
export function patternsFromText(text: string, n: number): Pattern[] {
  const blocks = text.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean).slice(0, n);
  const posts = blocks.map((caption, i) => ({ id: `t${i}`, type: "VIDEO", publishedAt: "", caption, permalink: "", views: 0, reach: blocks.length - i, likes: 0, comments: 0, saves: 0, shares: 0 }) as Post);
  return analyzeTop(posts, n);
}

// ---------- carrossel ----------
export type Slide = { role: string; title: string; text: string };
export async function genCarousel(c: Ctx, o: { theme: string; model?: CarouselModel | null; pattern?: Pattern | null; language?: string }): Promise<Slide[]> {
  const roles = o.model?.roles ?? ["capa", "problema", "virada", "passo", "passo", "resultado", "convite"];
  const answer = await askJson<Slide[]>(
    "Você escreve textos de carrossel de Instagram em português do Brasil. Responda SOMENTE um array JSON de {role,title,text}.",
    `${voiceBrief(c)}\nTema: ${o.theme}. Slides (papéis): ${roles.join(", ")}. Idioma do texto: ${o.language ?? "pt-BR"}.`,
    c.userId,
  );
  const llm = answer.data;
  if (llm && Array.isArray(llm) && llm.length === roles.length) return llm.map((s) => ({ ...s, title: applyVoice(s.title, c.business), text: applyVoice(s.text, c.business) }));
  if (o.language && o.language !== "pt-BR") throw aiFailure(answer, "Para escrever em outro idioma ligue uma IA em IA e integrações.");
  const t = lc(o.theme);
  const dor = lc(c.persona.answers.dor || t).toLowerCase();
  const desejo = lc(c.persona.answers.desejo || "chegar lá").toLowerCase();
  const objecao = lc(c.persona.answers.objecao || "isso não é para mim").toLowerCase();
  const steps = (c.business.method || "Clareza, Constância e Convite").split(/,| e /).map((x) => x.trim()).filter(Boolean);
  const proof = lc((c.business as any).proof);
  const how = [
    (s: string) => `Defina em uma frase o que significa ${s.toLowerCase()} na sua rotina.`,
    (s: string) => `Escolha um horário fixo para praticar ${s.toLowerCase()} nesta semana.`,
    (s: string) => `Anote o que travou ao tentar ${s.toLowerCase()} e ajuste um detalhe por vez.`,
    (s: string) => `Mostre para alguém o que mudou depois de aplicar ${s.toLowerCase()}.`,
    (s: string) => `Revise ${s.toLowerCase()} no fim da semana e mantenha só o que funcionou.`,
    (s: string) => `Transforme ${s.toLowerCase()} em um combinado simples com a sua agenda.`,
  ];
  const pain = [`Se isso é familiar, você não está sozinha.`, `O custo aparece aos poucos: tempo, energia e oportunidade.`, `Quase sempre o problema é falta de caminho, e não de esforço.`];
  const win = [`Quando o caminho fica claro, ${desejo} passa a ter data.`, `O sinal de avanço é conseguir repetir sem depender de inspiração.`, `Compare com a semana passada, não com o perfil de outra pessoa.`];
  const other = [
    `Observe como ${t.toLowerCase()} aparece no seu dia antes de mudar qualquer coisa.`,
    `Escolha um único ponto de ${t.toLowerCase()} para melhorar primeiro.`,
    `Dê um exemplo real seu: ele convence mais que qualquer teoria.`,
    `Pergunte-se o que faria diferente se começasse hoje.`,
    `Simplifique: o que não cabe em uma frase ainda não está claro.`,
    `Registre o resultado para saber o que repetir.`,
    `Volte a este ponto daqui a sete dias.`,
    `Compartilhe o aprendizado com quem está no mesmo momento.`,
  ];
  const seen: Record<string, number> = {};
  let stepIdx = 0;
  const used = { title: new Set<string>(), text: new Set<string>() };
  const unique = (kind: "title" | "text", value: string, alternatives: string[]) => {
    let v = value;
    for (let i = 0; used[kind].has(v) && i < alternatives.length; i++) v = alternatives[i];
    for (let k = 2; used[kind].has(v); k++) v = `${value} (${k})`;
    used[kind].add(v);
    return v;
  };
  return roles.map((role, i) => {
    const nth = (seen[role] = (seen[role] ?? 0) + 1);
    const label = nth > 1 || roles.filter((x) => x === role).length > 1 ? `${cap(role)} ${nth}` : cap(role);
    let title = "";
    let text = "";
    if (i === 0) {
      title = o.model ? o.model.title.replace(/^./, (m) => m.toUpperCase()) + `: ${t}` : cap(t);
      text = "Passe para o lado";
    } else if (/convite/.test(role)) {
      title = c.business.voice.cta || "Fale comigo";
      text = `Salve este post e envie para quem precisa de ${t.toLowerCase()}.`;
    } else if (/passo|item|método|aplicação|correção/.test(role)) {
      const s = steps[stepIdx % steps.length];
      title = `${stepIdx + 1}. ${cap(s)}`;
      text = how[stepIdx % how.length](s);
      stepIdx++;
    } else if (/garantia/.test(role)) {
      title = "A sua garantia";
      text = "Escreva aqui a condição real que você oferece. Se não houver, apague este slide.";
    } else if (/prova/.test(role)) {
      title = "O que já aconteceu";
      text = proof ? `${cap(proof)}.` : "Coloque aqui um resultado real, com autorização de quem viveu.";
    } else if (/inclui|solução/.test(role)) {
      title = /inclui/.test(role) ? "O que você leva" : cap(lc(c.business.differentiator) || "Como eu resolvo");
      text = /inclui/.test(role) ? cap(lc(c.business.offerMain) || "Descreva o que está incluído") + "." : `${steps.join(", ")}: nesta ordem.`;
    } else if (/para quem/.test(role)) {
      title = "Para quem é";
      text = `Para ${lc(c.persona.answers.cliente || "quem quer " + desejo).toLowerCase()}.`;
    } else if (/dor|dúvida|situação|conflito|erro|problema|lado A|parece/.test(role)) {
      title = /dúvida|parece/.test(role) ? cap(objecao).slice(0, 70) : nth > 1 || /erro/.test(role) ? label : cap(dor).slice(0, 70);
      text = pain[(i - 1) % pain.length];
    } else if (/resultado|virada|conclusão|resumo|lição|mudou/.test(role)) {
      title = /resultado/.test(role) ? cap(desejo).slice(0, 70) : label;
      text = win[(i - 1) % win.length];
    } else {
      title = `${label}: ${t.toLowerCase()}`.slice(0, 70);
      text = other[(i - 1) % other.length];
    }
    title = unique("title", title, [label, `${label}: ${t.toLowerCase()}`.slice(0, 70)]);
    text = unique("text", text, [...other, ...win, ...pain]);
    return { role, title: applyVoice(title, c.business), text: applyVoice(text, c.business) };
  });
}

// ---------- série, isca, persona ----------
export async function genSeries(c: Ctx, o: { theme: string; chapters: number }) {
  const angles = ["O ponto de partida", "O que está travando", "O primeiro passo", "O erro mais comum", "O que muda quando você age", "Como manter o ritmo", "O próximo nível", "Perguntas que sempre aparecem", "Casos do dia a dia", "O fechamento"];
  const ai = await llmJson<ScriptOut[]>(
    "Você escreve séries de vídeos curtos em português do Brasil. Responda SOMENTE um array JSON de {type,seconds,title,hook,body,cta}, com type viral, emocional ou tecnico.",
    `${voiceBrief(c)}\nSérie em ${o.chapters} capítulos sobre: ${o.theme}. Cada capítulo continua o anterior.`,
    c.userId,
  );
  if (Array.isArray(ai) && ai.length === o.chapters && ai.every((s) => s?.hook && s?.body))
    return ai.map((s, i): ScriptOut => ({ generator: "ia", dest: "reel", type: (["viral", "emocional", "tecnico"] as const).includes(s.type) ? s.type : "viral", seconds: Number(s.seconds) || 45, title: s.title || `Capítulo ${i + 1}`, hook: applyVoice(s.hook, c.business), body: applyVoice(s.body, c.business), cta: applyVoice(s.cta || c.business.voice?.cta || "", c.business) }));
  const scripts: ScriptOut[] = [];
  for (let i = 0; i < o.chapters; i++) {
    const type: ScriptType = i % 3 === 0 ? "viral" : i % 3 === 1 ? "emocional" : "tecnico";
    const s = templateScript(c, type, "reel", `${o.theme}: ${angles[i % angles.length].toLowerCase()}`, i, undefined);
    s.title = `Capítulo ${i + 1}: ${angles[i % angles.length]}`;
    scripts.push(s);
  }
  return scripts;
}

export async function genIsca(c: Ctx, o: { keyword: string; title?: string; source?: string }) {
  const steps = (c.business.method || "Clareza, Constância e Convite").split(/,| e /).map((x) => x.trim()).filter(Boolean);
  const title = o.title?.trim() || `Guia ${o.keyword.toUpperCase()}`;
  const ai = await llmJson<{ title: string; sections: { h: string; p: string }[] }>(
    "Você escreve materiais gratuitos curtos em português do Brasil. Responda SOMENTE um objeto JSON {title,sections:[{h,p}]}. Não invente números nem depoimentos.",
    `${voiceBrief(c)}\nMaterial entregue a quem digita ${o.keyword}. Título desejado: ${title}. Base: ${clean(o.source ?? "").slice(0, 4000)}`,
    c.userId,
  );
  if (ai?.sections?.length && ai.sections.every((s) => s?.h && s?.p))
    return { title: o.title?.trim() || ai.title || title, sections: ai.sections.slice(0, 12).map((s) => ({ h: applyVoice(s.h, c.business), p: applyVoice(s.p, c.business) })) };
  const sections = [
    { h: "Por que este guia existe", p: `Você pediu ${o.keyword.toUpperCase()}. Este material mostra o primeiro passo para ${lc(c.persona.answers.desejo || "avançar").toLowerCase()}, sem enrolação.` },
    ...steps.map((s, i) => ({ h: `Passo ${i + 1}: ${cap(s)}`, p: `${cap(s)} é a base. Reserve 15 minutos hoje, escreva em uma frase o que você quer e escolha uma ação pequena para fazer ainda esta semana.${o.source ? " (Baseado no conteúdo: " + clean(o.source).slice(0, 120) + "...)" : ""}` })),
    { h: "Seu próximo passo", p: c.business.voice.cta || "Fale comigo pelo link da bio." },
  ];
  return { title, sections: sections.map((s) => ({ h: applyVoice(s.h, c.business), p: applyVoice(s.p, c.business) })) };
}

export function genPersonaDoc(a: Record<string, string>, b: Business) {
  const extra = b as unknown as Record<string, string>;
  const v = (x: string | undefined, fallback = "ainda sem resposta") => (x && x.trim() ? x.trim().replace(/\.+$/, "") : fallback);
  const cliente = v(a.cliente), dor = v(a.dor), desejo = v(a.desejo), objecao = v(a.objecao), decisao = v(a.decisao);
  const brand = v(b.brand || b.name, "seu negócio");
  const method = v(b.method, "um método em passos curtos");
  const steps = (b.method || "Clareza, Constância e Convite").split(/,| e /).map((x) => x.trim()).filter(Boolean);
  const cta = v(b.voice?.cta, "um convite claro");
  const section = (title: string, ...paragraphs: string[]) => `## ${title}\n\n${paragraphs.join("\n\n")}`;
  return [
    `# Persona de ${brand}`,
    "Documento montado a partir das suas respostas. Ele organiza o que você informou e sugere como usar; não substitui conversas com clientes de verdade.",
    section("Quem é", `${cliente}.`, `Antes de escrever, imagine uma única pessoa com esse perfil, com nome e rotina. Texto escrito para uma pessoa soa mais verdadeiro do que texto escrito para um público.`),
    section("A dor", `Em uma frase: ${dor}.`, `Use essa frase como abertura de conteúdo, com as palavras que essa pessoa usaria. Mostre a cena em que a dor aparece: o horário, o lugar, o que ela pensa naquele momento. Evite diagnosticar ou culpar.`),
    section("O desejo", `O que ela quer ver na própria vida: ${desejo}.`, `Descreva o desejo como algo observável. Quando possível, diga como seria um dia comum depois da mudança. Não prometa prazo nem resultado que você não controla.`),
    section("A objeção", `O que ela diz para não decidir: ${objecao}.`, `Responda a essa objeção antes que ela seja feita. Reconheça que é legítima, dê um exemplo real e proponha um primeiro passo que reduza o risco de começar.`),
    section("Como decide", `${decisao}.`, `Entregue o que ela precisa ver nesse processo, na ordem em que precisa. Cada conteúdo deve cumprir um papel: atrair, criar confiança ou convidar.`),
    section("O que você oferece", `Produto principal: ${v(b.offerMain)}.`, `Entrada: ${v(extra.offerEntry)}. Opção mais completa: ${v(extra.offerPremium)}.`, `O seu diferencial: ${v(b.differentiator)}. O seu método: ${method}.`),
    section("A prova", `${v(extra.proof, "Nenhuma prova registrada ainda")}.`, "Só publique números e depoimentos reais e autorizados. Na falta deles, mostre o processo: bastidor, raciocínio e critério."),
    section("Como falar com essa pessoa", `Estilo: ${v(b.voice?.style)}. Referência: ${v(b.voice?.reference)}.`, `Sempre usar: ${v(b.voice?.always)}. Nunca usar: ${v(b.voice?.never)}.`, `Comece pela dor em uma frase concreta, mostre um caminho simples (${method}) e termine com: ${cta}.`),
    section("Ganchos para testar", [`- E se o problema não for o que parece quando se fala em ${dor.toLowerCase()}?`, `- 3 sinais de que ${dor.toLowerCase()} já está custando caro`, `- O que eu faria hoje para chegar em ${desejo.toLowerCase()}`, `- "${objecao}": o que existe por trás dessa frase`, `- Um dia comum de quem conquistou ${desejo.toLowerCase()}`].join("\n")),
    section("Roteiro de conteúdo", ...steps.map((s, i) => `**${i + 1}. ${s}.** Explique o que é, mostre um erro comum nessa etapa, dê um exercício de cinco minutos e convide para o próximo passo. Cada etapa rende um conteúdo viral (a frase que chama), um emocional (a história que aproxima) e um técnico (o passo a passo que ensina).`)),
    section("O que revisar todo mês", "- A frase da dor ainda é a que os clientes usam?\n- Qual objeção apareceu mais nas conversas?\n- Que conteúdo gerou mensagem, e não só curtida?\n- O convite final continua levando para o lugar certo?"),
  ].join("\n\n");
}

// ---------- notícias ----------
export function newsAngle(c: Ctx, title: string, summary: string) {
  const t = clean(title);
  return `Gancho: "${t}". Por que importa para ${lc(c.persona.answers.cliente || "seu público").toLowerCase()}: ${clean(summary).slice(0, 220)} Conecte com ${lc(c.persona.answers.dor || "a dor do seu cliente").toLowerCase()} e termine com ${c.business.voice.cta || "um convite claro"}.`;
}
