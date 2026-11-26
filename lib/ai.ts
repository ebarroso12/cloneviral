// Geradores de conteúdo. Modo padrão: por regras e modelos (sem custo, determinístico).
// Se ANTHROPIC_API_KEY estiver definida, roteiros e carrosséis passam por um modelo de linguagem (chamada paga, opt-in).
import type { Post } from "./metrics";
import type { CarouselModel } from "./templates";

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
export type Ctx = { persona: Persona; business: Business };

export type ScriptType = "viral" | "emocional" | "tecnico";
export type ScriptOut = { type: ScriptType; dest: "reel" | "criativo"; seconds: number; title: string; hook: string; body: string; cta: string };
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

export async function llmJson<T>(system: string, user: string): Promise<T | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5", max_tokens: 4000, system, messages: [{ role: "user", content: user }] }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const text: string = j.content?.[0]?.text ?? "";
    const m = text.match(/[\[{][\s\S]*[\]}]/);
    return m ? (JSON.parse(m[0]) as T) : null;
  } catch {
    return null;
  }
}

function voiceBrief(c: Ctx) {
  const v = c.business.voice;
  return `Voz: ${v.style} Nunca usar: ${v.never}. Sempre usar: ${v.always}. CTA padrão: ${v.cta}. Cliente: ${c.persona.answers.cliente ?? ""}. Dor: ${c.persona.answers.dor ?? ""}. Desejo: ${c.persona.answers.desejo ?? ""}. Método: ${c.business.method}.`;
}

// ---------- roteiros ----------
export async function genScripts(c: Ctx, o: { type: ScriptType; dest: "reel" | "criativo"; theme?: string; n: number; seconds?: number; patterns?: Pattern[]; topics?: string[] }): Promise<ScriptOut[]> {
  const llm = await llmJson<ScriptOut[]>(
    "Você escreve roteiros curtos de vídeo em português do Brasil. Responda SOMENTE um array JSON de objetos {type,dest,seconds,title,hook,body,cta}.",
    `${voiceBrief(c)}\nEscreva ${o.n} roteiros do tipo ${o.type} para ${o.dest}. Tema: ${o.theme || "variado, dentro do nicho"}. Padrões de estrutura: ${JSON.stringify(o.patterns ?? [])}.`,
  );
  if (llm && Array.isArray(llm) && llm.length) return llm.slice(0, o.n).map((s) => ({ ...s, type: o.type, dest: o.dest, hook: applyVoice(s.hook, c.business), body: applyVoice(s.body, c.business), cta: applyVoice(s.cta, c.business) }));

  const out: ScriptOut[] = [];
  for (let i = 0; i < o.n; i++) {
    const topic = o.theme?.trim() || o.topics?.[i % (o.topics.length || 1)] || c.persona.answers.dor || c.business.focus;
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
  return { type, dest, seconds, title, hook: applyVoice(hook, b), body: applyVoice(body, b), cta: applyVoice(cta, b) };
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

// ---------- carrossel ----------
export type Slide = { role: string; title: string; text: string };
export async function genCarousel(c: Ctx, o: { theme: string; model?: CarouselModel | null; pattern?: Pattern | null; language?: string }): Promise<Slide[]> {
  const roles = o.model?.roles ?? ["capa", "problema", "virada", "passo", "passo", "resultado", "convite"];
  const llm = await llmJson<Slide[]>(
    "Você escreve textos de carrossel de Instagram em português do Brasil. Responda SOMENTE um array JSON de {role,title,text}.",
    `${voiceBrief(c)}\nTema: ${o.theme}. Slides (papéis): ${roles.join(", ")}. Idioma do texto: ${o.language ?? "pt-BR"}.`,
  );
  if (llm && Array.isArray(llm) && llm.length === roles.length) return llm.map((s) => ({ ...s, title: applyVoice(s.title, c.business), text: applyVoice(s.text, c.business) }));
  const t = lc(o.theme);
  const dor = lc(c.persona.answers.dor || t).toLowerCase();
  const desejo = lc(c.persona.answers.desejo || "chegar lá").toLowerCase();
  const steps = (c.business.method || "Clareza, Constância e Convite").split(/,| e /).map((x) => x.trim()).filter(Boolean);
  let stepIdx = 0;
  return roles.map((role, i) => {
    let title = "";
    let text = "";
    if (role === "capa") {
      title = o.model ? o.model.title.replace(/^./, (m) => m.toUpperCase()) + `: ${t}` : cap(t);
      text = "Passe para o lado";
    } else if (/convite/.test(role)) {
      title = c.business.voice.cta || "Fale comigo";
      text = `Salve este post e envie para quem precisa de ${t.toLowerCase()}.`;
    } else if (/passo|item|método|aplicação|correção/.test(role)) {
      const s = steps[stepIdx++ % steps.length];
      title = `${stepIdx}. ${cap(s)}`;
      text = `Comece por ${s.toLowerCase()} hoje. Pequeno, simples e repetível.`;
    } else if (/dor|dúvida|situação|conflito|erro|problema|lado A/.test(role)) {
      title = cap(dor).slice(0, 70);
      text = "Se isso é familiar, você não está sozinha. Existe um caminho mais leve.";
    } else if (/resultado|prova|virada|conclusão|resumo|lição|mudou/.test(role)) {
      title = cap(desejo).slice(0, 70);
      text = `Quando você aplica ${steps.join(", ").toLowerCase()}, ${desejo} deixa de ser promessa.`;
    } else {
      title = `${cap(role)} sobre ${t.toLowerCase()}`.slice(0, 70);
      text = `Um ponto sobre ${t.toLowerCase()} que muda a forma de agir: comece pequeno e seja constante.`;
    }
    return { role, title: applyVoice(title, c.business), text: applyVoice(text, c.business) };
  });
}

// ---------- série, isca, persona ----------
export async function genSeries(c: Ctx, o: { theme: string; chapters: number }) {
  const angles = ["O ponto de partida", "O que está travando", "O primeiro passo", "O erro mais comum", "O que muda quando você age", "Como manter o ritmo", "O próximo nível", "Perguntas que sempre aparecem", "Casos do dia a dia", "O fechamento"];
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
  const sections = [
    { h: "Por que este guia existe", p: `Você pediu ${o.keyword.toUpperCase()}. Este material mostra o primeiro passo para ${lc(c.persona.answers.desejo || "avançar").toLowerCase()}, sem enrolação.` },
    ...steps.map((s, i) => ({ h: `Passo ${i + 1}: ${cap(s)}`, p: `${cap(s)} é a base. Reserve 15 minutos hoje, escreva em uma frase o que você quer e escolha uma ação pequena para fazer ainda esta semana.${o.source ? " (Baseado no conteúdo: " + clean(o.source).slice(0, 120) + "...)" : ""}` })),
    { h: "Seu próximo passo", p: c.business.voice.cta || "Fale comigo pelo link da bio." },
  ];
  return { title, sections: sections.map((s) => ({ h: applyVoice(s.h, c.business), p: applyVoice(s.p, c.business) })) };
}

export function genPersonaDoc(a: Record<string, string>, b: Business) {
  const lines = [
    `# Persona de ${b.brand || b.name}`,
    `**Quem é:** ${a.cliente || "a definir"}`,
    `**Dor principal:** ${a.dor || "a definir"}`,
    `**Desejo:** ${a.desejo || "a definir"}`,
    `**Objeção:** ${a.objecao || "a definir"}`,
    `**Como decide:** ${a.decisao || "a definir"}`,
    `\n## Como falar com ela\nComece pela dor em uma frase concreta, mostre que existe um caminho simples (${b.method || "seu método"}) e feche com um convite claro. Evite promessas garantidas.`,
  ];
  return lines.join("\n\n");
}

// ---------- notícias ----------
export function newsAngle(c: Ctx, title: string, summary: string) {
  const t = clean(title);
  return `Gancho: "${t}". Por que importa para ${lc(c.persona.answers.cliente || "seu público").toLowerCase()}: ${clean(summary).slice(0, 220)} Conecte com ${lc(c.persona.answers.dor || "a dor do seu cliente").toLowerCase()} e termine com ${c.business.voice.cta || "um convite claro"}.`;
}
