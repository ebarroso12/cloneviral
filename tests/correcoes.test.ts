// Defeitos achados na revisão de código de 27/11/2026. Um teste por defeito, serviços externos simulados.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.RV_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "rv-cor-"));
delete process.env.GEMINI_API_KEY;
delete process.env.GEMINI_MODEL;
delete process.env.ANTHROPIC_API_KEY;

type Call = { url: URL; body: any };
async function withFetch<T>(reply: (c: Call) => { status?: number; body?: unknown; headers?: Record<string, string> }, fn: (calls: Call[]) => Promise<T>) {
  const real = globalThis.fetch;
  const calls: Call[] = [];
  globalThis.fetch = (async (u: any, init: any = {}) => {
    let body = init.body;
    if (typeof body === "string") try { body = JSON.parse(body); } catch {}
    const c = { url: new URL(String(u)), body };
    calls.push(c);
    const r = reply(c);
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status ?? 200, headers: r.headers });
  }) as typeof fetch;
  try { return await fn(calls); } finally { globalThis.fetch = real; }
}
const out = (text: string) => ({ body: { steps: [{ type: "model_output", content: [{ type: "text", text }] }] } });
const KEY = "chave-de-teste-0123456789";

const setup = (async () => {
  const { getStore } = await import("../lib/store");
  const s = getStore();
  await s.insert("users", "dono", { email: "dono@x.test" }, "dono");
  return s;
})();

test("1: negócio salvo sem a voz não quebra nenhum gerador nem escreve 'undefined' no pedido", async () => {
  const s = await setup;
  await s.insert("business", "semvoz", { name: "Loja" });
  await s.insert("persona", "semvoz", { document: "x" });
  const { loadCtx } = await import("../lib/api");
  const ai = await import("../lib/ai");
  const { genStories } = await import("../lib/stories");
  const ctx = await loadCtx("semvoz");
  assert.equal(/undefined/.test(ai.voiceBrief(ctx)), false);
  assert.ok((await genStories(ctx, { goal: "x" })).frames.length);
  assert.ok((await ai.genScripts(ctx, { type: "viral", dest: "reel", n: 1 }))[0].cta);
  assert.ok((await ai.genSeries(ctx, { theme: "x", chapters: 3 })).length);
  assert.ok((await ai.genIsca(ctx, { keyword: "guia" })).sections.length);
  assert.ok((await ai.genCarousel(ctx, { theme: "x" })).length);
  assert.ok(ai.newsAngle(ctx, "t", "r"));
  // mesmo um contexto montado à mão, sem voz, não derruba o resumo
  assert.equal(/undefined/.test(ai.voiceBrief({ business: {}, persona: {} } as any)), false);
});

const media = (id: string) => ({ id, media_type: "IMAGE", timestamp: "2020-01-01T00:00:00+0000", caption: id, like_count: 1 });
/** Conta com 5 páginas de 2 posts; o cursor "after" diz qual página. */
function bigAccount(opts: { expired?: boolean; newest?: string[] } = {}) {
  const ids = [...(opts.newest ?? []), "101", "102", "103", "104", "105", "106", "107", "108", "109", "110"];
  return (c: Call) => {
    if (c.url.pathname.endsWith("/media")) {
      const from = Number(c.url.searchParams.get("after") ?? 0);
      if (opts.expired && from) return { status: 400, body: { error: { message: "cursor inválido", code: 100 } } };
      const next = from + 2 < ids.length ? { next: `https://graph.facebook.com/v27.0/99/media?limit=2&access_token=tk&after=${from + 2}` } : {};
      return { body: { data: ids.slice(from, from + 2).map(media), paging: next } };
    }
    if (c.url.pathname.endsWith("/99")) return { body: { username: "u", followers_count: 1, media_count: ids.length } };
    if (/\/\d{3}\/insights$/.test(c.url.pathname)) return { body: { data: [{ name: "views", values: [{ value: 7 }] }] } };
    return { body: { data: [] } };
  };
}
async function connect(userId: string) {
  const s = await setup;
  const { encrypt } = await import("../lib/instagram");
  await s.insert("ig_connection", userId, { status: "connected", demo: false, igId: "99", token: encrypt("tk") });
}
const afters = (calls: Call[]) => calls.filter((c) => c.url.pathname.endsWith("/media")).map((c) => c.url.searchParams.get("after") ?? "0");

test("2: conta grande continua de onde parou até ler os posts antigos, sem guardar a chave no cursor", async () => {
  const s = await setup;
  const { syncAccount } = await import("../lib/instagram");
  await connect("grande");
  const conn = async () => (await s.list("ig_connection", "grande"))[0];
  // prazo zero: cada coleta lê o mínimo
  await withFetch(bigAccount(), () => syncAccount("grande", { deadlineMs: 0 }));
  assert.equal((await s.list("posts", "grande")).length, 2);
  assert.ok((await conn()).listCursor.includes("after=2"));
  assert.equal(String((await conn()).listCursor).includes("access_token"), false);
  await withFetch(bigAccount(), async (calls) => {
    await syncAccount("grande", { deadlineMs: 0 });
    assert.deepEqual(afters(calls), ["0", "2"], "relê o começo (posts novos) e retoma o cursor");
  });
  for (let i = 0; i < 3; i++) await withFetch(bigAccount(), () => syncAccount("grande", { deadlineMs: 0 }));
  assert.equal((await s.list("posts", "grande")).length, 10);
  assert.equal((await conn()).listCursor, null);
  // com tempo, os antigos que ficaram sem métrica são medidos mesmo fora das páginas lidas nesta rodada
  await withFetch(bigAccount(), () => syncAccount("grande"));
  assert.equal((await s.list("posts", "grande")).filter((p) => !p.insightsAt).length, 0);
});

test("2: post novo entra mesmo com a leitura dos antigos em andamento; cursor vencido recomeça", async () => {
  const s = await setup;
  const { syncAccount } = await import("../lib/instagram");
  await connect("novo");
  await withFetch(bigAccount(), () => syncAccount("novo", { deadlineMs: 0 }));
  await withFetch(bigAccount({ newest: ["201", "202"] }), () => syncAccount("novo"));
  const ids = (await s.list("posts", "novo")).map((p) => p.caption);
  assert.ok(ids.includes("201") && ids.includes("202") && ids.includes("110"));
  await connect("venc");
  await withFetch(bigAccount(), () => syncAccount("venc", { deadlineMs: 0 }));
  const r: any = await withFetch(bigAccount({ expired: true }), () => syncAccount("venc", { deadlineMs: 0 }));
  assert.equal(r.partial, true);
  assert.equal((await s.list("ig_connection", "venc"))[0].listCursor, null);
});

test("3 e 10: 'Nenhum' desliga mesmo com chave no servidor; modelo fora da lista gratuita é ignorado", async () => {
  await setup;
  const p = await import("../lib/providers");
  process.env.GEMINI_API_KEY = "g";
  try {
    process.env.GEMINI_MODEL = "gemini-4-carbon";
    assert.equal((await p.getAi("text", "dono"))!.model, "gemini-3.6-flash");
    assert.equal((await p.getAi("video", "dono"))!.model, "gemini-3.5-flash-lite");
    process.env.GEMINI_MODEL = "gemini-3.8-flash";
    assert.equal((await p.getAi("text", "dono"))!.model, "gemini-3.8-flash");
    await p.saveAi("dono", { kind: "text", provider: "" });
    assert.equal(await p.getAi("text", "dono"), null);
    assert.equal((await p.aiStatus("dono")).kinds.find((k) => k.kind === "text")!.active, "");
    assert.ok(await p.getAi("video", "dono"), "os outros tipos continuam");
  } finally {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
  }
});

test("6: chave que não abre mais não derruba as telas e pede para colar de novo", async () => {
  const s = await setup;
  const p = await import("../lib/providers");
  await p.saveAi("dono", { kind: "text", provider: "gemini-gratis", key: KEY });
  const before = process.env.RV_SECRET;
  process.env.RV_SECRET = "outro-segredo";
  try {
    assert.equal(await p.getAi("text", "dono"), null);
    const k = (await p.aiStatus("dono")).kinds.find((x) => x.kind === "text")!;
    assert.deepEqual([k.brokenKey, k.active], [true, ""]);
    await assert.rejects(() => p.saveAi("dono", { kind: "text", provider: "gemini-gratis" }), /chave/);
    await p.saveAi("dono", { kind: "text", provider: "gemini-gratis", key: KEY });
    assert.equal((await p.getAi("text", "dono"))!.key, KEY);
  } finally {
    if (before === undefined) delete process.env.RV_SECRET;
    else process.env.RV_SECRET = before;
    await p.saveAi("dono", { kind: "text", provider: "" });
    assert.ok(await s.list("ai_settings", "dono"));
  }
});

const profile = (u: string) => ({ business_discovery: { username: u, followers_count: 10, media_count: 0 } });
const ideas = (names: string[]) => out(JSON.stringify(names.map((username) => ({ username, reason: "r" }))));
const asked = (c: Call) => c.url.searchParams.get("fields")!.match(/username\(([^)]+)\)/)![1];

test("4 e 8: sugestão mostra a falha real, ignora só perfil inexistente e não rebatiza perfil adicionado", async () => {
  const s = await setup;
  const p = await import("../lib/providers");
  const d = await import("../lib/discovery");
  await connect("dono");
  await p.saveAi("dono", { kind: "text", provider: "gemini-gratis", key: KEY });
  const meta = (limit: Set<string>) => (c: Call) => {
    if (c.url.host !== "graph.facebook.com") return ideas(["meu", "sumido", "outro", "depois"]);
    if (limit.has(asked(c))) return { status: 400, body: { error: { message: "Application request limit reached", code: 4 } } };
    if (asked(c) === "sumido") return { status: 400, body: { error: { message: "Invalid user id", code: 110, error_subcode: 2207013 } } };
    return { body: profile(asked(c)) };
  };
  await withFetch(meta(new Set()), () => d.addProfile("dono", "meu"));
  const partial: any = await withFetch(meta(new Set(["outro"])), () => d.suggestProfiles("dono"));
  assert.equal(partial.found, 1);
  assert.match(partial.warning, /limit/);
  const mine = (await s.list("ref_profiles", "dono")).find((r) => r.username === "meu")!;
  assert.deepEqual([mine.suggested, mine.reason], [false, ""]);
  await withFetch(meta(new Set(["meu"])), async () => assert.rejects(() => d.suggestProfiles("dono"), /limit/));
  await withFetch((c) => (c.url.host === "graph.facebook.com" ? meta(new Set())(c) : ideas(["sumido"])), async () => assert.deepEqual(await d.suggestProfiles("dono"), { found: 0, tried: 1 }));
});

test("7: IA ligada que falha mostra o motivo, não 'ligue uma IA'", async () => {
  await setup;
  const p = await import("../lib/providers");
  await p.saveAi("dono", { kind: "text", provider: "gemini-gratis", key: KEY });
  const d = await import("../lib/discovery");
  const { genStories } = await import("../lib/stories");
  const { genCarousel } = await import("../lib/ai");
  const ctx: any = { userId: "dono", persona: { answers: {} }, business: { voice: {} } };
  const busy = () => ({ status: 429, body: { error: { message: "cota esgotada" } } });
  await withFetch(busy, async () => {
    for (const run of [() => d.suggestProfiles("dono"), () => genStories(ctx, { goal: "x", previous: [{ role: "a", text: "b" }], instruction: "curto" }), () => genCarousel(ctx, { theme: "x", language: "en" })])
      await assert.rejects(run, (e: any) => /429.*cota esgotada/.test(e.message) && !/ligue|ligada/i.test(e.message));
  });
  await withFetch(() => out("não sei"), async () => assert.rejects(() => d.suggestProfiles("dono"), /formato/));
});

test("9: ajustar Stories pede a mesma quantidade de telas que a sequência já tem", async () => {
  await setup;
  const { genStories } = await import("../lib/stories");
  const ctx: any = { userId: "dono", persona: { answers: {} }, business: { voice: {} } };
  const previous = Array.from({ length: 6 }, (_, i) => ({ role: "a", text: `t${i}` }));
  await withFetch(() => out(JSON.stringify(previous)), async (calls) => {
    await genStories(ctx, { goal: "x", count: 6, previous, instruction: "mais curto" });
    assert.match(calls[0].body.input, /6 telas/);
  });
});

test("5: análise de vídeo respeita um prazo único e limpa sobras antigas", async () => {
  const s = await setup;
  const p = await import("../lib/providers");
  const v = await import("../lib/videos");
  const { analyzeVideo } = await import("../lib/videoReview");
  await p.saveAi("dono", { kind: "video", provider: "gemini-gratis", key: KEY });
  const ctx: any = { userId: "dono", persona: { answers: {} }, business: { voice: {} } };
  const send = async (source = "analise") => {
    const d = await v.startUpload("dono", { name: "a.mp4", size: 10, source });
    await v.savePart("dono", d.id, 0, Buffer.alloc(10));
    return (await v.finishUpload("dono", d.id))!;
  };
  // prazo já esgotado: nem chama a IA, avisa e apaga o arquivo
  const late = await send();
  await withFetch(() => out("{}"), async (calls) => {
    await assert.rejects(() => analyzeVideo(ctx, late, 1, 0), /demorou demais/);
    assert.equal(calls.length, 0);
  });
  assert.equal(await s.get("videos", late.id), null);
  // preparo que nunca termina para no prazo
  const cfg = (await p.getAi("video", "dono"))!;
  await withFetch((c) => {
    if (c.url.pathname === "/upload/v1beta/files") return { headers: { "x-goog-upload-url": "https://envio.test/u" } };
    return { body: { file: { name: "files/1", state: "PROCESSING" }, name: "files/1", state: "PROCESSING" } };
  }, async () => assert.rejects(() => p.askVideo(cfg, Buffer.alloc(15 * 1024 * 1024), "video/mp4", "veja", 400, Date.now() + 1500), /demorou demais/));
  // sobra de uma análise cortada pelo servidor some no próximo envio; a recente e a do planejador ficam
  const old = await send();
  const keep = await send("planejador");
  const fresh = await send();
  await s.update("videos", old.id, "dono", { createdAt: new Date(Date.now() - 3600_000).toISOString() } as any);
  await send("planejador");
  assert.equal(await s.get("videos", old.id), null);
  assert.ok((await s.get("videos", keep.id)) && (await s.get("videos", fresh.id)));
});
