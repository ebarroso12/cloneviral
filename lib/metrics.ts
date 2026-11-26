// Cálculo de todas as métricas do painel. Funções puras: recebem posts, snapshots e audiência.
// Fórmulas verificadas contra a tela original (ver replica/recon.md).

export type PostType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
export type Post = {
  id: string;
  type: PostType;
  publishedAt: string;
  caption: string;
  permalink: string;
  thumbnailUrl?: string;
  views: number;
  reach: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
};
export type Snap = { date: string; followers: number; following: number; mediaCount: number; reach: number };
export type Audience = {
  classifiedTotal: number;
  age: Record<string, number>;
  gender: { F: number; M: number; U: number };
  countries: Record<string, number>;
  cities: Record<string, number>;
};
export type Period = "hoje" | "ontem" | "7d" | "30d";
export type TopMetric = "views" | "reach" | "likes" | "comments" | "saves" | "shares";

export const HEALTHY = {
  engagementBand: [3, 6] as const, // engajamento real, %
  reachPerFollowers: 0.15, // alcance médio por post / seguidores
  interactionsPer100: 5.0, // curtidas+comentários médios por 100 seguidores
  commentsPerLike: 0.125, // hipótese calibrada (ver recon.md)
};
export const WEIGHTS = { reach: 44, engagement: 30, conversation: 26 } as const;

export const TYPE_LABEL: Record<PostType, string> = { IMAGE: "Imagem", VIDEO: "Reels e vídeos", CAROUSEL_ALBUM: "Carrossel" };

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const r2 = (x: number) => Math.round(x * 100) / 100;

export type ActionTip = { key: "alcance" | "engajamento" | "conversa"; points: number; title: string; text: string };

export function computeMetrics(posts: Post[], snaps: Snap[], audience: Audience | null, period: Period, opts: { adViews?: number | null } = {}) {
  const sorted = [...snaps].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  const followers = last?.followers ?? 0;
  const n = posts.length;

  const interactionsOf = (p: Post) => p.likes + p.comments + p.saves + p.shares;
  const totalReach = sum(posts.map((p) => p.reach));
  const totalInteractions = sum(posts.map(interactionsOf));
  const totalLikes = sum(posts.map((p) => p.likes));
  const totalComments = sum(posts.map((p) => p.comments));
  const totalViews = sum(posts.map((p) => p.views));

  const engagementReal = totalReach > 0 ? (totalInteractions / totalReach) * 100 : 0;
  const avgReach = n ? totalReach / n : 0;
  const avgInteractions = n ? totalInteractions / n : 0;
  const avgLikesComments = n ? (totalLikes + totalComments) / n : 0;
  const onFollowers = followers ? (avgInteractions / followers) * 100 : 0; // % (exibido 0,8%)
  const reachOnFollowers = followers ? avgReach / followers : 0; // razão (exibido 0,04)
  const commentsPerLike = totalLikes ? totalComments / totalLikes : 0;

  // ---- nota de autenticidade (0 a 100) ----
  const per100 = followers ? (avgLikesComments / followers) * 100 : 0;
  const pReach = WEIGHTS.reach * clamp01(reachOnFollowers / HEALTHY.reachPerFollowers);
  const pEng = WEIGHTS.engagement * clamp01(per100 / HEALTHY.interactionsPer100);
  const pConv = WEIGHTS.conversation * clamp01(commentsPerLike / HEALTHY.commentsPerLike);
  const authenticity = n ? Math.round(pReach + pEng + pConv) : 0;

  const tips: ActionTip[] = [];
  const pct = (x: number) => (x * 100).toFixed(0).replace(".", ",");
  if (n && pReach < WEIGHTS.reach - 0.5)
    tips.push({
      key: "alcance",
      points: r2(WEIGHTS.reach - pReach),
      title: "Alcance",
      text: `Faça cada post chegar a mais gente: hoje ele alcança ${pct(reachOnFollowers)}% de quem te segue e o saudável começa em ${pct(HEALTHY.reachPerFollowers)}%. Publique no horário em que sua audiência está online e responda os comentários na primeira hora.`,
    });
  if (n && pEng < WEIGHTS.engagement - 0.5)
    tips.push({
      key: "engajamento",
      points: r2(WEIGHTS.engagement - pEng),
      title: "Engajamento",
      text: `Convide à interação dentro do post: cada publicação recebe ${per100.toFixed(1).replace(".", ",")} curtidas e comentários a cada 100 seguidores e o saudável começa em ${HEALTHY.interactionsPer100.toFixed(1).replace(".", ",")}. Feche com uma pergunta de resposta curta.`,
    });
  if (n && pConv < WEIGHTS.conversation - 0.5)
    tips.push({
      key: "conversa",
      points: r2(WEIGHTS.conversation - pConv),
      title: "Conversa",
      text: `Para cada 100 curtidas você recebe ${(commentsPerLike * 100).toFixed(1).replace(".", ",")} comentários, e o saudável é a partir de ${(HEALTHY.commentsPerLike * 100).toFixed(1).replace(".", ",")}. Peça uma palavra-chave nos comentários e responda cada pessoa.`,
    });
  tips.sort((a, b) => b.points - a.points);

  const band = HEALTHY.engagementBand;
  const bandStatus: "abaixo" | "dentro" | "acima" = engagementReal < band[0] ? "abaixo" : engagementReal > band[1] ? "acima" : "dentro";

  // ---- séries e crescimento por período ----
  const lastDate = last?.date ?? "";
  const back = (days: number) => (lastDate ? addDays(lastDate, -days) : "");
  // seguidores na coleta mais recente até a data; antes da primeira coleta, vale a primeira
  const followersAt = (date: string) => ([...sorted].reverse().find((s) => s.date <= date) ?? sorted[0])?.followers ?? 0;
  const growth =
    period === "ontem" ? followersAt(back(1)) - followersAt(back(2)) : followersAt(lastDate) - followersAt(back(period === "hoje" ? 1 : period === "7d" ? 7 : 30));
  const seriesDays = period === "30d" ? 30 : 7;
  const window = sorted.filter((s) => s.date >= back(seriesDays));
  const followersSeries = window.map((s) => ({ date: s.date, value: s.followers }));
  const reachSeries = window.map((s) => ({ date: s.date, value: s.reach }));
  const firstExpected = sorted[0] && sorted[0].date > back(seriesDays) ? sorted[0].date : back(seriesDays);
  const expectedDays = lastDate ? daysBetween(firstExpected, lastDate) + 1 : 0;
  const periodLabel = `últimos ${Math.max(1, expectedDays - 1)} dias`;
  const allMeasured = window.length >= 2 && window.length === expectedDays;

  // ---- por formato ----
  const byType = (["IMAGE", "VIDEO", "CAROUSEL_ALBUM"] as PostType[]).map((t) => {
    const ps = posts.filter((p) => p.type === t);
    const likes = sum(ps.map((p) => p.likes));
    const comments = sum(ps.map((p) => p.comments));
    const saves = sum(ps.map((p) => p.saves));
    const shares = sum(ps.map((p) => p.shares));
    return { type: t, label: TYPE_LABEL[t], posts: ps.length, interactions: likes + comments + saves + shares, likes, comments, saves, shares };
  });

  // ---- audiência ----
  const aud = audience
    ? {
        classifiedTotal: audience.classifiedTotal,
        age: ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"].map((k) => ({ label: k, count: audience.age[k] ?? 0, pct: pctOf(audience.age[k] ?? 0, audience.classifiedTotal) })).sort((a, b) => b.pct - a.pct),
        gender: ([["Feminino", "F"], ["Masculino", "M"], ["Não informado", "U"]] as const).map(([label, k]) => ({ label, count: audience.gender[k], pct: pctOf(audience.gender[k], audience.classifiedTotal) })).sort((a, b) => b.pct - a.pct),
        countries: topN(audience.countries, 30, audience.classifiedTotal),
        cities: topN(audience.cities, 30, audience.classifiedTotal),
        countriesTotal: Object.keys(audience.countries).length,
        citiesTotal: Object.keys(audience.cities).length,
      }
    : null;

  const rank = (m: TopMetric) =>
    [...posts]
      .sort((a, b) => b[m] - a[m])
      .slice(0, 12);

  return {
    profile: { followers, following: last?.following ?? 0, mediaCount: last?.mediaCount ?? n, lastSnapshot: last?.date ?? null },
    views: { organic: totalViews, ads: opts.adViews ?? null, total: totalViews + (opts.adViews ?? 0) },
    growth: { period, delta: growth, label: periodLabel, series: followersSeries, allMeasured, expectedDays },
    reachDaily: { series: reachSeries, allMeasured },
    engagement: {
      postsMeasured: n,
      real: round(engagementReal, 2),
      onFollowers: round(onFollowers, 2),
      reachOnFollowers: round(reachOnFollowers, 3),
      totalReach,
      totalInteractions,
      band,
      bandStatus,
    },
    authenticity: { score: authenticity, parts: { reach: round(pReach, 1), engagement: round(pEng, 1), conversation: round(pConv, 1) }, tips },
    byType,
    audience: aud,
    top: { views: rank("views"), reach: rank("reach"), likes: rank("likes"), comments: rank("comments"), saves: rank("saves"), shares: rank("shares") },
  };
}

function pctOf(x: number, total: number) {
  return total ? round((x / total) * 100, 1) : 0;
}
function topN(rec: Record<string, number>, n: number, total: number) {
  return Object.entries(rec)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count, pct: pctOf(count, total) }));
}
export function round(x: number, d: number) {
  const f = 10 ** d;
  return Math.round(x * f) / f;
}
function addDays(date: string, n: number) {
  return new Date(Date.parse(date + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
}
