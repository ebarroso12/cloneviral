// Provedores de IA, perfis de referência, Stories, roteiros prontos e análise de vídeo. Serviços externos simulados.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.RV_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "rv-int-"));
delete process.env.GEMINI_API_KEY;
delete process.env.ANTHROPIC_API_KEY;

type Call = { url: URL; headers: Record<string, string>; body: any };
async function withFetch<T>(reply: (c: Call) => { status?: number; body?: unknown; headers?: Record<string, string> }, fn: (calls: Call[]) => Promise<T>) {
  const real = globalThis.fetch;
  const calls: Call[] = [];
  globalThis.fetch = (async (u: any, init: any = {}) => {
    let body = init.body;
    if (typeof body === "string") try { body = JSON.parse(body); } catch {}
    const c = { url: new URL(String(u)), headers: Object.fromEntries(Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), String(v)])), body };
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
  await new Promise((r) => setTimeout(r, 5));
  await s.insert("users", "conv", { email: "conv@x.test" }, "conv");
  return s;
})();

test("IA: só o dono grava; chave cifrada e nunca devolvida; paga exige autorização", async () => {
  const s = await setup;
  const p = await import("../lib/providers");
  await assert.rejects(() => p.saveAi("conv", { kind: "text", provider: "gemini-gratis", key: KEY }), /dono/);
  await assert.rejects(() => p.saveAi("dono", { kind: "text", provider: "openai", key: KEY }), /autorização/);
  await assert.rejects(() => p.saveAi("dono", { kind: "text", provider: "gemini-gratis", model: "gemini-4-carbon", key: KEY }), /lista/);
  await assert.rejects(() => p.saveAi("dono", { kind: "text", provider: "gemini-gratis" }), /chave/);
  await p.saveAi("dono", { kind: "text", provider: "gemini-gratis", key: KEY });
  const [doc] = await s.list("ai_settings", "dono");
  assert.equal(JSON.stringify(doc).includes(KEY), false);
  assert.equal(JSON.stringify(await p.aiStatus("dono")).includes(KEY), false);
  assert.equal((await p.getAi("text", "conv"))!.key, KEY, "gratuito vale para convidado");
  // trocar de provedor não reaproveita a chave do anterior
  await assert.rejects(() => p.saveAi("dono", { kind: "text", provider: "groq-gratis" }), /chave/);
  await p.saveAi("dono", { kind: "text", provider: "openai", key: KEY, allowPaid: true });
  assert.equal((await p.getAi("text", "dono"))!.model, "gpt-6.2-sol");
  assert.equal(await p.getAi("text", "conv"), null, "convidado não gasta a chave paga");
  assert.equal(await p.getAi("text"), null);
  await p.saveAi("dono", { kind: "text", provider: "" });
  assert.equal(await p.getAi("text", "dono"), null);
});

test("IA: cada provedor recebe o pedido no formato dele", async () => {
  await setup;
  const p = await import("../lib/providers");
  const cfg = (kind: any, id: string) => ({ provider: p.findProvider(kind, id)!, model: p.findProvider(kind, id)!.models[0], key: KEY, account: "a".repeat(32) });
  await withFetch(() => out("oi"), async (calls) => {
    assert.equal(await p.askText(cfg("text", "gemini-gratis"), "sis", "usr"), "oi");
    assert.equal(calls[0].url.pathname, "/v1beta/interactions");
    assert.deepEqual([calls[0].body.model, calls[0].body.system_instruction, calls[0].body.input], ["gemini-3.8-flash", "sis", "usr"]);
  });
  await withFetch(() => ({ body: { choices: [{ message: { content: "oi" } }] } }), async (calls) => {
    await p.askText(cfg("text", "groq-gratis"), "sis", "usr");
    assert.equal(calls[0].url.href, "https://api.groq.com/openai/v1/chat/completions");
    assert.equal(calls[0].headers.authorization, `Bearer ${KEY}`);
  });
  await withFetch(() => ({ body: { content: [{ type: "thinking", thinking: "x" }, { type: "text", text: "oi" }] } }), async (calls) => {
    assert.equal(await p.askText(cfg("text", "anthropic"), "sis", "usr"), "oi");
    assert.equal(calls[0].headers["x-api-key"], KEY);
  });
  const jpg = "/9j/AAAA";
  await withFetch(() => ({ body: { result: { image: jpg } } }), async (calls) => {
    assert.equal(await p.askImage(cfg("image", "cloudflare-gratis"), "farol"), `data:image/jpeg;base64,${jpg}`);
    assert.match(calls[0].url.pathname, new RegExp(`/accounts/${"a".repeat(32)}/ai/run/@cf/black-forest-labs/flux-1-schnell$`));
  });
  await withFetch(() => ({ body: { data: [{ b64_json: "iVBORw0KGgo=" }] } }), async () => {
    assert.match(await p.askImage(cfg("image", "openai-imagem"), "farol"), /^data:image\/png/);
  });
  await withFetch(() => ({ body: { steps: [{ type: "model_output", content: [{ type: "image", data: jpg }] }] } }), async () => {
    assert.match(await p.askImage(cfg("image", "gemini-imagem"), "farol"), /^data:image\/jpeg/);
  });
  await withFetch(() => ({ status: 401, body: { error: { message: "chave inválida" } } }), async () => {
    await assert.rejects(() => p.askText(cfg("text", "openai"), "s", "u"), /401: chave inválida/);
  });
});

test("Vídeo: pequeno vai no pedido; grande passa pela API de arquivos", async () => {
  const p = await import("../lib/providers");
  const cfg = { provider: p.findProvider("video", "gemini-gratis")!, model: "gemini-3.5-flash-lite", key: KEY, account: "" };
  await withFetch(() => out("ok"), async (calls) => {
    await p.askVideo(cfg, Buffer.alloc(1000), "video/mp4", "veja");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.input[0].type, "video");
    assert.ok(calls[0].body.input[0].data);
  });
  let polls = 0;
  await withFetch((c) => {
    if (c.url.pathname === "/upload/v1beta/files") return { headers: { "x-goog-upload-url": "https://envio.test/u" } };
    if (c.url.host === "envio.test") return { body: { file: { name: "files/1", uri: "https://g/files/1", state: "PROCESSING" } } };
    if (c.url.pathname === "/v1beta/files/1") return { body: { name: "files/1", uri: "https://g/files/1", state: ++polls > 1 ? "ACTIVE" : "PROCESSING" } };
    return out("ok");
  }, async (calls) => {
    assert.equal(await p.askVideo(cfg, Buffer.alloc(15 * 1024 * 1024), "video/mp4", "veja", 1), "ok");
    assert.equal(calls.at(-1)!.body.input[0].uri, "https://g/files/1");
  });
});

test("Análise de vídeo guarda o parecer e apaga o arquivo enviado só para analisar", async () => {
  const s = await setup;
  const p = await import("../lib/providers");
  const v = await import("../lib/videos");
  const { analyzeVideo } = await import("../lib/videoReview");
  const ctx: any = { userId: "dono", persona: { answers: {} }, business: { voice: {} } };
  const send = async () => {
    const d = await v.startUpload("dono", { name: "a.mp4", size: 10, source: "analise" });
    await v.savePart("dono", d.id, 0, Buffer.alloc(10));
    return (await v.finishUpload("dono", d.id))!;
  };
  await assert.rejects(async () => analyzeVideo(ctx, await send()), /ligue o Gemini/);
  assert.equal((await s.list("video_chunks", "dono")).length, 0);
  await p.saveAi("dono", { kind: "video", provider: "gemini-gratis", key: KEY });
  const doc: any = await withFetch(() => out('{"resumo":"bom","pontos":[{"item":"Gancho","status":"ótimo","advice":"abra com a pergunta"}]}'), async () => analyzeVideo(ctx, await send()));
  assert.equal(doc.kind, "video");
  assert.deepEqual(doc.checks, [{ item: "Gancho", status: "conferir", advice: "abra com a pergunta" }]);
  assert.equal((await s.list("videos", "dono")).length, 0);
  await withFetch(() => ({ status: 429, body: {} }), async () => assert.rejects(async () => analyzeVideo(ctx, await send()), /429/));
});

test("Perfis: exige Instagram real; guarda só o que a Meta devolveu; sugestão não confirmada some", async () => {
  const s = await setup;
  const p = await import("../lib/providers");
  const d = await import("../lib/discovery");
  const { encrypt } = await import("../lib/instagram");
  assert.equal(d.cleanUsername("https://www.instagram.com/Ana.Souza_/?x=1"), "ana.souza_");
  assert.throws(() => d.cleanUsername("a){id}"), /@/);
  await assert.rejects(() => d.addProfile("dono", "ana"), /Conecte/);
  await s.insert("ig_connection", "dono", { status: "connected", demo: false, igId: "17", token: encrypt("tk") });
  await p.saveAi("dono", { kind: "text", provider: "gemini-gratis", key: KEY });
  const profile = { business_discovery: { username: "real", name: "Real", followers_count: 1000, media_count: 2, media: { data: [{ caption: "a", like_count: 40, comments_count: 10 }, { caption: "b", comments_count: 99 }] } } };
  const meta = (c: Call) => (c.url.host === "graph.facebook.com" ? (c.url.searchParams.get("fields")!.includes("username(real)") ? { body: profile } : { status: 400, body: { error: { message: "não existe", code: 110 } } }) : out('[{"username":"@real","reason":"mesmo nicho"},{"username":"inventado","reason":"x"}]'));
  const saved: any = await withFetch(meta, () => d.addProfile("dono", "@real"));
  assert.equal(saved.engagement, 0.05, "post com curtidas ocultas não entra como zero");
  assert.deepEqual(await withFetch(meta, () => d.suggestProfiles("dono")), { found: 1, tried: 2 });
  const rows = await s.list("ref_profiles", "dono");
  assert.deepEqual(rows.map((r) => r.username), ["real"]);
  await withFetch(meta, async () => assert.rejects(() => d.addProfile("dono", "inventado"), /não devolveu/));
});

test("Stories: formatos e quantidades sem IA; ajuste pede IA", async () => {
  await setup;
  const p = await import("../lib/providers");
  await p.saveAi("dono", { kind: "text", provider: "" });
  const { genStories, FORMATS, COUNTS } = await import("../lib/stories");
  const ctx: any = { persona: { answers: {} }, business: { voice: { cta: "Chame no direct" } } };
  for (const [format] of FORMATS)
    for (const count of COUNTS) {
      const r = await genStories(ctx, { goal: "avaliação", format, count });
      assert.equal(r.frames.length, count, `${format} ${count}`);
      assert.equal(r.frames.at(-1)!.text, "Chame no direct");
      assert.equal(/undefined/.test(JSON.stringify(r)), false);
    }
  await assert.rejects(() => genStories(ctx, { goal: "x", previous: [{ role: "a", text: "b" }], instruction: "curto" }), /IA ligada/);
});

test("32 roteiros prontos próprios, sem repetição", async () => {
  const { READY } = await import("../lib/readyScripts");
  assert.equal(READY.length, 32);
  assert.equal(new Set(READY.map((r) => r.title)).size, 32);
  assert.equal(new Set(READY.map((r) => r.hook)).size, 32);
  assert.deepEqual([...new Set(READY.map((r) => r.type))].sort(), ["emocional", "tecnico", "viral"]);
});

test("Carrossel em outro idioma sem IA avisa em vez de escrever em português", async () => {
  const { genCarousel } = await import("../lib/ai");
  const ctx: any = { persona: { answers: {} }, business: { voice: {} } };
  await assert.rejects(() => genCarousel(ctx, { theme: "sono", language: "en" }), /ligue uma IA/);
});
