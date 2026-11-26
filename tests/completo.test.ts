// Fecha o que estava pela metade: convite, chaves da Meta no app, anúncios reais, vídeo e Reels no site.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.RV_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "rv-completo-"));
process.env.RV_SECRET = "segredo-de-teste";
for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY", "RV_DB_KEY", "RV_SIGNUP_CODE", "META_APP_ID", "META_APP_SECRET", "META_CONFIG_ID", "VERCEL"]) delete process.env[k];

type Call = { url: URL; method: string; headers: Record<string, string>; body: any };
async function withFetch<T>(reply: (c: Call) => { status?: number; body: unknown }, fn: (calls: Call[]) => Promise<T>) {
  const real = globalThis.fetch;
  const calls: Call[] = [];
  globalThis.fetch = (async (input: any, init: any = {}) => {
    const c = { url: new URL(String(input)), method: init.method ?? "GET", headers: Object.fromEntries(Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), String(v)])), body: init.body };
    calls.push(c);
    const r = reply(c);
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200 });
  }) as typeof fetch;
  try {
    return await fn(calls);
  } finally {
    globalThis.fetch = real;
  }
}
const libs = async () => ({ store: (await import("../lib/store")).getStore(), sid: (await import("../lib/store")).scopedId });
const asProduction = async <T>(fn: () => Promise<T>) => {
  const env = process.env as Record<string, string | undefined>;
  const old = env.NODE_ENV;
  env.NODE_ENV = "production";
  try {
    return await fn();
  } finally {
    env.NODE_ENV = old;
  }
};

test("CONV-1: só o dono cria convite; o convite vale uma vez e abre o cadastro", async () => {
  const { signup } = await import("../lib/auth");
  const { createInvite, isOwner } = await import("../lib/invites");
  await asProduction(async () => {
    const owner = await signup("Dona", "dona@exemplo.com", "senha-longa-1");
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(await isOwner(owner), true);
    await assert.rejects(() => signup("X", "x@exemplo.com", "senha-longa-1"), /fechado|convite/i);
    const { code } = await createInvite(owner);
    await assert.rejects(() => signup("Rep", "dona@exemplo.com", "senha-longa-1", code), /Já existe/);
    const guest = await signup("Convidada", "c@exemplo.com", "senha-longa-1", code);
    assert.equal(await isOwner(guest), false);
    await assert.rejects(() => createInvite(guest), /dono/i);
    await assert.rejects(() => signup("Y", "y@exemplo.com", "senha-longa-1", code), /convite|fechado/i);
  });
});

test("CONV-2: convite vencido não vale e o código não fica guardado em texto", async () => {
  const { store } = await libs();
  const { createInvite, claimInvite } = await import("../lib/invites");
  const owner = (await store.findOne("users", (u) => u.email === "dona@exemplo.com"))!;
  const { code } = await createInvite(owner.id);
  const [doc] = await store.list("invites", owner.id);
  assert.equal(JSON.stringify(doc).includes(code), false);
  await store.update("invites", doc.id, owner.id, { expiresAt: "2000-01-01T00:00:00Z" });
  assert.equal(await claimInvite(code), false);
});

test("CONV-3: duas pessoas ao mesmo tempo com o mesmo convite: só uma entra", async () => {
  const { store } = await libs();
  const { createInvite, claimInvite } = await import("../lib/invites");
  const owner = (await store.findOne("users", (u) => u.email === "dona@exemplo.com"))!;
  const { code } = await createInvite(owner.id);
  const r = await Promise.all([claimInvite(code), claimInvite(code)]);
  assert.deepEqual(r.sort(), [false, true]);
});

test("CONV-4: o banco externo só diz que apagou quando apagou", async () => {
  const { SupabaseStore } = await import("../lib/store");
  const s = new SupabaseStore("https://x.supabase.co", "anon", "k");
  await withFetch(() => ({ body: [] }), async () => assert.equal(await s.remove("invites", "i", "u"), false));
  await withFetch(() => ({ body: [{ id: "i" }] }), async (calls) => {
    assert.equal(await s.remove("invites", "i", "u"), true);
    assert.match(calls[0].headers.prefer, /return=representation/);
  });
});

test("META-1: o dono grava o app da Meta dentro do app; o segredo fica cifrado", async () => {
  const { store } = await libs();
  const { saveMetaApp, metaConfig, metaStatus } = await import("../lib/metaApp");
  const owner = (await store.findOne("users", (u) => u.email === "dona@exemplo.com"))!;
  const guest = (await store.findOne("users", (u) => u.email === "c@exemplo.com"))!;
  assert.equal(await metaConfig(), null);
  const secret = "0123456789abcdef0123456789abcdef";
  await assert.rejects(() => saveMetaApp(guest.id, { appId: "123456789012", secret }), /dono/i);
  await assert.rejects(() => saveMetaApp(owner.id, { appId: "abc", secret }), /ID do app/);
  await assert.rejects(() => saveMetaApp(owner.id, { appId: "123456789012", secret: "curta" }), /chave secreta/i);
  await saveMetaApp(owner.id, { appId: " 123456789012 ", secret, configId: "" });
  assert.deepEqual(await metaConfig(), { appId: "123456789012", secret, configId: "" });
  assert.equal(JSON.stringify(await store.list("meta_app", owner.id)).includes(secret), false);
  assert.equal(JSON.stringify(await metaStatus()).includes(secret), false);
});

test("META-2: o endereço de autorização usa as chaves gravadas e pede anúncios só quando preciso", async () => {
  const { authUrl } = await import("../lib/instagram");
  const cfg = { appId: "999", secret: "s", configId: "" };
  const sem = new URL(authUrl("https://x/cb", "st", cfg));
  assert.equal(sem.searchParams.get("client_id"), "999");
  assert.equal(sem.searchParams.get("scope")!.includes("ads_read"), false);
  assert.match(new URL(authUrl("https://x/cb", "st", cfg, { ads: true })).searchParams.get("scope")!, /ads_read/);
});

test("ADS-1: soma as impressões no Instagram de todas as contas de anúncio, seguindo páginas", async () => {
  const { readAdViews } = await import("../lib/ads");
  const reply = (c: Call) => {
    const p = c.url.pathname;
    if (p.endsWith("/me/adaccounts")) return c.url.searchParams.get("after") ? { body: { data: [{ account_id: "2" }] } } : { body: { data: [{ account_id: "1" }], paging: { next: `${c.url.href}&after=x` } } };
    if (p.endsWith("/act_1/insights")) return { body: { data: [{ publisher_platform: "instagram", impressions: "100" }, { publisher_platform: "facebook", impressions: "999" }] } };
    if (p.endsWith("/act_2/insights")) return { body: { data: [{ publisher_platform: "instagram", impressions: "25" }] } };
    return { status: 400, body: { error: { message: "inesperado" } } };
  };
  assert.deepEqual(await withFetch(reply, () => readAdViews("t")), { views: 125, accounts: 2 });
});

test("ADS-2: falha em uma conta de anúncio não vira total menor", async () => {
  const { readAdViews } = await import("../lib/ads");
  const reply = (c: Call) => (c.url.pathname.endsWith("/me/adaccounts") ? { body: { data: [{ account_id: "1" }] } } : { status: 500, body: { error: { message: "caiu" } } });
  await assert.rejects(() => withFetch(reply, () => readAdViews("t")), /caiu/);
});

test("ADS-3: conectar anúncios sem a permissão explica; com ela grava o número medido", async () => {
  const { store, sid } = await libs();
  const { encrypt } = await import("../lib/instagram");
  const { connectAds, adViewsFor } = await import("../lib/ads");
  await store.insert("ig_connection", "ads1", { demo: false, status: "connected", token: encrypt("t"), igId: "i" }, sid("ads1", "conn"));
  const perms = (list: string[]) => (c: Call) => {
    const p = c.url.pathname;
    if (p.endsWith("/me/permissions")) return { body: { data: list.map((permission) => ({ permission, status: "granted" })) } };
    if (p.endsWith("/me/adaccounts")) return { body: { data: [{ account_id: "1" }] } };
    return { body: { data: [{ publisher_platform: "instagram", impressions: "7" }] } };
  };
  await assert.rejects(() => withFetch(perms([]), () => connectAds("ads1")), /ads_read/);
  const d = await withFetch(perms(["ads_read"]), () => connectAds("ads1"));
  assert.equal(d!.views, 7);
  assert.equal(adViewsFor({ demo: false }, d as any), 7);
  await assert.rejects(() => connectAds("ninguem"), /Conecte/);
});

test("VID-1: no site o vídeo vai em pedaços para o banco e volta igual", async () => {
  const { startUpload, savePart, finishUpload, readVideo, CHUNK, deleteVideo } = await import("../lib/videos");
  const { store } = await libs();
  const bytes = Buffer.alloc(CHUNK * 2 + 10, 7);
  bytes[CHUNK] = 1;
  const v = await startUpload("vu", { name: "a.mp4", size: bytes.length, duration: 10 });
  assert.equal(v.parts, 3);
  await savePart("vu", v.id, 0, bytes.subarray(0, CHUNK));
  await assert.rejects(() => finishUpload("vu", v.id), /incompleto/i);
  await assert.rejects(() => savePart("outro", v.id, 1, bytes.subarray(CHUNK, CHUNK * 2)), /não encontrado/i);
  await assert.rejects(() => savePart("vu", v.id, 1, Buffer.alloc(5)), /tamanho/i);
  await assert.rejects(() => savePart("vu", v.id, 3, Buffer.alloc(10)), /pedaço/i);
  await savePart("vu", v.id, 1, bytes.subarray(CHUNK, CHUNK * 2));
  await savePart("vu", v.id, 2, bytes.subarray(CHUNK * 2));
  const done = await finishUpload("vu", v.id);
  assert.equal(done!.ready, true);
  assert.ok((await readVideo("vu", done as any)).equals(bytes));
  await deleteVideo("vu", v.id);
  assert.equal((await store.list("video_chunks", "vu")).length, 0);
  assert.equal((await store.list("videos", "vu")).length, 0);
});

test("VID-2: limites do site: formato, tamanho, duração e espaço total", async () => {
  const { startUpload, SITE_MAX, SITE_TOTAL } = await import("../lib/videos");
  const mb = 1024 * 1024;
  await assert.rejects(() => startUpload("vl", { name: "a.avi", size: mb }), /MP4 ou MOV/);
  await assert.rejects(() => startUpload("vl", { name: "a.mp4", size: SITE_MAX + 1 }), /50 MB/);
  await assert.rejects(() => startUpload("vl", { name: "a.mp4", size: mb, duration: 181 }), /3 minutos/);
  await assert.rejects(() => startUpload("vl", { name: "a.mp4", size: 0 }), /vazio/i);
  for (let i = 0; i < Math.floor(SITE_TOTAL / SITE_MAX); i++) await startUpload("vl", { name: `${i}.mp4`, size: SITE_MAX });
  await assert.rejects(() => startUpload("vl", { name: "z.mp4", size: SITE_MAX }), /espaço/i);
});

test("PUB-FUSO: o horário agendado é o do aparelho de quem agendou, mesmo num servidor em UTC", async () => {
  const { dueTime } = await import("../lib/due");
  assert.equal(new Date(dueTime({ date: "2026-11-26", time: "18:00", tzOffset: 180 })).toISOString(), "2026-11-26T21:00:00.000Z");
  assert.equal(new Date(dueTime({ date: "2026-11-26", time: "18:00", tzOffset: -60 })).toISOString(), "2026-11-26T17:00:00.000Z");
  assert.equal(dueTime({ date: "2026-11-26", time: "18:00" }), new Date("2026-11-26T18:00:00").getTime());
  assert.ok(Number.isNaN(dueTime({ date: "x", time: "y" })));
});

test("PUB-SITE: publica o Reels com o vídeo guardado no banco e libera o espaço", async () => {
  const { store, sid } = await libs();
  const { encrypt } = await import("../lib/instagram");
  const { startUpload, savePart, finishUpload } = await import("../lib/videos");
  const { schedulePost } = await import("../lib/schedule");
  const { publishDue } = await import("../lib/publish");
  await store.insert("ig_connection", "ps", { demo: false, status: "connected", token: encrypt("t"), igId: "ig", pageId: "pg" }, sid("ps", "conn"));
  const v = await startUpload("ps", { name: "r.mp4", size: 4 });
  await assert.rejects(() => schedulePost("ps", { date: "2030-01-01", time: "10:00", videoId: v.id, autoPublish: true, tzOffset: 180 }), /incompleto/i);
  await savePart("ps", v.id, 0, Buffer.from("abcd"));
  await finishUpload("ps", v.id);
  await schedulePost("ps", { date: "2030-01-01", time: "10:00", videoId: v.id, autoPublish: true, tzOffset: 180 });
  const reply = (c: Call) => {
    const p = c.url.pathname;
    if (c.url.hostname === "rupload.facebook.com") return { body: { success: true } };
    if (p.endsWith("/ig/media")) return { body: { id: "cont", uri: "https://rupload.facebook.com/up/cont" } };
    if (p.endsWith("/ig/media_publish")) return { body: { id: "midia" } };
    if (p.endsWith("/cont")) return { body: { status_code: "FINISHED" } };
    return { body: { access_token: "pagina" } };
  };
  await withFetch(reply, async (calls) => {
    assert.deepEqual(await publishDue(new Date("2030-01-01T12:59:00Z"), { pollMs: 0 }), []);
    const r = await publishDue(new Date("2030-01-01T13:01:00Z"), { pollMs: 0 });
    assert.equal(r[0].status, "publicado");
    const up = calls.find((c) => c.url.hostname === "rupload.facebook.com")!;
    assert.equal(Buffer.from(up.body).toString(), "abcd");
  });
  assert.equal((await store.list("video_chunks", "ps")).length, 0);
});

test("APAGAR: excluir a conta leva junto vídeos em pedaços, convites e chaves da Meta", async () => {
  const src = fs.readFileSync("lib/account.ts", "utf8");
  for (const c of ["video_chunks", "invites", "meta_app"]) assert.ok(src.includes(c), c);
});

test("AGENDADOR: o gatilho do site usa segredo, não mostra a resposta e só roda no repositório do dono", () => {
  const y = fs.readFileSync(".github/workflows/publicar.yml", "utf8");
  assert.match(y, /secrets\.CRON_SECRET/);
  assert.match(y, /github\.repository == 'ebarroso12\/cloneviral'/);
  assert.match(y, /-o \/dev\/null/);
  assert.match(y, /concurrency/);
});
