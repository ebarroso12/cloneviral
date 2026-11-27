// Perfis de referência: dados públicos de contas profissionais pela "Business Discovery" oficial da Meta.
// Só aparece número que a Meta devolveu. Sugestão da IA que a Meta não confirma é descartada.
import { getStore, scopedId } from "./store";
import { decrypt, gj, GRAPH, MetaError } from "./instagram";
import { HttpError } from "./auth";
import { aiFailure, askJson, loadVoice } from "./ai";

export type RefPost = { caption: string; likes: number | null; comments: number; type: string; permalink: string; publishedAt: string };
export type RefProfile = { username: string; name: string; bio: string; followers: number; mediaCount: number; engagement: number | null; posts: RefPost[]; suggested: boolean; reason: string };

export function cleanUsername(v: unknown) {
  const u = String(v ?? "").trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/[/?].*$/, "").toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(u)) throw new HttpError(400, "Informe o @ do perfil, só letras, números, ponto e sublinhado.");
  return u;
}

async function account(userId: string) {
  const [c] = await getStore().list("ig_connection", userId);
  if (!c || c.demo || c.status !== "connected" || !c.token) throw new HttpError(400, "Conecte o seu Instagram em Conexões para consultar outros perfis.");
  return { ig: String(c.igId), token: decrypt(c.token) };
}

async function discover(a: { ig: string; token: string }, username: string): Promise<Omit<RefProfile, "suggested" | "reason">> {
  // o nome já foi validado: só entra [a-z0-9._] dentro da consulta
  const fields = `business_discovery.username(${username}){username,name,biography,followers_count,media_count,media.limit(25){caption,like_count,comments_count,media_type,permalink,timestamp}}`;
  const j: any = await gj(`${GRAPH}/${a.ig}?fields=${encodeURIComponent(fields)}&access_token=${a.token}`);
  const d = j.business_discovery;
  if (!d) throw new HttpError(404, "A Meta não devolveu esse perfil. Ele precisa ser uma conta profissional pública.");
  const posts: RefPost[] = (d.media?.data ?? []).map((m: any) => ({ caption: String(m.caption ?? ""), likes: m.like_count ?? null, comments: m.comments_count ?? 0, type: m.media_type ?? "", permalink: m.permalink ?? "", publishedAt: m.timestamp ?? "" }));
  // post com curtidas ocultas não entra na média como zero
  const seen = posts.filter((p) => p.likes !== null);
  const followers = Number(d.followers_count ?? 0);
  const engagement = seen.length && followers ? seen.reduce((s, p) => s + p.likes! + p.comments, 0) / seen.length / followers : null;
  return { username: d.username ?? username, name: d.name ?? username, bio: d.biography ?? "", followers, mediaCount: Number(d.media_count ?? 0), engagement, posts };
}

async function keep(userId: string, p: RefProfile) {
  const store = getStore();
  const id = scopedId(userId, `ref_${p.username.replace(/[._]/g, (c) => (c === "." ? "-p-" : "-s-"))}`);
  const cur = await store.get("ref_profiles", id);
  if (!cur) return store.insert("ref_profiles", userId, p, id);
  // perfil que o dono digitou continua sendo dele, mesmo quando a IA o sugere depois
  return store.update("ref_profiles", id, userId, p.suggested && !cur.suggested ? { ...p, suggested: false, reason: cur.reason ?? "" } : p);
}

export async function addProfile(userId: string, username: unknown) {
  const u = cleanUsername(username);
  const a = await account(userId);
  try {
    return await keep(userId, { ...(await discover(a, u)), suggested: false, reason: "" });
  } catch (e) {
    if (e instanceof MetaError) throw new HttpError(400, `A Meta não devolveu @${u}: ${e.message.slice(0, 140)}`);
    throw e;
  }
}

export async function suggestProfiles(userId: string) {
  const a = await account(userId);
  const brief = await loadVoice(userId);
  const answer = await askJson<{ username: string; reason: string }[]>(
    "Você indica perfis profissionais do Instagram para estudo de conteúdo. Responda SOMENTE um array JSON de {username,reason}. Indique apenas perfis que você acredita existir; não invente nomes.",
    `${brief}\nIndique 15 perfis brasileiros do mesmo nicho ou de nicho vizinho.`,
    userId,
  );
  const ideas = answer.data;
  if (!Array.isArray(ideas)) throw aiFailure(answer, "A sugestão precisa de uma IA ligada em IA e integrações. Você também pode digitar o @ de um perfil.");
  const found = [];
  let tried = 0;
  let failure = "";
  for (const i of ideas) {
    if (found.length >= 8 || tried >= 15) break;
    tried++;
    try {
      const u = cleanUsername(i?.username);
      found.push(await keep(userId, { ...(await discover(a, u)), suggested: true, reason: String(i.reason ?? "").slice(0, 300) }));
    } catch (e) {
      if (e instanceof MetaError && e.code === 190) throw new HttpError(400, "A autorização do Instagram venceu. Refaça em Conexões.");
      // 110 = "Invalid user id", a resposta da Meta para perfil inexistente (conferida em 27/11/2026); 400 e 404 são nome inválido ou perfil sem dados
      if ((e instanceof MetaError && e.code === 110) || (e instanceof HttpError && (e.status === 400 || e.status === 404))) continue;
      console.error(e);
      failure = e instanceof MetaError ? `a Meta respondeu "${e.message.slice(0, 160)}"` : "falha de conexão ou do banco de dados";
      break;
    }
  }
  if (!failure) return { found: found.length, tried };
  if (!found.length) throw new HttpError(502, `A consulta parou antes de confirmar algum perfil: ${failure}. Tente de novo mais tarde.`);
  return { found: found.length, tried, warning: `A consulta parou antes do fim: ${failure}.` };
}
