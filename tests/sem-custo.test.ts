// Funções fechadas sem gasto: publicação de Reels, IA só gratuita por padrão, ciclo mensal,
// varredura com texto colado, análise antes de postar, exclusão de conta e textos sem repetição.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rv-free-"));
process.env.RV_DATA_DIR = dir;
process.env.RV_SECRET = "segredo-de-teste";
for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "RV_ALLOW_PAID_AI"]) delete process.env[k];

type Call = { url: URL; method: string; headers: Record<string, string>; body: any };
async function withFetch<T>(reply: (c: Call) => { status?: number; body: unknown }, fn: (calls: Call[]) => Promise<T>) {
  const real = globalThis.fetch;
  const calls: Call[] = [];
  globalThis.fetch = (async (input: any, init: any = {}) => {
    const c: Call = { url: new URL(String(input)), method: init.method ?? "GET", headers: Object.fromEntries(Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), String(v)])), body: init.body };
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

const meta = (over: { status?: string[]; failPublish?: boolean } = {}) => {
  const states = [...(over.status ?? ["IN_PROGRESS", "FINISHED"])];
  return (c: Call) => {
    const p = c.url.pathname;
    if (c.url.hostname === "rupload.facebook.com") return { body: { success: true } };
    if (p.endsWith("/media_publish")) return over.failPublish ? { status: 400, body: { error: { message: "limite de publicações" } } } : { body: { id: "midia-1" } };
    if (p.endsWith("/media") && c.method === "POST") return { body: { id: "cont-1", uri: "https://rupload.facebook.com/ig-api-upload/v27.0/cont-1" } };
    if (p.endsWith("/cont-1")) return { body: { status_code: states.length > 1 ? states.shift() : states[0] } };
    return { body: { access_token: "token-da-pagina" } };
  };
};

async function scenario(userId: string, over: Record<string, any> = {}) {
  const { getStore, scopedId } = await import("../lib/store");
  const { encrypt } = await import("../lib/instagram");
  const { uploadDir, videoPath } = await import("../lib/videos");
  const s = getStore();
  await s.insert("ig_connection", userId, { demo: false, status: "connected", token: encrypt("token-do-usuario"), igId: "ig9", pageId: "pg9" }, scopedId(userId, "conn"));
  const video = await s.insert("videos", userId, { name: "v.mp4", ext: ".mp4", size: 5, duration: 20 });
  fs.mkdirSync(uploadDir(userId), { recursive: true });
  fs.writeFileSync(videoPath(userId, video as any), "vídeo");
  const post = await s.insert("scheduled_posts", userId, { date: "2026-11-26", time: "10:00", caption: "olá", videoId: video.id, kind: "viral", status: "agendado", autoPublish: true, ...over });
  return { s, post };
}
const at = (time: string) => new Date(`2026-11-26T${time}:00`);

test("Reels: cria o contêiner, envia os bytes, espera FINISHED e publica uma vez", async () => {
  const { publishDue } = await import("../lib/publish");
  const { s, post } = await scenario("p1");
  await withFetch(meta(), async (calls) => {
    await publishDue(at("10:01"), { pollMs: 1 });
    const create = calls.find((c) => c.method === "POST" && c.url.pathname.endsWith("/ig9/media"))!;
    assert.equal(create.url.searchParams.get("media_type"), "REELS");
    assert.equal(create.url.searchParams.get("upload_type"), "resumable");
    assert.equal(create.url.searchParams.get("caption"), "olá");
    const up = calls.find((c) => c.url.hostname === "rupload.facebook.com")!;
    assert.equal(up.headers.authorization, "OAuth token-da-pagina");
    assert.equal(up.headers.offset, "0");
    assert.equal(up.headers.file_size, String(Buffer.byteLength("vídeo")));
    assert.equal(calls.filter((c) => c.url.pathname.endsWith("/media_publish")).length, 1);
    await publishDue(at("10:02"), { pollMs: 1 });
    assert.equal(calls.filter((c) => c.url.pathname.endsWith("/media_publish")).length, 1, "publicou de novo");
  });
  const done = await s.get("scheduled_posts", post.id);
  assert.equal(done!.status, "publicado");
  assert.equal(done!.mediaId, "midia-1");
});

test("Reels: duas rodadas simultâneas não publicam em dobro", async () => {
  const { publishDue } = await import("../lib/publish");
  await scenario("p2");
  await withFetch(meta(), async (calls) => {
    await Promise.all([publishDue(at("10:01"), { pollMs: 1 }), publishDue(at("10:01"), { pollMs: 1 })]);
    assert.equal(calls.filter((c) => c.url.pathname.endsWith("/media_publish")).length, 1);
  });
});

test("Reels: não publica antes da hora, sem a marcação, nem muito atrasado", async () => {
  const { publishDue } = await import("../lib/publish");
  const early = await scenario("p3", { time: "23:00" });
  const manual = await scenario("p4", { autoPublish: false });
  const late = await scenario("p5", { time: "01:00" });
  await withFetch(meta(), async (calls) => {
    await publishDue(at("10:00"), { pollMs: 1 });
    assert.equal(calls.filter((c) => c.url.pathname.endsWith("/media_publish")).length, 0);
  });
  assert.equal((await early.s.get("scheduled_posts", early.post.id))!.status, "agendado");
  assert.equal((await manual.s.get("scheduled_posts", manual.post.id))!.status, "agendado");
  assert.equal((await late.s.get("scheduled_posts", late.post.id))!.status, "atrasado");
});

test("Reels: falha fica registrada e não é repetida sozinha", async () => {
  const { publishDue } = await import("../lib/publish");
  const a = await scenario("p6");
  await withFetch(meta({ failPublish: true }), () => publishDue(at("10:01"), { pollMs: 1 }));
  const failed = await a.s.get("scheduled_posts", a.post.id);
  assert.equal(failed!.status, "falhou");
  assert.match(failed!.error, /limite de publicações/);
  await withFetch(meta(), async (calls) => {
    await publishDue(at("10:03"), { pollMs: 1 });
    assert.equal(calls.length, 0);
  });
  const b = await scenario("p7");
  await withFetch(meta({ status: ["ERROR"] }), () => publishDue(at("10:01"), { pollMs: 1 }));
  assert.equal((await b.s.get("scheduled_posts", b.post.id))!.status, "falhou");
});

test("BUG-022: chave paga no ambiente não gera cobrança sem autorização expressa", async () => {
  const { aiProvider } = await import("../lib/ai");
  assert.equal(aiProvider({ ANTHROPIC_API_KEY: "k" }), null);
  assert.equal(aiProvider({ ANTHROPIC_API_KEY: "k", RV_ALLOW_PAID_AI: "1" }), "anthropic");
  assert.equal(aiProvider({ GEMINI_API_KEY: "g", ANTHROPIC_API_KEY: "k" }), "gemini");
  assert.equal(aiProvider({}), null);
});

test("IA gratuita (Gemini): usa quando há chave e cai no modelo local quando falha", async () => {
  const { llmJson } = await import("../lib/ai");
  process.env.GEMINI_API_KEY = "g";
  try {
    const ok = await withFetch(() => ({ body: { candidates: [{ content: { parts: [{ text: '```json\n[{"a":1}]\n```' }] } }] } }), async (calls) => {
      const r = await llmJson<{ a: number }[]>("s", "u");
      assert.equal(calls[0].url.hostname, "generativelanguage.googleapis.com");
      assert.equal(calls[0].headers["x-goog-api-key"], "g");
      assert.equal(calls[0].url.search.includes("g"), false);
      return r;
    });
    assert.deepEqual(ok, [{ a: 1 }]);
    assert.equal(await withFetch(() => ({ status: 429, body: {} }), () => llmJson("s", "u")), null);
  } finally {
    delete process.env.GEMINI_API_KEY;
  }
});

test("Depois do teste de 30 dias, o dono recebe 100 créditos por mês, uma vez por mês", async () => {
  const { ensureCycle, grant, balance } = await import("../lib/credits");
  const { getStore } = await import("../lib/store");
  await getStore().insert("users", "d1", { email: "d@x.test", plan: "trial", trialEndsAt: "2026-12-26T00:00:00Z" }, "d1");
  await grant("d1", 30, "Trial");
  await ensureCycle("d1", new Date("2026-12-01T12:00:00Z"));
  assert.equal(await balance("d1"), 30);
  await ensureCycle("d1", new Date("2027-01-02T12:00:00Z"));
  await Promise.all([ensureCycle("d1", new Date("2027-01-20T12:00:00Z")), ensureCycle("d1", new Date("2027-01-21T12:00:00Z"))]);
  assert.equal(await balance("d1"), 130);
  await ensureCycle("d1", new Date("2027-02-01T12:00:00Z"));
  assert.equal(await balance("d1"), 230);
  assert.equal((await getStore().get("users", "d1"))!.plan, "start");
});

test("Varredura com texto colado extrai o padrão de cada bloco", async () => {
  const { patternsFromText } = await import("../lib/ai");
  const p = patternsFromText("Você dorme mal?\nSalve este post.\n\n3 erros na agenda.\n\n   \n\nPare de adiar. Comente EU QUERO.", 5);
  assert.deepEqual(p.map((x) => x.hookType), ["pergunta", "numero", "ordem"]);
  assert.deepEqual(p.map((x) => x.hasCta), [true, false, true]);
  assert.equal(patternsFromText("a\n\nb\n\nc", 2).length, 2);
  assert.deepEqual(patternsFromText("  ", 3), []);
});

test("Análise antes de postar aponta o que medir sem adivinhar", async () => {
  const { reviewScript, reviewVideo } = await import("../lib/review");
  const weak = reviewScript("Então hoje eu queria falar um pouco com vocês sobre uma coisa que eu acho muito importante para todo mundo que acompanha. " + "palavra ".repeat(200));
  const by = Object.fromEntries(weak.map((c) => [c.item, c.status]));
  assert.equal(by["Gancho"], "ajustar");
  assert.equal(by["Duração falada"], "ajustar");
  assert.equal(by["Convite"], "ajustar");
  const good = reviewScript("Você dorme mal? Faça isto hoje: apague as telas uma hora antes e anote como acordou. Salve este vídeo.");
  assert.ok(good.every((c) => c.status === "bom"), JSON.stringify(good));
  const v = reviewVideo({ duration: 0, width: 1920, height: 1080, size: 5e6, ext: ".mp4" });
  const vb = Object.fromEntries(v.map((c) => [c.item, c.status]));
  assert.equal(vb["Formato"], "ajustar");
  assert.equal(vb["Duração"], "conferir");
  assert.ok(reviewVideo({ duration: 30, width: 1080, height: 1920, size: 5e6, ext: ".mp4" }).every((c) => c.status === "bom"));
});

test("Excluir a conta exige a senha e apaga tudo só daquela conta", async () => {
  const { deleteAccount } = await import("../lib/account");
  const { getStore } = await import("../lib/store");
  const { hashPassword } = await import("../lib/password");
  const { uploadDir } = await import("../lib/videos");
  const s = getStore();
  for (const u of ["x1", "x2"]) {
    await s.insert("users", u, { email: `${u}@x.test`, password: hashPassword("senha-correta") }, u);
    await s.insert("scripts", u, { title: u });
    await s.insert("ledger", u, { amount: 1 });
    fs.mkdirSync(uploadDir(u), { recursive: true });
    fs.writeFileSync(path.join(uploadDir(u), "a.mp4"), "x");
  }
  await assert.rejects(() => deleteAccount("x1", "errada"), /senha/i);
  assert.equal((await s.list("scripts", "x1")).length, 1);
  await deleteAccount("x1", "senha-correta");
  for (const c of ["users", "scripts", "ledger"]) assert.equal((await s.list(c, "x1")).length, 0, c);
  assert.equal(fs.existsSync(uploadDir("x1")), false);
  assert.equal((await s.list("scripts", "x2")).length, 1);
  assert.equal(fs.existsSync(uploadDir("x2")), true);
});

test("Textos locais: sem frases repetidas entre slides e persona detalhada", async () => {
  const { genCarousel, genPersonaDoc } = await import("../lib/ai");
  const ctx: any = {
    persona: { answers: { cliente: "dentistas", dor: "agenda vazia", desejo: "agenda cheia", objecao: "é caro", decisao: "ver casos reais" } },
    business: { name: "Ana", brand: "Clínica Ana", offerMain: "mentoria", differentiator: "plano em três passos", method: "Clareza, Constância e Convite", focus: "agendar", proof: "40 alunas", voice: { style: "direto", reference: "", never: "", always: "exemplos", cta: "Chame no direct" } },
  };
  for (const roles of [undefined, ["capa", "cena", "cena", "cena", "aprendizado", "aprendizado", "convite"], ["capa", "item", "item", "item", "item", "convite"], ["capa", "dor", "solução", "o que inclui", "para quem é", "prova", "garantia", "convite"]]) {
    const slides = await genCarousel(ctx, { theme: "agenda cheia", model: roles ? ({ roles, title: "Modelo" } as any) : null });
    const texts = slides.map((x) => x.text);
    const titles = slides.map((x) => x.title);
    assert.equal(new Set(texts).size, texts.length, "texto repetido: " + texts.join(" | "));
    assert.equal(new Set(titles).size, titles.length, "título repetido: " + titles.join(" | "));
  }
  const doc = genPersonaDoc(ctx.persona.answers, ctx.business);
  assert.ok((doc.match(/^## /gm) ?? []).length >= 8, "seções");
  assert.ok(doc.length >= 3000, `só ${doc.length} caracteres`);
  assert.match(doc, /40 alunas/);
  assert.equal(/undefined|null/.test(doc), false);
});

test("Cada texto diz se veio da IA ou do modelo local", async () => {
  const { genScripts } = await import("../lib/ai");
  const ctx: any = { persona: { answers: {} }, business: { voice: {} } };
  const [local] = await genScripts(ctx, { type: "viral", dest: "reel", n: 1 });
  assert.equal(local.generator, "modelo");
  process.env.GEMINI_API_KEY = "g";
  try {
    const [ia] = await withFetch(() => ({ body: { candidates: [{ content: { parts: [{ text: '[{"title":"t","hook":"h","body":"b","cta":"c","seconds":20}]' }] } }] } }), () => genScripts(ctx, { type: "viral", dest: "reel", n: 1 }));
    assert.equal(ia.generator, "ia");
  } finally {
    delete process.env.GEMINI_API_KEY;
  }
});

test("BUG-023: conta recém-criada, sem persona nem negócio, consegue criar tudo", async () => {
  const ai = await import("../lib/ai");
  const { loadCtx } = await import("../lib/api");
  const ctx = await loadCtx("recem-criada");
  assert.equal((await ai.genScripts(ctx, { type: "tecnico", dest: "reel", n: 3 })).length, 3);
  assert.ok((await ai.genCarousel(ctx, { theme: "sono" })).length > 3);
  assert.equal((await ai.genSeries(ctx, { theme: "sono", chapters: 3 })).length, 3);
  assert.ok((await ai.genIsca(ctx, { keyword: "sono" })).sections.length > 1);
  assert.equal(/undefined/.test(JSON.stringify([ai.genPersonaDoc({}, ctx.business), ai.newsAngle(ctx, "t", "r")])), false);
});
