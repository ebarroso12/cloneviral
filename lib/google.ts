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
  if (!/^[\w-]{20,100}$/.test(secret)) throw new HttpError(400, "A chave secreta do cliente não parece completa. Copie de novo no Google Cloud.");
  const store = getStore();
  const doc = { clientId, secret: encrypt(secret) };
  const cur = await appDoc(userId);
  if (cur) await store.update("google_app", cur.id, userId, doc);
  else await store.insert("google_app", userId, doc, scopedId(userId, "google_app"));
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
    term: String(c?.term ?? ""),
  };
}

export function googleAuthUrl(redirect: string, state: string, clientId: string) {
  const q = new URLSearchParams({ client_id: clientId, redirect_uri: redirect, response_type: "code", scope: GOOGLE_SCOPES.join(" "), state, access_type: "offline", prompt: "consent" });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

async function credentials(userId: string) {
  const app = await appDoc(userId);
  if (!app) throw new HttpError(409, "Grave primeiro o seu app do Google na tela Conexões.");
  return { client_id: String(app.clientId), client_secret: decrypt(app.secret) };
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
  const r = await tokenRequest({ ...(await credentials(userId)), grant_type: "refresh_token", refresh_token: decrypt(c.token) });
  if (r.j?.error === "invalid_grant") {
    await getStore().update("google_connection", c.id, userId, { status: "reautorizar" });
    throw new HttpError(409, again);
  }
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
