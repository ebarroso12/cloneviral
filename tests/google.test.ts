// Busca pelo nome no Google. O Google é simulado.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.RV_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "rv-goo-"));

type Call = { url: URL; body: any; auth: string };
type Reply = { status?: number; body?: unknown };
async function withFetch<T>(reply: (c: Call) => Reply, fn: (calls: Call[]) => Promise<T>) {
  const real = globalThis.fetch;
  const calls: Call[] = [];
  globalThis.fetch = (async (u: any, init: any = {}) => {
    let body: any = init.body;
    if (body instanceof URLSearchParams) body = Object.fromEntries(body);
    else if (typeof body === "string") body = JSON.parse(body);
    const c = { url: new URL(String(u)), body, auth: String(init.headers?.authorization ?? "") };
    calls.push(c);
    const r = reply(c);
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status ?? 200 });
  }) as typeof fetch;
  try { return await fn(calls); } finally { globalThis.fetch = real; }
}

const CLIENT = "123456-abcdef.apps.googleusercontent.com";
const SECRET = "GOCSPX-segredo-de-teste-0123456789";
const SEARCH = "https://www.googleapis.com/auth/webmasters.readonly";
const ANALYTICS = "https://www.googleapis.com/auth/analytics.readonly";
const tokens = (over: Record<string, unknown> = {}) => ({ body: { access_token: "acesso-1", refresh_token: "renovacao-secreta", scope: `${SEARCH} ${ANALYTICS}`, ...over } });

const setup = (async () => {
  const { getStore } = await import("../lib/store");
  const s = getStore();
  await s.insert("users", "dono", { name: "Dr. Fulano Teste", email: "dono@x.test" }, "dono");
  await new Promise((r) => setTimeout(r, 5));
  await s.insert("users", "outro", { name: "Outro", email: "outro@x.test" }, "outro");
  return { s, g: await import("../lib/google") };
})();

const rejects = (p: Promise<unknown>, status: number, re?: RegExp) =>
  assert.rejects(p, (e: any) => e.status === status && (!re || re.test(e.message)));

async function connected() {
  const x = await setup;
  await x.g.saveGoogleApp("dono", { clientId: CLIENT, secret: SECRET });
  await x.s.removeAllForUser("google_connection", "dono");
  await withFetch(() => tokens(), () => x.g.connectGoogle("dono", "codigo", "https://app.test/api/google/callback"));
  return x;
}

test("só o dono grava o app do Google", async () => {
  const { g } = await setup;
  await rejects(g.saveGoogleApp("outro", { clientId: CLIENT, secret: SECRET }), 403);
  await rejects(g.saveGoogleApp("dono", { clientId: "123456-abcdef", secret: SECRET }), 400);
  await rejects(g.saveGoogleApp("dono", { clientId: CLIENT, secret: "curto" }), 400);
});

test("endereço de autorização pede só leitura e acesso offline", async () => {
  const { g } = await setup;
  const u = new URL(g.googleAuthUrl("https://app.test/api/google/callback", "estado", CLIENT));
  assert.equal(u.origin + u.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
  assert.deepEqual(u.searchParams.get("scope")!.split(" ").sort(), [ANALYTICS, SEARCH]);
  assert.equal(u.searchParams.get("access_type"), "offline");
  assert.equal(u.searchParams.get("prompt"), "consent");
  assert.equal(u.searchParams.get("state"), "estado");
  assert.equal(u.searchParams.get("response_type"), "code");
});

test("conectar grava o token cifrado e googleStatus não o expõe", async () => {
  const { s, g } = await connected();
  const [doc] = await s.list("google_connection", "dono");
  assert.equal(JSON.stringify(doc).includes("renovacao-secreta"), false);
  const st = await g.googleStatus("dono");
  assert.equal(st.status, "connected");
  assert.equal(st.configured, true);
  const text = JSON.stringify(st);
  for (const secret of ["renovacao-secreta", SECRET, doc.token]) assert.equal(text.includes(secret), false);
});

test("outro usuário não conecta", async () => {
  const { g } = await connected();
  await withFetch(() => tokens(), async (calls) => {
    await rejects(g.connectGoogle("outro", "codigo", "https://app.test/api/google/callback"), 403);
    assert.equal(calls.length, 0);
  });
});

test("permissão desmarcada não conecta", async () => {
  const { s, g } = await connected();
  await s.removeAllForUser("google_connection", "dono");
  for (const [scope, missing] of [[SEARCH, /Analytics/], [ANALYTICS, /Search Console/]] as const) {
    await withFetch(() => tokens({ scope }), () => rejects(g.connectGoogle("dono", "c", "https://app.test/cb"), 400, missing));
  }
  assert.equal((await g.googleStatus("dono")).status, "disconnected");
});

test("resposta sem refresh_token não conecta", async () => {
  const { s, g } = await connected();
  await s.removeAllForUser("google_connection", "dono");
  await withFetch(() => tokens({ refresh_token: undefined }), () => rejects(g.connectGoogle("dono", "c", "https://app.test/cb"), 400));
  assert.equal((await g.googleStatus("dono")).status, "disconnected");
});

test("accessToken renova com o token guardado", async () => {
  const { g } = await connected();
  await withFetch(() => ({ body: { access_token: "acesso-2" } }), async (calls) => {
    assert.equal(await g.accessToken("dono"), "acesso-2");
    assert.equal(calls[0].body.grant_type, "refresh_token");
    assert.equal(calls[0].body.refresh_token, "renovacao-secreta");
  });
});

test("invalid_grant vira reautorizar", async () => {
  const { g } = await connected();
  await withFetch(() => ({ status: 400, body: { error: "invalid_grant" } }), () => rejects(g.accessToken("dono"), 409));
  assert.equal((await g.googleStatus("dono")).status, "reautorizar");
});

test("falha passageira do Google não derruba a conexão", async () => {
  const { g } = await connected();
  await withFetch(() => ({ status: 503, body: { error: "backend_error" } }), () => rejects(g.accessToken("dono"), 502));
  assert.equal((await g.googleStatus("dono")).status, "connected");
});

test("desconectar apaga o token mesmo se a revogação falhar", async () => {
  const { s, g } = await connected();
  await withFetch(() => ({ status: 500 }), async (calls) => {
    await g.disconnectGoogle("dono");
    assert.match(calls[0].url.href, /oauth2\.googleapis\.com\/revoke/);
  });
  const [doc] = await s.list("google_connection", "dono");
  assert.equal(doc.token, null);
  assert.equal((await g.googleStatus("dono")).status, "disconnected");
});
