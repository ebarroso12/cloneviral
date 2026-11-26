// Achados da revisão independente: publicação duplicada ou indevida, conta errada, histórico inventado,
// coleta em laço, gravação perdida e permissões da Meta.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rv-rev-"));
process.env.RV_DATA_DIR = dir;
process.env.RV_SECRET = "segredo-de-teste";
for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "META_CONFIG_ID"]) delete process.env[k];

type Call = { url: URL; method: string };
type Reply = (c: Call) => { status?: number; body: unknown } | "queda" | Promise<{ status?: number; body: unknown }>;
async function withFetch<T>(reply: Reply, fn: (calls: Call[]) => Promise<T>) {
  const real = globalThis.fetch;
  const calls: Call[] = [];
  globalThis.fetch = (async (input: any, init: any = {}) => {
    const c = { url: new URL(String(input)), method: init.method ?? "GET" };
    calls.push(c);
    const r = await reply(c);
    if (r === "queda") throw new Error("conexão caiu");
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200 });
  }) as typeof fetch;
  try {
    return await fn(calls);
  } finally {
    globalThis.fetch = real;
  }
}
const published = (calls: Call[]) => calls.filter((c) => c.url.pathname.endsWith("/media_publish")).length;
const metaOk: Reply = (c) => {
  const p = c.url.pathname;
  if (c.url.hostname === "rupload.facebook.com") return { body: { success: true } };
  if (p.endsWith("/media_publish")) return { body: { id: "midia" } };
  if (p.endsWith("/media") && c.method === "POST") return { body: { id: "cont", uri: "https://rupload.facebook.com/ig-api-upload/v27.0/cont" } };
  if (p.endsWith("/cont")) return { body: { status_code: "FINISHED" } };
  return { body: { access_token: "pagina" } };
};

async function account(userId: string, conn: Record<string, any> = {}) {
  const { getStore, scopedId } = await import("../lib/store");
  const { encrypt } = await import("../lib/instagram");
  const { uploadDir, videoPath } = await import("../lib/videos");
  const s = getStore();
  await s.insert("ig_connection", userId, { demo: false, status: "connected", token: encrypt("t"), igId: "ig1", pageId: "pg1", measuringSince: "2026-01-10", ...conn }, scopedId(userId, "conn"));
  const video = await s.insert("videos", userId, { name: "v.mp4", ext: ".mp4" });
  fs.mkdirSync(uploadDir(userId), { recursive: true });
  fs.writeFileSync(videoPath(userId, video as any), "x");
  return { s, video };
}
const NOW = new Date("2026-11-26T10:00:00");
const body = (videoId: string, over: Record<string, any> = {}) => ({ date: "2026-11-26", time: "18:00", caption: "c", kind: "viral", videoId, autoPublish: true, ...over });
const clear = async () => {
  const { getStore } = await import("../lib/store");
  for (const p of await getStore().findAll("scheduled_posts", () => true)) await getStore().remove("scheduled_posts", p.id, p.userId);
};

test("REV-1: clique duplo não cria dois posts automáticos iguais", async () => {
  const { schedulePost } = await import("../lib/schedule");
  const { s, video } = await account("a1");
  const r = await Promise.allSettled([schedulePost("a1", body(video.id), NOW), schedulePost("a1", body(video.id), NOW)]);
  assert.equal(r.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal((await s.list("scheduled_posts", "a1")).length, 1);
});

test("REV-2: publicação automática em horário que já passou é recusada; a manual é aceita", async () => {
  const { schedulePost } = await import("../lib/schedule");
  const { video } = await account("a2");
  await assert.rejects(() => schedulePost("a2", body(video.id, { time: "09:00" }), NOW), /já passou/i);
  await assert.rejects(() => schedulePost("a2", body("de-outra-conta"), NOW), /vídeo/i);
  await assert.rejects(() => schedulePost("a2", body(video.id, { date: "26/11" }), NOW), /data/i);
  const manual = await schedulePost("a2", body(video.id, { time: "09:00", autoPublish: false }), NOW);
  assert.equal(manual.status, "agendado");
  assert.equal(manual.autoPublish, false);
});

test("REV-2: a API genérica não cria nem altera agendamento, só apaga", async () => {
  const { WRITABLE, DELETABLE } = await import("../lib/collections");
  assert.equal(WRITABLE.has("scheduled_posts"), false);
  assert.equal(DELETABLE.has("scheduled_posts"), true);
});

test("REV-3: post removido ou adiado enquanto outro sobe não é publicado", async () => {
  await clear();
  const { publishDue } = await import("../lib/publish");
  const { s, video } = await account("a3");
  const make = (time: string) => s.insert("scheduled_posts", "a3", { ...body(video.id, { time }), status: "agendado" });
  await make("09:57");
  const removed = await make("09:58");
  const moved = await make("09:59");
  let first = true;
  await withFetch(async (c) => {
    if (first) {
      first = false;
      await s.remove("scheduled_posts", removed.id, "a3");
      await s.update("scheduled_posts", moved.id, "a3", { time: "23:00" });
    }
    return metaOk(c) as any;
  }, async (calls) => {
    await publishDue(NOW, { pollMs: 1 });
    assert.equal(published(calls), 1);
  });
  assert.equal((await s.get("scheduled_posts", moved.id))!.status, "agendado");
});

test("REV-4: resposta perdida na publicação vira conferir, nunca falhou", async () => {
  await clear();
  const { publishDue } = await import("../lib/publish");
  const { s, video } = await account("a4");
  const p = await s.insert("scheduled_posts", "a4", { ...body(video.id, { time: "09:59" }), status: "agendado" });
  await withFetch((c) => (c.url.pathname.endsWith("/media_publish") ? "queda" : metaOk(c)), () => publishDue(NOW, { pollMs: 1 }));
  const after = await s.get("scheduled_posts", p.id);
  assert.equal(after!.status, "conferir");
  assert.match(after!.error, /Instagram/);
});

test("REV-4: se a Meta confirma que publicou, o post fica como publicado", async () => {
  await clear();
  const { publishDue } = await import("../lib/publish");
  const { s, video } = await account("a5");
  const p = await s.insert("scheduled_posts", "a5", { ...body(video.id, { time: "09:59" }), status: "agendado" });
  let sent = false;
  await withFetch((c) => {
    if (c.url.pathname.endsWith("/media_publish")) { sent = true; return "queda"; }
    if (sent && c.url.pathname.endsWith("/cont")) return { body: { status_code: "PUBLISHED" } };
    return metaOk(c);
  }, () => publishDue(NOW, { pollMs: 1 }));
  assert.equal((await s.get("scheduled_posts", p.id))!.status, "publicado");
});

const acc = (igId: string, username: string) => ({ igId, pageId: "pg-" + igId, username });

test("REV-5: reautorizar a mesma conta mantém histórico e a data de início", async () => {
  const { saveConnection } = await import("../lib/connection");
  const { s } = await account("c1");
  await s.insert("posts", "c1", { caption: "antigo" });
  await saveConnection("c1", { token: "novo", expiresIn: 100, account: acc("ig1", "a") });
  const [conn] = await s.list("ig_connection", "c1");
  assert.equal(conn.measuringSince, "2026-01-10");
  assert.equal((await s.list("posts", "c1")).length, 1);
});

test("REV-5: trocar de conta exige confirmação, guarda cópia, não mistura e segura os agendados", async () => {
  const { saveConnection } = await import("../lib/connection");
  const { s, video } = await account("c2");
  await s.insert("posts", "c2", { caption: "da conta antiga" });
  const p = await s.insert("scheduled_posts", "c2", { ...body(video.id), status: "agendado" });
  await assert.rejects(() => saveConnection("c2", { token: "n", expiresIn: 100, account: acc("ig2", "b") }), /outra conta/i);
  assert.equal((await s.list("posts", "c2")).length, 1);
  await saveConnection("c2", { token: "n", expiresIn: 100, account: acc("ig2", "b"), confirmSwitch: true });
  assert.equal((await s.list("posts", "c2")).length, 0);
  assert.equal((await s.get("scheduled_posts", p.id))!.autoPublish, false);
  const kept = fs.readdirSync(path.join(dir, "backups")).find((f) => f.startsWith("conta-ig1"))!;
  assert.match(fs.readFileSync(path.join(dir, "backups", kept), "utf8"), /da conta antiga/);
});

test("REV-5: lista todas as contas, seguindo a paginação", async () => {
  const { listInstagramAccounts } = await import("../lib/instagram");
  const list = await withFetch((c) => {
    if (c.url.searchParams.get("after")) return { body: { data: [{ id: "p3", instagram_business_account: { id: "i3", username: "tres" } }] } };
    return { body: { data: [{ id: "p1", instagram_business_account: { id: "i1", username: "um" } }, { id: "p2" }], paging: { next: "https://graph.facebook.com/v27.0/me/accounts?after=x" } } };
  }, () => listInstagramAccounts("t"));
  assert.deepEqual(list.map((a) => a.igId), ["i1", "i3"]);
});

const syncReply = (opts: { expired?: boolean; insightsFail?: string } = {}): Reply => (c) => {
  const p = c.url.pathname;
  if (opts.expired) return { status: 400, body: { error: { message: "Error validating access token", code: 190 } } };
  const day = new Date(Date.now() - 3 * 86400000).toISOString();
  if (p.endsWith("/media")) return { body: { data: [{ id: "antigo", media_type: "IMAGE", timestamp: "2020-01-01T00:00:00Z" }] } };
  if (p.endsWith("/antigo/insights")) return opts.insightsFail ? { status: 400, body: { error: { message: opts.insightsFail, code: 100 } } } : { body: { data: [] } };
  if (p.endsWith("/insights")) return { body: { data: [{ name: "reach", values: [{ value: 7, end_time: day }] }] } };
  return { body: { username: "u", followers_count: 900, follows_count: 3, media_count: 1 } };
};

test("REV-6: dias passados não ganham seguidores inventados", async () => {
  const { syncAccount } = await import("../lib/instagram");
  const { computeMetrics } = await import("../lib/metrics");
  const { s } = await account("s1");
  await withFetch(syncReply(), () => syncAccount("s1"));
  const snaps = (await s.list("snapshots", "s1")) as any[];
  const past = snaps.find((x) => x.date !== new Date().toISOString().slice(0, 10))!;
  assert.equal(past.followers, undefined);
  assert.equal(past.reach, 7);
  const m = computeMetrics([], snaps, null, "30d");
  assert.equal(m.growth.series.length, 1);
  assert.equal(m.growth.allMeasured, false);
  assert.equal(m.growth.delta, 0);
  assert.equal(m.reachDaily.series.length, 2);
  assert.equal(m.profile.followers, 900);
});

test("REV-7: autorização vencida é registrada e não entra em laço", async () => {
  const { syncAccount, syncDue } = await import("../lib/instagram");
  const { s } = await account("s2");
  await withFetch(syncReply({ expired: true }), () => assert.rejects(() => syncAccount("s2")));
  const [conn] = await s.list("ig_connection", "s2");
  assert.equal(conn.status, "reautorizar");
  assert.match(conn.syncError, /access token/);
  assert.equal(syncDue(conn, Date.now() + 86400000 * 3), false);
  const base = { status: "connected", demo: false };
  const now = Date.now();
  const ago = (ms: number) => new Date(now - ms).toISOString();
  assert.equal(syncDue({ ...base, lastSyncAttempt: ago(60_000), syncError: "x" }, now), false);
  assert.equal(syncDue({ ...base, lastSyncAttempt: ago(2 * 3600_000), syncError: "x" }, now), true);
  assert.equal(syncDue({ ...base, lastSync: ago(3600_000) }, now), false);
  assert.equal(syncDue({ ...base, lastSync: ago(21 * 3600_000) }, now), true);
});

test("REV-7: duas coletas ao mesmo tempo viram uma", async () => {
  const { syncAccount } = await import("../lib/instagram");
  await account("s3");
  await withFetch(syncReply(), async (calls) => {
    await Promise.all([syncAccount("s3"), syncAccount("s3")]);
    assert.equal(calls.filter((c) => c.url.pathname.endsWith("/media")).length, 1);
  });
});

test("REV-10: post sem métrica disponível para de ser repetido depois de três tentativas", async () => {
  const { syncAccount } = await import("../lib/instagram");
  await account("s4");
  const fail = syncReply({ insightsFail: "mídia anterior à conta profissional" });
  for (let i = 0; i < 3; i++) await withFetch(fail, () => syncAccount("s4"));
  await withFetch(fail, async (calls) => {
    const r = await syncAccount("s4");
    assert.equal(calls.some((c) => c.url.pathname.endsWith("/antigo/insights")), false);
    assert.equal(r.partial, false);
  });
});

test("REV-8: falha ao gravar no disco não derruba o app e a gravação é refeita", async () => {
  const { FileStore } = await import("../lib/store");
  const file = path.join(dir, "falha.json");
  fs.mkdirSync(file + ".tmp"); // impede a escrita
  const s = new FileStore(file);
  await s.insert("ideas", "u", { text: "não perder" });
  await new Promise((r) => setTimeout(r, 500));
  assert.equal(fs.existsSync(file), false);
  fs.rmdirSync(file + ".tmp");
  await new Promise((r) => setTimeout(r, 2500));
  assert.match(fs.readFileSync(file, "utf8"), /não perder/);
});

test("REV-8: cópia de segurança ruim não substitui as boas", async () => {
  const { backupDb } = (await import("../scripts/backup.mjs" as string)) as { backupDb: (d: string, now?: Date) => string };
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "rv-bkp-"));
  fs.writeFileSync(path.join(d, "db.json"), '{"ok":1}');
  for (let i = 1; i <= 16; i++) backupDb(d, new Date(Date.UTC(2026, 9, i)));
  assert.equal(fs.readdirSync(path.join(d, "backups")).length, 14);
  fs.writeFileSync(path.join(d, "db.json"), "{ quebrado");
  assert.equal(backupDb(d, new Date(Date.UTC(2026, 10, 1))), "invalido");
  assert.equal(fs.readdirSync(path.join(d, "backups")).length, 14);
  assert.equal(fs.existsSync(path.join(d, "backups", "db-2026-11-01.json")), false);
});

test("REV-9: Login do Facebook para Empresas usa config_id; permissões faltando são avisadas", async () => {
  const { authUrl, missingPermissions } = await import("../lib/instagram");
  process.env.META_APP_ID = "1";
  assert.match(authUrl("http://localhost:3000/api/ig/callback", "s"), /scope=/);
  process.env.META_CONFIG_ID = "cfg9";
  const u = new URL(authUrl("http://localhost:3000/api/ig/callback", "s"));
  assert.equal(u.searchParams.get("config_id"), "cfg9");
  assert.equal(u.searchParams.has("scope"), false);
  delete process.env.META_CONFIG_ID;
  const miss = await withFetch(() => ({ body: { data: [{ permission: "instagram_basic", status: "granted" }, { permission: "pages_show_list", status: "declined" }] } }), () => missingPermissions("t"));
  assert.ok(miss.includes("pages_show_list") && miss.includes("instagram_manage_insights"));
  assert.equal(miss.includes("instagram_basic"), false);
});

test("Atalho aberto duas vezes: reconhece o próprio app e não disputa a porta", async () => {
  const http = await import("node:http");
  const { portState } = (await import("../scripts/porta.mjs" as string)) as { portState: (p: number) => Promise<string> };
  const serve = async (html: string) => {
    const s = http.createServer((_q, r) => r.end(html));
    await new Promise<void>((ok) => s.listen(0, "127.0.0.1", () => ok()));
    return { s, port: (s.address() as any).port as number };
  };
  const mine = await serve("<title>Privacidade · Radar Viral</title>");
  const other = await serve("<title>Outro projeto</title>");
  assert.equal(await portState(mine.port), "nosso");
  assert.equal(await portState(other.port), "ocupada");
  mine.s.close();
  other.s.close();
  assert.equal(await portState(mine.port), "livre");
});
