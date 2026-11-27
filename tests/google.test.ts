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

const SITE = "sc-domain:exemplo.test";
const options = (c: Call): Reply | null => {
  if (c.url.hostname === "oauth2.googleapis.com") return { body: { access_token: "acesso-3" } };
  if (c.url.pathname === "/webmasters/v3/sites") return { body: { siteEntry: [{ siteUrl: SITE, permissionLevel: "siteOwner" }, { siteUrl: "https://alheio.test/", permissionLevel: "siteUnverifiedUser" }] } };
  if (c.url.hostname === "analyticsadmin.googleapis.com")
    return c.url.searchParams.get("pageToken")
      ? { body: { accountSummaries: [{ propertySummaries: [{ property: "properties/222", displayName: "Segunda" }] }] } }
      : { body: { accountSummaries: [{ propertySummaries: [{ property: "properties/111", displayName: "Primeira" }] }], nextPageToken: "p2" } };
  return null;
};
const numbers = (c: Call): Reply => {
  const o = options(c);
  if (o) return o;
  if (c.url.pathname.endsWith("/searchAnalytics/query"))
    return c.body.dimensions
      ? { body: { rows: [{ keys: ["fulano teste psiquiatra"], clicks: 4, impressions: 30, ctr: 0.13, position: 2 }] } }
      : { body: { rows: [{ clicks: 12, impressions: 200, ctr: 0.06, position: 1.4 }] } };
  const text = JSON.stringify(c.body);
  const whats = text.includes("generate_lead");
  const paid = text.includes('"cpc"');
  return { body: { rows: [{ metricValues: [{ value: paid ? (whats ? "6" : "44") : whats ? "3" : "41" }] }] } };
};
async function chosen() {
  const x = await connected();
  const d = await import("../lib/googleData");
  await withFetch(numbers, () => d.saveGoogleSettings("dono", { siteUrl: SITE, propertyId: "222", term: "Fulano Teste" }));
  return { ...x, d };
}

test("intervalo termina três dias antes", async () => {
  const { reportRange } = await import("../lib/googleData");
  assert.deepEqual(reportRange(7, new Date("2026-11-27T12:00:00Z")), { start: "2026-11-18", end: "2026-11-24" });
  assert.deepEqual(reportRange(28, new Date("2026-03-02T12:00:00Z")), { start: "2026-01-31", end: "2026-02-27" });
});

test("opções trazem só site verificado e todas as páginas de propriedades", async () => {
  await connected();
  const d = await import("../lib/googleData");
  await withFetch(numbers, async () => {
    const o = await d.googleOptions("dono");
    assert.deepEqual(o.sites, [SITE]);
    assert.deepEqual(o.properties, [{ id: "111", name: "Primeira" }, { id: "222", name: "Segunda" }]);
  });
});

test("nome sugerido vem da conta do dono, sem o título", async () => {
  const { g } = await connected();
  assert.equal((await g.googleStatus("dono")).term, "fulano teste");
});

test("só aceita site e propriedade que a conta tem", async () => {
  await connected();
  const d = await import("../lib/googleData");
  await withFetch(numbers, async () => {
    await rejects(d.saveGoogleSettings("dono", { siteUrl: "https://alheio.test/" }), 400);
    await rejects(d.saveGoogleSettings("dono", { propertyId: "999" }), 400);
    await rejects(d.saveGoogleSettings("outro", { term: "x y" }), 403);
  });
});

test("termo vazio é recusado", async () => {
  const { d } = await chosen();
  await rejects(d.saveGoogleSettings("dono", { term: "   " }), 400);
  await rejects(d.saveGoogleSettings("dono", { term: "a".repeat(61) }), 400);
});

test("relatório soma as duas fontes com o filtro pelo nome", async () => {
  const { d } = await chosen();
  await withFetch(numbers, async (calls) => {
    const r = await d.googleReport("dono", 28);
    assert.equal(r.term, "fulano teste");
    assert.deepEqual(r.search, { ok: true, impressions: 200, clicks: 12, ctr: 0.06, position: 1.4, queries: [{ query: "fulano teste psiquiatra", impressions: 30, clicks: 4 }] });
    assert.deepEqual(r.site, { ok: true, visits: 41, whatsapp: 3, adsVisits: 44, adsWhatsapp: 6 });
    const search = calls.filter((c) => c.url.pathname.endsWith("/searchAnalytics/query"));
    assert.equal(search.length, 2);
    assert.ok(search.every((c) => c.url.pathname.includes(encodeURIComponent(SITE)) && c.body.dimensionFilterGroups[0].filters[0].expression === "fulano teste" && c.auth === "Bearer acesso-3"));
    const ga = calls.filter((c) => c.url.hostname === "analyticsdata.googleapis.com");
    assert.equal(ga.length, 4);
    assert.ok(ga.every((c) => c.url.pathname.includes("properties/222:runReport") && /"google"/.test(JSON.stringify(c.body))));
    // busca gratuita e anúncios pagos nunca somados: duas consultas para cada
    for (const medium of ['"organic"', '"cpc"']) assert.equal(ga.filter((c) => JSON.stringify(c.body).includes(medium)).length, 2, medium);
  });
});

test("sem linhas é zero, sem taxa inventada", async () => {
  const { d } = await chosen();
  await withFetch((c) => options(c) ?? { body: {} }, async () => {
    const r = await d.googleReport("dono", 7);
    assert.deepEqual(r.search, { ok: true, impressions: 0, clicks: 0, ctr: null, position: null, queries: [] });
    assert.deepEqual(r.site, { ok: true, visits: 0, whatsapp: 0, adsVisits: 0, adsWhatsapp: 0 });
  });
});

test("falha de uma fonte não derruba a outra", async () => {
  const { d } = await chosen();
  const deny = (host: string) => (c: Call): Reply => (c.url.hostname === host ? { status: 403, body: { error: { message: "sem permissão " + "x".repeat(400) } } } : numbers(c));
  await withFetch(deny("analyticsdata.googleapis.com"), async () => {
    const r = await d.googleReport("dono", 7);
    assert.equal(r.search?.ok, true);
    assert.equal(r.site.ok, false);
    assert.ok(!r.site.ok && /sem permissão/.test(r.site.error) && r.site.error.length <= 200);
    assert.equal("visits" in r.site, false);
  });
  await withFetch(deny("www.googleapis.com"), async () => {
    const r = await d.googleReport("dono", 7);
    assert.equal(r.search?.ok, false);
    assert.equal(r.site.ok, true);
  });
});

test("sem site ou propriedade escolhidos não consulta", async () => {
  await connected(); // conexão nova: ainda sem site e sem propriedade
  const d = await import("../lib/googleData");
  await withFetch(numbers, async (calls) => {
    await rejects(d.googleReport("dono", 7), 409, /Escolha/);
    assert.equal(calls.length, 0);
  });
});

test("outro usuário não vê relatório e período estranho é recusado", async () => {
  const { d } = await chosen();
  await withFetch(numbers, async (calls) => {
    await rejects(d.googleReport("outro", 7), 403);
    await rejects(d.googleReport("dono", 365 as any), 400);
    assert.equal(calls.length, 0);
  });
});

test("sem nome pesquisado não consulta (filtro vazio traria todas as buscas)", async () => {
  const { s, d } = await chosen();
  const [conn] = await s.list("google_connection", "dono");
  await s.update("google_connection", conn.id, "dono", { term: "" });
  const user = await s.get("users", "dono");
  await s.update("users", "dono", "dono", { name: "" });
  try {
    await withFetch(numbers, async (calls) => {
      await rejects(d.googleReport("dono", 7), 409, /nome pesquisado/);
      assert.equal(calls.length, 0);
    });
  } finally {
    await s.update("users", "dono", "dono", { name: user!.name });
  }
});

test("sem site verificado: salva só a propriedade e o relatório traz apenas o Analytics", async () => {
  await connected();
  const d = await import("../lib/googleData");
  await withFetch(numbers, () => d.saveGoogleSettings("dono", { siteUrl: "", propertyId: "111" }));
  await withFetch(numbers, async (calls) => {
    const r = await d.googleReport("dono", 28);
    assert.equal(r.search, null);
    assert.deepEqual(r.site, { ok: true, visits: 41, whatsapp: 3, adsVisits: 44, adsWhatsapp: 6 });
    assert.equal(calls.some((c) => c.url.pathname.includes("searchAnalytics")), false);
  });
});

test("tirar o site volta ao modo só Analytics", async () => {
  const { s, d } = await chosen();
  await withFetch(numbers, () => d.saveGoogleSettings("dono", { siteUrl: "", propertyId: "222" }));
  const [doc] = await s.list("google_connection", "dono");
  assert.equal(doc.siteUrl, "");
});

test("Search Console indisponível não impede escolher a propriedade", async () => {
  await connected();
  const d = await import("../lib/googleData");
  const semBusca = (c: Call): Reply => (c.url.pathname === "/webmasters/v3/sites" ? { status: 403, body: { error: { message: "API desligada" } } } : numbers(c));
  await withFetch(semBusca, async () => {
    const o = await d.googleOptions("dono");
    assert.deepEqual(o.sites, []);
    assert.match(o.sitesError!, /API desligada/);
    assert.equal(o.properties.length, 2);
    await d.saveGoogleSettings("dono", { siteUrl: "", propertyId: "111" });
    await rejects(d.saveGoogleSettings("dono", { siteUrl: SITE }), 400);
  });
});

// ---------- revisão de código de 27/11/2026 ----------
const OTHER = "999-outro.apps.googleusercontent.com";

test("site gravado continua salvável quando o Search Console falha", async () => {
  const { s, d } = await chosen();
  const semBusca = (c: Call): Reply => (c.url.pathname === "/webmasters/v3/sites" ? { status: 500, body: {} } : numbers(c));
  await withFetch(semBusca, async () => {
    await d.saveGoogleSettings("dono", { siteUrl: SITE, propertyId: "111" });
    await rejects(d.saveGoogleSettings("dono", { siteUrl: "https://alheio.test/" }), 400);
  });
  const [doc] = await s.list("google_connection", "dono");
  assert.equal(doc.propertyId, "111");
  assert.equal(doc.siteUrl, SITE);
});

test("trocar o ID do cliente pede nova conexão; trocar só a chave não", async () => {
  const { s, g } = await connected();
  await g.saveGoogleApp("dono", { clientId: CLIENT, secret: SECRET + "x" });
  assert.equal((await g.googleStatus("dono")).status, "connected");
  await g.saveGoogleApp("dono", { clientId: OTHER, secret: SECRET });
  assert.equal((await g.googleStatus("dono")).status, "reautorizar");
  assert.equal((await s.list("google_connection", "dono"))[0].token, null);
});

test("chave em branco mantém a gravada; sem nada gravado é recusada", async () => {
  const { s, g } = await connected();
  const antes = (await s.list("google_app", "dono"))[0].secret;
  await g.saveGoogleApp("dono", { clientId: OTHER, secret: "" });
  const [app] = await s.list("google_app", "dono");
  assert.equal(app.secret, antes);
  assert.equal(app.clientId, OTHER);
  await s.removeAllForUser("google_app", "dono");
  await rejects(g.saveGoogleApp("dono", { clientId: CLIENT, secret: "" }), 400);
});

test("unauthorized_client vira reautorizar; invalid_client pede gravar a chave de novo", async () => {
  let { g } = await connected();
  await withFetch(() => ({ status: 401, body: { error: "invalid_client" } }), () => rejects(g.accessToken("dono"), 409, /chave secreta/));
  assert.equal((await g.googleStatus("dono")).status, "connected");
  await withFetch(() => ({ status: 400, body: { error: "unauthorized_client" } }), () => rejects(g.accessToken("dono"), 409));
  assert.equal((await g.googleStatus("dono")).status, "reautorizar");
});

test("o que não dá para decifrar vira aviso em português, sem erro 500", async () => {
  const { s, g } = await connected();
  const [app] = await s.list("google_app", "dono");
  await s.update("google_app", app.id, "dono", { secret: "lixo" });
  await rejects(g.accessToken("dono"), 409, /Grave de novo/);
  await connected();
  const [conn] = await s.list("google_connection", "dono");
  await s.update("google_connection", conn.id, "dono", { token: "lixo" });
  await rejects(g.accessToken("dono"), 409, /Conecte de novo/);
  assert.equal((await g.googleStatus("dono")).status, "reautorizar");
});

test("sem site o Analytics vai até ontem, no horário do Brasil", async () => {
  const { reportRange } = await import("../lib/googleData");
  assert.deepEqual(reportRange(7, new Date("2026-11-27T12:00:00Z"), 1), { start: "2026-11-20", end: "2026-11-26" });
  assert.equal(reportRange(7, new Date("2026-11-27T01:00:00Z"), 1).end, "2026-11-25");
  const { d } = await chosen();
  const comSite = await withFetch(numbers, () => d.googleReport("dono", 7));
  await withFetch(numbers, () => d.saveGoogleSettings("dono", { siteUrl: "", propertyId: "222" }));
  const semSite = await withFetch(numbers, () => d.googleReport("dono", 7));
  assert.equal((Date.parse(semSite.end) - Date.parse(comSite.end)) / 86400000, 2);
});

test("sem APP_URL o endereço de retorno usa o endereço do pedido", async () => {
  const { appOrigin } = await import("../lib/config");
  const h = (o: Record<string, string>) => ({ get: (n: string) => o[n] ?? null });
  assert.equal(appOrigin({ APP_URL: "https://app.test" }, h({ host: "outro.test" })), "https://app.test");
  assert.equal(appOrigin({}, h({ host: "interno", "x-forwarded-host": "site.test", "x-forwarded-proto": "https" })), "https://site.test");
  assert.equal(appOrigin({}, h({ host: "localhost:3000" })), "http://localhost:3000");
  assert.equal(appOrigin({}, h({ host: "site.test" })), "https://site.test");
});
