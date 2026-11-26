// Períodos por data (não por posição na lista) e sincronização que não esconde falhas.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { computeMetrics, type Snap } from "../lib/metrics";

process.env.RV_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "rv-sync-"));
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.RV_SECRET = "segredo-de-teste";

const snap = (date: string, followers: number): Snap => ({ date, followers, following: 1, mediaCount: 1, reach: 10 });
// medidos em 01, 02, 10 e 20/11: há buracos
const gaps = [snap("2026-11-01", 100), snap("2026-11-02", 110), snap("2026-11-10", 150), snap("2026-11-20", 200)];

test("BUG-017: 7 dias compara com a data de 7 dias atrás, mesmo com dias faltando", () => {
  const m = computeMetrics([], gaps, null, "7d");
  assert.equal(m.growth.delta, 200 - 150);
  assert.deepEqual(m.growth.series.map((s) => s.date), ["2026-11-20"]);
  assert.equal(m.growth.allMeasured, false);
});

test("BUG-017: 30 dias começa na primeira coleta dentro da janela", () => {
  const m = computeMetrics([], gaps, null, "30d");
  assert.equal(m.growth.delta, 100);
  assert.equal(m.growth.series.length, 4);
  assert.equal(m.growth.allMeasured, false);
});

type Reply = (url: URL) => { status?: number; body: unknown };
async function withGraph<T>(reply: Reply, fn: (calls: string[]) => Promise<T>) {
  const real = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: any) => {
    const url = new URL(String(input));
    calls.push(url.pathname);
    const r = reply(url);
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200 });
  }) as typeof fetch;
  try {
    return await fn(calls);
  } finally {
    globalThis.fetch = real;
  }
}

const media = (i: number) => ({ id: `m${i}`, media_type: "IMAGE", timestamp: new Date(Date.now() - i * 86400000).toISOString(), like_count: 5, comments_count: 1, permalink: "https://example.test/p" });
const graph = (opts: { insightsFail?: boolean; posts?: number }): Reply => (url) => {
  const p = url.pathname;
  if (p.endsWith("/media")) return { body: { data: Array.from({ length: opts.posts ?? 2 }, (_, i) => media(i)) } };
  if (p.endsWith("/insights")) {
    if (opts.insightsFail) return { status: 400, body: { error: { message: "sem permissão de insights" } } };
    return { body: { data: [{ name: "reach", values: [{ value: 40 }] }, { name: "views", values: [{ value: 60 }] }] } };
  }
  return { body: { username: "conta", followers_count: 50, follows_count: 3, media_count: opts.posts ?? 2, profile_picture_url: "https://example.test/foto.jpg" } };
};

async function connect(userId: string) {
  const { encrypt } = await import("../lib/instagram");
  const { getStore, scopedId } = await import("../lib/store");
  await getStore().insert("ig_connection", userId, { demo: false, status: "connected", token: encrypt("t"), igId: "ig1" }, scopedId(userId, "conn"));
  return getStore();
}

test("BUG-018: falha da Meta aparece como aviso e não apaga métricas já medidas", async () => {
  const { syncAccount } = await import("../lib/instagram");
  const s = await connect("w1");
  await withGraph(graph({}), () => syncAccount("w1"));
  const r: any = await withGraph(graph({ insightsFail: true }), () => syncAccount("w1"));
  assert.match(r.warnings.join(" "), /sem permissão de insights/);
  assert.equal((await s.list("posts", "w1"))[0].reach, 40);
  assert.match((await s.list("ig_connection", "w1"))[0].syncWarnings.join(" "), /sem permissão/);
});

test("BUG-019: a sincronização tem prazo e continua de onde parou", async () => {
  const { syncAccount } = await import("../lib/instagram");
  const s = await connect("w2");
  const first: any = await withGraph(graph({ posts: 5 }), () => syncAccount("w2", { deadlineMs: 0 }));
  assert.equal(first.partial, true);
  assert.equal((await s.list("posts", "w2")).length, 5, "os posts entram mesmo sem as métricas detalhadas");
  const second: any = await withGraph(graph({ posts: 5 }), () => syncAccount("w2"));
  assert.equal(second.partial, false);
  assert.ok((await s.list("posts", "w2")).every((p) => p.reach === 40));
});

test("Foto do perfil é guardada na sincronização", async () => {
  const { syncAccount } = await import("../lib/instagram");
  const s = await connect("w3");
  await withGraph(graph({}), () => syncAccount("w3"));
  assert.equal((await s.list("ig_connection", "w3"))[0].picture, "https://example.test/foto.jpg");
});

test("Coleta diária sincroniza todas as contas reais conectadas e ignora a demonstração", async () => {
  const { syncAll } = await import("../lib/instagram");
  const s = await connect("w4");
  await s.insert("ig_connection", "demo1", { demo: true, status: "connected" });
  const r = await withGraph(graph({}), () => syncAll());
  assert.ok(r.accounts >= 1);
  assert.equal(r.results.some((x) => x.userId === "demo1"), false);
  assert.equal((await s.list("snapshots", "w4")).length >= 1, true);
});
