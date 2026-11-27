// Ligação somente leitura com o Google (Search Console e Analytics). O app OAuth é gravado pelo dono na tela Conexões.
import { getStore, scopedId } from "./store";
import { encrypt, decrypt } from "./instagram";
import { isOwner } from "./invites";
import { HttpError } from "./auth";

const SEARCH = "https://www.googleapis.com/auth/webmasters.readonly";
const ANALYTICS = "https://www.googleapis.com/auth/analytics.readonly";
export const GOOGLE_SCOPES = [SEARCH, ANALYTICS];
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function ownerOnly(userId: string) {
  if (!(await isOwner(userId))) throw new HttpError(403, "A ligação com o Google é só do dono.");
}

const appDoc = async (userId: string) => (await getStore().list("google_app", userId))[0];
const connDoc = async (userId: string) => (await getStore().list("google_connection", userId))[0];

export async function saveGoogleApp(userId: string, b: { clientId?: unknown; secret?: unknown }) {
  await ownerOnly(userId);
  const clientId = String(b.clientId ?? "").trim();
  const secret = String(b.secret ?? "").trim();
  if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(clientId)) throw new HttpError(400, "O ID do cliente termina em .apps.googleusercontent.com. Copie de novo no Google Cloud.");
  const cur = await appDoc(userId);
  // em branco mantém a chave já gravada
  if ((secret || !cur) && !/^[\w-]{20,100}$/.test(secret)) throw new HttpError(400, "A chave secreta do cliente não parece completa. Copie de novo no Google Cloud.");
  const store = getStore();
  const doc = { clientId, secret: secret ? encrypt(secret) : String(cur!.secret) };
  const conn = await connDoc(userId);
  // a autorização vale para um cliente: com outro ID é preciso conectar de novo
  if (cur && cur.clientId !== clientId && conn?.status === "connected") await store.update("google_connection", conn.id, userId, { status: "reautorizar", token: null });
  if (cur) await store.update("google_app", cur.id, userId, doc);
  else await store.insert("google_app", userId, doc, scopedId(userId, "google_app"));
}

/** Sugestão do nome pesquisado: o nome da conta, sem o título. */
async function ownName(userId: string) {
  const u = await getStore().get("users", userId);
  return String(u?.name ?? "").trim().replace(/^(dr|dra|prof|profa)\.?\s+/i, "").toLowerCase().slice(0, 60);
}

export async function googleStatus(userId: string) {
  const app = await appDoc(userId);
  const c = await connDoc(userId);
  return {
    configured: !!app,
    clientId: String(app?.clientId ?? ""),
    status: (c?.status ?? "disconnected") as "disconnected" | "connected" | "reautorizar",
    siteUrl: String(c?.siteUrl ?? ""),
    propertyId: String(c?.propertyId ?? ""),
    propertyName: String(c?.propertyName ?? ""),
    term: String(c?.term || (await ownName(userId))),
  };
}

export function googleAuthUrl(redirect: string, state: string, clientId: string) {
  const q = new URLSearchParams({ client_id: clientId, redirect_uri: redirect, response_type: "code", scope: GOOGLE_SCOPES.join(" "), state, access_type: "offline", prompt: "consent" });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

const BAD_SECRET = "A chave secreta do app do Google não serve mais. Grave de novo em Seu app do Google, na tela Conexões.";

/** null quando o texto gravado não abre (por exemplo, o segredo do servidor mudou). */
function open(payload: string) {
  try {
    return decrypt(payload);
  } catch {
    return null;
  }
}

async function credentials(userId: string) {
  const app = await appDoc(userId);
  if (!app) throw new HttpError(409, "Grave primeiro o seu app do Google na tela Conexões.");
  const secret = open(String(app.secret));
  if (secret === null) throw new HttpError(409, BAD_SECRET);
  return { client_id: String(app.clientId), client_secret: secret };
}

async function tokenRequest(form: Record<string, string>) {
  const r = await fetch(TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(form), signal: AbortSignal.timeout(20000) });
  const j: any = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j };
}
const reason = (r: { status: number; j: any }) => String(r.j?.error_description || r.j?.error || r.status).slice(0, 200);

export async function connectGoogle(userId: string, code: string, redirect: string) {
  await ownerOnly(userId);
  const r = await tokenRequest({ ...(await credentials(userId)), grant_type: "authorization_code", code, redirect_uri: redirect });
  if (!r.ok) throw new HttpError(400, `O Google recusou a autorização: ${reason(r)}`);
  const granted = String(r.j.scope ?? "").split(" ");
  const missing = [!granted.includes(SEARCH) && "Search Console", !granted.includes(ANALYTICS) && "Analytics"].filter(Boolean);
  if (missing.length) throw new HttpError(400, `Faltou marcar a permissão de leitura do ${missing.join(" e do ")}. Conecte de novo e marque tudo.`);
  if (!r.j.refresh_token) throw new HttpError(400, "O Google não devolveu a autorização duradoura. Remova o acesso do app na sua conta Google e conecte de novo.");
  const store = getStore();
  const data = { status: "connected", token: encrypt(String(r.j.refresh_token)) };
  const cur = await connDoc(userId);
  if (cur) await store.update("google_connection", cur.id, userId, data);
  else await store.insert("google_connection", userId, { ...data, siteUrl: "", propertyId: "", propertyName: "", term: "" }, scopedId(userId, "google_conn"));
}

/** Chave de acesso de curta duração, renovada a cada uso. */
export async function accessToken(userId: string): Promise<string> {
  const c = await connDoc(userId);
  const again = "A autorização do Google venceu ou foi retirada. Conecte de novo na tela Conexões.";
  if (c?.status === "reautorizar") throw new HttpError(409, again);
  if (c?.status !== "connected" || !c.token) throw new HttpError(409, "Conecte o Google na tela Conexões.");
  const reauthorize = async () => {
    await getStore().update("google_connection", c.id, userId, { status: "reautorizar" });
    return new HttpError(409, again);
  };
  const app = await credentials(userId);
  const refresh = open(String(c.token));
  if (refresh === null) throw await reauthorize();
  const r = await tokenRequest({ ...app, grant_type: "refresh_token", refresh_token: refresh });
  if (r.j?.error === "invalid_grant" || r.j?.error === "unauthorized_client") throw await reauthorize();
  if (r.j?.error === "invalid_client") throw new HttpError(409, BAD_SECRET);
  if (!r.ok || !r.j.access_token) throw new HttpError(502, `O Google não renovou o acesso: ${reason(r)}`);
  return String(r.j.access_token);
}

export async function disconnectGoogle(userId: string) {
  await ownerOnly(userId);
  const c = await connDoc(userId);
  if (!c) return;
  if (c.token) {
    try {
      await fetch("https://oauth2.googleapis.com/revoke", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: decrypt(c.token) }), signal: AbortSignal.timeout(20000) });
    } catch {
      // sem revogação o token local é apagado do mesmo jeito; o dono pode retirar o acesso na conta Google
    }
  }
  await getStore().update("google_connection", c.id, userId, { status: "disconnected", token: null });
}
