// Dados de demonstração 100% sintéticos (nenhum dado de pessoa real).
import { getStore, flushStore, uid } from "./store";
import { hashPassword } from "./password";
import type { Post, Snap, Audience, PostType } from "./metrics";

export const DEMO_EMAIL = "demo@radarviral.app";
export const DEMO_PASSWORD = "demo-radar-2026";

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function grantTrial(userId: string) {
  await getStore().insert("ledger", userId, { at: new Date().toISOString(), kind: "grant", amount: 30, label: "Trial de 30 dias" });
}

let seeding: Promise<void> | null = null;
export function ensureSeed() {
  seeding ||= doSeed();
  return seeding;
}

const HOOKS = [
  "Você já percebeu que",
  "O erro que quase todo mundo comete:",
  "3 coisas que ninguém te conta sobre",
  "Pare de fazer isso se você quer",
  "A verdade sobre",
  "Como eu organizei",
  "O que aprendi depois de 5 anos com",
  "Se você está começando em",
  "Ninguém fala sobre isso, mas",
  "Passo a passo simples para",
];
const TOPICS = ["vendas pelo Instagram", "rotina de conteúdo", "preço e valor", "clientes difíceis", "constância", "atendimento", "marca pessoal", "produtividade", "metas do mês", "primeiros clientes"];
const CTAS = ["Salve para ver depois.", "Comente EU QUERO e eu te envio.", "Compartilhe com quem precisa.", "Link na bio.", "Me conta nos comentários."];

const COUNTRIES: [string, number][] = [["Brasil", 0.968], ["Estados Unidos", 0.007], ["Portugal", 0.006], ["Espanha", 0.003], ["Angola", 0.003], ["Reino Unido", 0.002], ["França", 0.002], ["Itália", 0.002], ["Alemanha", 0.001], ["Canadá", 0.001]];
const EXTRA_COUNTRIES = ["Paraguai", "Colômbia", "Chile", "Argentina", "Japão", "Austrália", "Irlanda", "México", "Peru", "Bélgica", "Suíça", "Holanda", "Uruguai", "Moçambique", "Venezuela", "Índia", "China", "Rússia", "Honduras", "Quênia", "Nigéria", "Paquistão", "Bangladesh", "Iêmen", "Nova Zelândia", "Cabo Verde", "Suécia", "Noruega", "Polônia", "Turquia", "Egito", "África do Sul", "Equador", "Bolívia", "Costa Rica", "Panamá", "Cuba", "Haiti", "Líbano", "Israel"];
const CITIES: [string, number][] = [["Campinas, SP", 22], ["São Paulo, SP", 14], ["Ribeirão Preto, SP", 6], ["Belo Horizonte, MG", 4], ["Rio de Janeiro, RJ", 4], ["Goiânia, GO", 3.5], ["Curitiba, PR", 3], ["Uberlândia, MG", 3], ["Fortaleza, CE", 2.5], ["Brasília, DF", 2.5], ["Salvador, BA", 2], ["Porto Alegre, RS", 2], ["Sorocaba, SP", 2], ["Santos, SP", 1.8], ["Jundiaí, SP", 1.7], ["Manaus, AM", 1.5], ["Recife, PE", 1.5], ["São José dos Campos, SP", 1.4], ["Piracicaba, SP", 1.3], ["Limeira, SP", 1.2], ["Americana, SP", 1.1], ["Londrina, PR", 1], ["Florianópolis, SC", 1], ["Vitória, ES", 0.9], ["Teresina, PI", 0.8], ["Cuiabá, MT", 0.8], ["Natal, RN", 0.7], ["Maceió, AL", 0.7], ["Joinville, SC", 0.6], ["Bauru, SP", 0.6]];

export function buildDemo(seed = 7, today = new Date()) {
  const rnd = mulberry32(seed);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const followersNow = 11240;

  // snapshots: 40 dias
  const snaps: Snap[] = [];
  let f = followersNow - 60;
  for (let i = 39; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    f += Math.round(1 + rnd() * 3 - (rnd() < 0.15 ? 3 : 0));
    snaps.push({ date: d.toISOString().slice(0, 10), followers: i === 0 ? followersNow : f, following: 1180 + Math.round(rnd() * 6), mediaCount: 2000, reach: Math.round(280 + rnd() * 520 + (i % 7 === 0 ? 400 : 0)) });
  }
  // garante que o último valor de seguidores seja o atual e a série seja crescente em média
  snaps[snaps.length - 1].followers = followersNow;

  // posts: 2000 desde 02/06/2021
  const start = Date.UTC(2021, 5, 2);
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const posts: Post[] = [];
  for (let i = 0; i < 2000; i++) {
    const t = rnd();
    const type: PostType = t < 0.595 ? "IMAGE" : t < 0.84 ? "VIDEO" : "CAROUSEL_ALBUM";
    const age = i / 2000; // 0 antigo → 1 recente
    const when = new Date(start + (end - start) * (0.0 + age) + rnd() * 86400000 * 0.9);
    const viral = rnd() < 0.012 ? 8 + rnd() * 30 : 1;
    const base = 160 + 430 * age + rnd() * 260;
    const reach = Math.round(base * (type === "VIDEO" ? 1.8 : type === "CAROUSEL_ALBUM" ? 1.1 : 0.85) * viral);
    const views = Math.round(reach * (1.25 + rnd() * 0.9));
    const likes = Math.round(reach * (0.045 + rnd() * 0.05) * (type === "VIDEO" ? 1 : 1.1));
    const comments = Math.round(likes * (0.015 + rnd() * 0.06));
    const saves = Math.round(likes * (type === "CAROUSEL_ALBUM" ? 0.05 : 0.018) * (0.5 + rnd()));
    const shares = Math.round(likes * (type === "VIDEO" ? 0.07 : 0.022) * (0.4 + rnd() * 1.2));
    const topic = pick(TOPICS);
    const caption = rnd() < 0.06 ? "" : `${pick(HOOKS)} ${topic}. ${pick(CTAS)}`;
    posts.push({
      id: `demo_${i}`,
      type,
      publishedAt: when.toISOString(),
      caption,
      permalink: "",
      views,
      reach,
      likes,
      comments,
      saves,
      shares,
    });
  }
  posts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  // audiência
  const classified = Math.round(followersNow * 0.94);
  const share = (w: number[]) => {
    const s = w.reduce((a, b) => a + b, 0);
    return w.map((x) => Math.round((x / s) * classified));
  };
  const ageKeys = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
  const ageVals = share([0.6, 5.2, 24, 33, 24, 10, 3.2]);
  const gender = share([67, 23, 10]);
  const countries: Record<string, number> = {};
  for (const [name, p] of COUNTRIES) countries[name] = Math.round(classified * p);
  EXTRA_COUNTRIES.slice(0, 35).forEach((c, i) => (countries[c] = Math.max(1, 6 - Math.floor(i / 7))));
  const cities: Record<string, number> = {};
  const cs = CITIES.reduce((a, [, w]) => a + w, 0);
  for (const [name, w] of CITIES) cities[name] = Math.round(((w / cs) * classified) * 0.8);
  const audience: Audience = {
    classifiedTotal: classified,
    age: Object.fromEntries(ageKeys.map((k, i) => [k, ageVals[i]])),
    gender: { F: gender[0], M: gender[1], U: gender[2] },
    countries,
    cities,
  };
  return { snaps, posts, audience };
}

async function doSeed() {
  const store = getStore();
  const existing = await store.findOne("users", (u) => u.email === DEMO_EMAIL);
  if (existing) return;
  const id = uid();
  await store.insert("users", id, { name: "Marina Costa", email: DEMO_EMAIL, password: hashPassword(DEMO_PASSWORD), plan: "trial", trialEndsAt: new Date(Date.now() + 30 * 86400000).toISOString(), demo: true }, id);
  await grantTrial(id);
  await seedAccount(id);
  flushStore();
}

export async function seedAccount(userId: string) {
  const store = getStore();
  const { snaps, posts, audience } = buildDemo();
  await store.insert("ig_connection", userId, {
    demo: true,
    igUsername: "marinacosta.demo",
    name: "Marina Costa | Mentora de Negócios",
    bio: "Ajudo mulheres a venderem com leveza e constância.\nMentoria Brilho | link abaixo",
    link: "marinacosta.example.com",
    status: "connected",
    authorizedUntil: new Date(Date.now() + 90 * 86400000).toISOString(),
    measuringSince: snaps[0].date,
    lastSync: new Date().toISOString(),
  }, "conn");
  for (const s of snaps) await store.insert("snapshots", userId, s, `snap_${s.date}`);
  for (const p of posts) await store.insert("posts", userId, p as any, p.id);
  await store.insert("audience", userId, audience as any, "aud");
  await store.insert("persona", userId, {
    answers: {
      cliente: "Mulheres empreendedoras que começaram um negócio e não sabem divulgar.",
      dor: "Medo de aparecer, falta de constância e vergonha de falar de preço.",
      desejo: "Ter clientes todo mês sem depender de indicação.",
      objecao: "Não tenho tempo e já tentei antes sem resultado.",
      decisao: "Decide depois de ver prova real e uma primeira aula gratuita.",
    },
    document: "Persona de exemplo: empreendedora de 30 a 45 anos, vende serviço, tem pouco tempo e muito receio de se expor.",
    source: "app",
    tunedPct: 100,
  }, "persona");
  await store.insert("business", userId, {
    name: "Marina Costa",
    brand: "Mentoria Brilho",
    offerMain: "Mentoria Brilho: 12 encontros para criar uma rotina simples de conteúdo e vendas.",
    offerEntry: "",
    offerPremium: "",
    differentiator: "Método em três passos: Clareza, Constância e Convite.",
    method: "Clareza, Constância e Convite",
    proof: "",
    channels: { instagram: "@marinacosta.demo", tiktok: "", youtube: "", whatsapp: "", site: "https://marinacosta.example.com" },
    focus: "Gerar inscrições para o encontro online e atrair novas mentoradas.",
    voice: { style: "Simples, direto e acolhedor, frases curtas e perguntas.", reference: "Fala como uma amiga que entende do assunto.", never: "Travessões, termos corporativos, promessas de resultado garantido.", always: "Exemplos do dia a dia e um próximo passo claro.", cta: "Quer caminhar comigo? Acesse o link da bio." },
  }, "business");
  await store.insert("editorial_line", userId, { viral: 3, emocional: 3, tecnico: 3 }, "line");
}
