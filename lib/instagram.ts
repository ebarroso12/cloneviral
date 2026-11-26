// Integração oficial com a Instagram Graph API (via Login do Facebook). Usa apenas endpoints públicos e o token do próprio usuário.
// ATENÇÃO: este módulo precisa de um app Meta próprio (META_APP_ID, META_APP_SECRET) e, para uso por terceiros, App Review.
import crypto from "node:crypto";
import { getStore, scopedId } from "./store";

const V = process.env.META_GRAPH_VERSION || "v21.0";
const G = `https://graph.facebook.com/${V}`;
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

async function gj(url: string) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error?.message || `Graph ${r.status}`);
  return j;
}

export function authUrl(redirect: string, state: string) {
  const q = new URLSearchParams({ client_id: process.env.META_APP_ID!, redirect_uri: redirect, state, scope: SCOPES.join(","), response_type: "code" });
  return `https://www.facebook.com/${V}/dialog/oauth?${q}`;
}

export async function exchangeCode(code: string, redirect: string) {
  const q = new URLSearchParams({ client_id: process.env.META_APP_ID!, client_secret: process.env.META_APP_SECRET!, redirect_uri: redirect, code });
  const short = await gj(`${G}/oauth/access_token?${q}`);
  const q2 = new URLSearchParams({ grant_type: "fb_exchange_token", client_id: process.env.META_APP_ID!, client_secret: process.env.META_APP_SECRET!, fb_exchange_token: short.access_token });
  const long = await gj(`${G}/oauth/access_token?${q2}`);
  return { token: long.access_token as string, expiresIn: (long.expires_in as number) ?? 60 * 86400 };
}

export async function findInstagramAccount(token: string) {
  const pages = await gj(`${G}/me/accounts?fields=id,name,instagram_business_account{id,username}&access_token=${token}`);
  const p = (pages.data as any[]).find((x) => x.instagram_business_account);
  if (!p) throw new Error("Nenhuma conta profissional do Instagram ligada a uma Página do Facebook foi encontrada.");
  return { pageId: p.id as string, igId: p.instagram_business_account.id as string };
}

/** Sincroniza perfil, posts, métricas por post, alcance diário e audiência. Cada bloco é tolerante a falha. */
export async function syncAccount(userId: string) {
  const store = getStore();
  const conn = (await store.list("ig_connection", userId))[0];
  if (!conn || conn.demo) return { demo: true };
  const token = decrypt(conn.token);
  const ig = conn.igId as string;
  const prof = await gj(`${G}/${ig}?fields=username,name,biography,website,followers_count,follows_count,media_count,profile_picture_url&access_token=${token}`);
  const today = new Date().toISOString().slice(0, 10);
  let reachToday = 0;
  try {
    const since = Math.floor(Date.now() / 1000) - 30 * 86400;
    const r = await gj(`${G}/${ig}/insights?metric=reach&period=day&since=${since}&until=${Math.floor(Date.now() / 1000)}&access_token=${token}`);
    for (const v of r.data?.[0]?.values ?? []) {
      const d = String(v.end_time).slice(0, 10);
      const cur = await store.get("snapshots", scopedId(userId, `snap_${d}`));
      if (cur) await store.update("snapshots", cur.id, userId, { reach: v.value });
      else await store.insert("snapshots", userId, { date: d, followers: prof.followers_count, following: prof.follows_count, mediaCount: prof.media_count, reach: v.value }, scopedId(userId, `snap_${d}`));
      if (d === today) reachToday = v.value;
    }
  } catch {}
  const cur = await store.get("snapshots", scopedId(userId, `snap_${today}`));
  const snap = { date: today, followers: prof.followers_count, following: prof.follows_count, mediaCount: prof.media_count, reach: reachToday || cur?.reach || 0 };
  if (cur) await store.update("snapshots", cur.id, userId, snap);
  else await store.insert("snapshots", userId, snap, scopedId(userId, `snap_${today}`));

  // posts (paginado)
  let url: string | null = `${G}/${ig}/media?fields=id,caption,media_type,permalink,timestamp,thumbnail_url,media_url,like_count,comments_count&limit=50&access_token=${token}`;
  let pages = 0;
  while (url && pages < 60) {
    const j: any = await gj(url);
    for (const m of j.data as any[]) {
      let reach = 0, views = 0, saves = 0, shares = 0;
      try {
        const ins = await gj(`${G}/${m.id}/insights?metric=reach,views,saved,shares&access_token=${token}`);
        for (const x of ins.data) {
          const v = x.values?.[0]?.value ?? x.total_value?.value ?? 0;
          if (x.name === "reach") reach = v;
          if (x.name === "views") views = v;
          if (x.name === "saved") saves = v;
          if (x.name === "shares") shares = v;
        }
      } catch {}
      const doc = { type: m.media_type, publishedAt: m.timestamp, caption: m.caption ?? "", permalink: m.permalink, thumbnailUrl: m.thumbnail_url ?? m.media_url, views, reach, likes: m.like_count ?? 0, comments: m.comments_count ?? 0, saves, shares };
      const ex = await store.get("posts", scopedId(userId, m.id));
      if (ex) await store.update("posts", ex.id, userId, doc);
      else await store.insert("posts", userId, doc, scopedId(userId, m.id));
    }
    url = j.paging?.next ?? null;
    pages++;
  }

  // audiência
  try {
    const demo: Record<string, any> = {};
    for (const b of ["age", "gender", "country", "city"]) {
      const r = await gj(`${G}/${ig}/insights?metric=follower_demographics&period=lifetime&timeframe=this_month&metric_type=total_value&breakdown=${b}&access_token=${token}`);
      demo[b] = r.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
    }
    const rec = (arr: any[], f: (x: any) => string) => Object.fromEntries(arr.map((x) => [f(x), x.value]));
    const gender = rec(demo.gender, (x) => x.dimension_values[0]);
    const age = rec(demo.age, (x) => x.dimension_values[0]);
    const aud = { classifiedTotal: Object.values(age).reduce((a: number, b: any) => a + b, 0), age, gender: { F: gender.F ?? 0, M: gender.M ?? 0, U: gender.U ?? 0 }, countries: rec(demo.country, (x) => x.dimension_values[0]), cities: rec(demo.city, (x) => x.dimension_values[0]) };
    const ex = (await store.list("audience", userId))[0];
    if (ex) await store.update("audience", ex.id, userId, aud);
    else await store.insert("audience", userId, aud, scopedId(userId, "aud"));
  } catch {}
  await store.update("ig_connection", conn.id, userId, { name: prof.name, igUsername: prof.username, bio: prof.biography, link: prof.website, lastSync: new Date().toISOString() });
  return { ok: true };
}
