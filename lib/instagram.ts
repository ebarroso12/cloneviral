// Integração oficial com a Instagram Graph API (via Login do Facebook). Usa apenas endpoints públicos e o token do próprio usuário.
// ATENÇÃO: este módulo precisa de um app Meta próprio (META_APP_ID, META_APP_SECRET) e, para uso por terceiros, App Review.
import crypto from "node:crypto";
import { getStore, scopedId } from "./store";

const V = process.env.META_GRAPH_VERSION || "v27.0"; // versão usada nos exemplos atuais da documentação
export const GRAPH = `https://graph.facebook.com/${V}`;
const G = GRAPH;
export const metaConfigured = () => !!(process.env.META_APP_ID && process.env.META_APP_SECRET);
export const SCOPES = ["instagram_basic", "instagram_manage_insights", "instagram_content_publish", "pages_show_list", "pages_read_engagement", "business_management"];

const key = () => {
  const secret = process.env.RV_SECRET;
  if (!secret && process.env.NODE_ENV === "production") throw new Error("Defina RV_SECRET no servidor para guardar o token do Instagram.");
  return crypto.createHash("sha256").update(secret || "somente-desenvolvimento-local").digest();
};
export function encrypt(text: string) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}
export function decrypt(payload: string) {
  const [iv, tag, enc] = payload.split(".").map((x) => Buffer.from(x, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

/** Resposta de erro da própria Meta (diferente de queda de rede ou resposta ilegível). */
export class MetaError extends Error {
  constructor(message: string, public status: number, public code?: number) {
    super(message);
  }
}

export async function gj(url: string, opts: { method?: string; headers?: Record<string, string>; body?: any; timeoutMs?: number } = {}) {
  const { timeoutMs = 20000, ...init } = opts;
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  const j = await r.json();
  if (!r.ok || j.error) throw new MetaError(j.error?.message || `Graph ${r.status}`, r.status, j.error?.code);
  return j;
}

export function authUrl(redirect: string, state: string) {
  const q = new URLSearchParams({ client_id: process.env.META_APP_ID!, redirect_uri: redirect, state, response_type: "code" });
  // o Login do Facebook para Empresas define as permissões numa configuração salva (config_id)
  if (process.env.META_CONFIG_ID) q.set("config_id", process.env.META_CONFIG_ID);
  else q.set("scope", SCOPES.join(","));
  return `https://www.facebook.com/${V}/dialog/oauth?${q}`;
}

export async function exchangeCode(code: string, redirect: string) {
  const q = new URLSearchParams({ client_id: process.env.META_APP_ID!, client_secret: process.env.META_APP_SECRET!, redirect_uri: redirect, code });
  const short = await gj(`${G}/oauth/access_token?${q}`);
  const q2 = new URLSearchParams({ grant_type: "fb_exchange_token", client_id: process.env.META_APP_ID!, client_secret: process.env.META_APP_SECRET!, fb_exchange_token: short.access_token });
  const long = await gj(`${G}/oauth/access_token?${q2}`);
  return { token: long.access_token as string, expiresIn: (long.expires_in as number) ?? 60 * 86400 };
}

export type IgAccount = { igId: string; pageId: string; username: string };

/** Todas as Páginas com conta profissional ligada, seguindo a paginação. */
export async function listInstagramAccounts(token: string): Promise<IgAccount[]> {
  const out: IgAccount[] = [];
  let url: string | null = `${G}/me/accounts?fields=id,name,instagram_business_account{id,username}&limit=100&access_token=${token}`;
  for (let i = 0; url && i < 10; i++) {
    const j: any = await gj(url);
    for (const p of j.data ?? []) if (p.instagram_business_account) out.push({ igId: p.instagram_business_account.id, pageId: p.id, username: p.instagram_business_account.username ?? p.name ?? p.id });
    url = j.paging?.next ?? null;
  }
  return out;
}

export const READ_PERMISSIONS = ["instagram_basic", "instagram_manage_insights", "pages_show_list"];
const REQUIRED = [...READ_PERMISSIONS, "instagram_content_publish", "pages_read_engagement"];

export async function missingPermissions(token: string) {
  const j = await gj(`${G}/me/permissions?access_token=${token}`);
  const granted = new Set((j.data ?? []).filter((p: any) => p.status === "granted").map((p: any) => p.permission));
  return REQUIRED.filter((p) => !granted.has(p));
}

const DAY = 86400000;
const RECENT_DAYS = 30; // posts recentes têm as métricas relidas a cada coleta
const BATCH = 5;

/**
 * Sincroniza perfil, alcance diário, posts, métricas por post e audiência. Cada bloco é tolerante a
 * falha, mas toda falha vira aviso. Métrica que não veio nunca é gravada como zero por cima da anterior.
 * Passado o prazo, para e devolve partial=true; a próxima chamada continua.
 */
export function syncAccount(userId: string, opts: { deadlineMs?: number } = {}) {
  const running = (g.__syncs ||= new Map());
  let p = running.get(userId) as ReturnType<typeof tracked> | undefined;
  if (!p) {
    p = tracked(userId, opts).finally(() => running.delete(userId));
    running.set(userId, p);
  }
  return p;
}
const g = globalThis as unknown as { __syncs?: Map<string, Promise<unknown>> };

/** Registra a tentativa e o erro, para o agendador recuar e a tela avisar. */
async function tracked(userId: string, opts: { deadlineMs?: number }) {
  const store = getStore();
  const attempt = async (extra: Record<string, any>) => {
    const [c] = await store.list("ig_connection", userId);
    if (c && !c.demo) await store.update("ig_connection", c.id, userId, { lastSyncAttempt: new Date().toISOString(), ...extra });
  };
  try {
    const r = await runSync(userId, opts);
    await attempt({ syncError: null });
    return r;
  } catch (e: any) {
    // 190 = chave de acesso vencida ou revogada: só uma nova autorização resolve
    if (e instanceof MetaError && e.code === 190) await attempt({ status: "reautorizar", syncError: e.message });
    else if (!/desconectado|autoriza/i.test(String(e?.message))) await attempt({ syncError: String(e?.message ?? e).slice(0, 200) });
    throw e;
  }
}

/** Está na hora de coletar sozinho? Completa: uma vez por dia. Incompleta: logo. Com erro: de hora em hora. */
export function syncDue(c: Record<string, any>, now: number = Date.now()) {
  if (c.demo || c.status !== "connected") return false;
  const age = (iso?: string) => (iso ? now - Date.parse(iso) : Infinity);
  if (c.syncError) return age(c.lastSyncAttempt) > 3600_000;
  return age(c.lastSync) > (c.syncPartial ? 10 * 60_000 : 20 * 3600_000);
}

async function runSync(userId: string, opts: { deadlineMs?: number }) {
  const store = getStore();
  const conn = (await store.list("ig_connection", userId))[0];
  if (!conn || conn.demo) return { demo: true as const, partial: false, warnings: [] as string[] };
  if (conn.status !== "connected" || !conn.token) throw new Error(conn.status === "reautorizar" ? "A autorização do Instagram venceu. Refaça em Conexões." : "O Instagram está desconectado. Conecte de novo em Conexões.");
  const end = Date.now() + (opts.deadlineMs ?? 45000);
  const late = () => Date.now() >= end;
  const warnings = new Set<string>();
  const warn = (what: string, e: any) => warnings.add(`${what}: ${String(e?.message ?? e).slice(0, 160)}`);
  const token = decrypt(conn.token);
  const ig = conn.igId as string;
  const prof = await gj(`${G}/${ig}?fields=username,name,biography,website,followers_count,follows_count,media_count,profile_picture_url&access_token=${token}`);

  // alcance diário e retrato de hoje
  const today = new Date().toISOString().slice(0, 10);
  const snaps = new Map((await store.list("snapshots", userId)).map((x) => [x.date as string, x]));
  const reachByDay = new Map<string, number>();
  try {
    const now = Math.floor(Date.now() / 1000);
    const r = await gj(`${G}/${ig}/insights?metric=reach&period=day&since=${now - 30 * 86400}&until=${now}&access_token=${token}`);
    for (const v of r.data?.[0]?.values ?? []) reachByDay.set(String(v.end_time).slice(0, 10), v.value);
  } catch (e) {
    warn("Alcance diário", e);
  }
  const base = { followers: prof.followers_count, following: prof.follows_count, mediaCount: prof.media_count };
  for (const [date, reach] of reachByDay) {
    const cur = snaps.get(date);
    if (cur) await store.update("snapshots", cur.id, userId, { reach });
    // nos dias passados só o alcance é conhecido; seguidores daquele dia não são inventados
    else if (date !== today) await store.insert("snapshots", userId, { date, reach }, scopedId(userId, `snap_${date}`));
  }
  const cur = snaps.get(today);
  const snap = { date: today, ...base, reach: reachByDay.get(today) ?? cur?.reach ?? 0 };
  if (cur) await store.update("snapshots", cur.id, userId, snap);
  else await store.insert("snapshots", userId, snap, scopedId(userId, `snap_${today}`));

  // lista de posts: o que a própria listagem já informa
  const known = new Map((await store.list("posts", userId)).map((x) => [x.id, x]));
  const seen: { mediaId: string; id: string }[] = [];
  let url: string | null = `${G}/${ig}/media?fields=id,caption,media_type,permalink,timestamp,thumbnail_url,media_url,like_count,comments_count&limit=50&access_token=${token}`;
  let pages = 0;
  while (url && pages < 60 && (pages === 0 || !late())) {
    const j: any = await gj(url);
    for (const m of j.data as any[]) {
      const id = scopedId(userId, m.id);
      const doc = { type: m.media_type, publishedAt: m.timestamp, caption: m.caption ?? "", permalink: m.permalink, thumbnailUrl: m.thumbnail_url ?? m.media_url, likes: m.like_count ?? 0, comments: m.comments_count ?? 0 };
      const ex = known.get(id);
      const saved = ex ? await store.update("posts", id, userId, doc) : await store.insert("posts", userId, { ...doc, views: 0, reach: 0, saves: 0, shares: 0 }, id);
      known.set(id, saved!);
      seen.push({ mediaId: m.id, id });
    }
    url = j.paging?.next ?? null;
    pages++;
  }
  const listIncomplete = !!url;

  // métricas por post: primeiro os nunca medidos, depois os recentes
  const never = seen.filter((p) => !known.get(p.id)!.insightsAt).sort((a, b) => (known.get(a.id)!.insightsAttempts ?? 0) - (known.get(b.id)!.insightsAttempts ?? 0));
  const recent = seen.filter((p) => { const d = known.get(p.id)!; return d.insightsAt && !d.insightsUnavailable && Date.now() - Date.parse(d.publishedAt) < RECENT_DAYS * DAY; });
  const queue = [...never, ...recent];
  let done = 0;
  while (done < queue.length && !late()) {
    await Promise.all(queue.slice(done, done + BATCH).map(async (p) => {
      try {
        const ins = await gj(`${G}/${p.mediaId}/insights?metric=reach,views,saved,shares&access_token=${token}`);
        const patch: Record<string, any> = { insightsAt: new Date().toISOString() };
        for (const x of ins.data) {
          const v = x.values?.[0]?.value ?? x.total_value?.value;
          const field = ({ reach: "reach", views: "views", saved: "saves", shares: "shares" } as Record<string, string>)[x.name];
          if (field && typeof v === "number") patch[field] = v;
        }
        await store.update("posts", p.id, userId, patch);
      } catch (e) {
        if (e instanceof MetaError && e.code === 190) throw e;
        warn("Métricas de posts", e);
        const d = known.get(p.id)!;
        if (!d.insightsAt && e instanceof MetaError && e.status < 500) {
          // há posts sem métrica na Meta (anteriores à conta profissional): depois de três recusas, deixa de pedir
          const attempts = (d.insightsAttempts ?? 0) + 1;
          await store.update("posts", p.id, userId, attempts >= 3 ? { insightsAttempts: attempts, insightsAt: new Date().toISOString(), insightsUnavailable: true } : { insightsAttempts: attempts });
        }
      }
    }));
    done += BATCH;
  }
  const partial = listIncomplete || done < never.length;

  // audiência
  if (!late()) {
    try {
      const demo: Record<string, any> = {};
      for (const b of ["age", "gender", "country", "city"]) {
        const r = await gj(`${G}/${ig}/insights?metric=follower_demographics&period=lifetime&timeframe=this_month&metric_type=total_value&breakdown=${b}&access_token=${token}`);
        demo[b] = r.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
      }
      const rec = (arr: any[], f: (x: any) => string) => Object.fromEntries(arr.map((x) => [f(x), x.value]));
      const gender = rec(demo.gender, (x) => x.dimension_values[0]);
      const age = rec(demo.age, (x) => x.dimension_values[0]);
      const total = Object.values(age).reduce((a: number, b: any) => a + b, 0);
      if (total > 0) {
        const aud = { classifiedTotal: total, age, gender: { F: gender.F ?? 0, M: gender.M ?? 0, U: gender.U ?? 0 }, countries: rec(demo.country, (x) => x.dimension_values[0]), cities: rec(demo.city, (x) => x.dimension_values[0]) };
        const ex = (await store.list("audience", userId))[0];
        if (ex) await store.update("audience", ex.id, userId, aud);
        else await store.insert("audience", userId, aud, scopedId(userId, "aud"));
      } else warnings.add("Audiência: a Meta não devolveu dados desta vez.");
    } catch (e) {
      warn("Audiência", e);
    }
  }
  const list = [...warnings];
  await store.update("ig_connection", conn.id, userId, { name: prof.name, igUsername: prof.username, bio: prof.biography, link: prof.website, picture: prof.profile_picture_url ?? conn.picture, lastSync: new Date().toISOString(), syncWarnings: list, syncPartial: partial });
  return { demo: false as const, partial, warnings: list };
}

/** Coleta diária (rota /api/cron/sync): todas as contas reais conectadas, uma de cada vez. */
export async function syncAll(opts: { deadlineMs?: number } = {}) {
  const conns = await getStore().findAll("ig_connection", (c) => !c.demo && c.status === "connected");
  const results: { userId: string; ok: boolean; partial?: boolean; warnings?: string[]; error?: string }[] = [];
  const each = Math.floor((opts.deadlineMs ?? 50000) / Math.max(1, conns.length));
  for (const c of conns) {
    try {
      const r = await syncAccount(c.userId, { deadlineMs: each });
      results.push({ userId: c.userId, ok: true, partial: r.partial, warnings: r.warnings });
    } catch (e: any) {
      results.push({ userId: c.userId, ok: false, error: String(e?.message ?? e).slice(0, 200) });
    }
  }
  return { accounts: conns.length, results };
}
