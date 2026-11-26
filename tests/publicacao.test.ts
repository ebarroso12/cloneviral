// Preparação para o endereço público: cadastro protegido, banco sem chave de administrador e coleta que avança.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.RV_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "rv-pub-"));
process.env.RV_SECRET = "segredo-de-teste";
for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY", "RV_DB_KEY", "RV_SIGNUP_CODE"]) delete process.env[k];

type Call = { url: URL; method: string; headers: Record<string, string> };
async function withFetch<T>(reply: (c: Call) => { status?: number; body: unknown }, fn: (calls: Call[]) => Promise<T>) {
  const real = globalThis.fetch;
  const calls: Call[] = [];
  globalThis.fetch = (async (input: any, init: any = {}) => {
    const c = { url: new URL(String(input)), method: init.method ?? "GET", headers: Object.fromEntries(Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), String(v)])) };
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

test("PUB-1: com código de cadastro configurado, o endereço público não aceita um estranho primeiro", async () => {
  const { signupAllowed } = await import("../lib/config");
  const env = { NODE_ENV: "production", RV_SIGNUP_CODE: "abc-123" };
  assert.equal(signupAllowed(env, false), false);
  assert.equal(signupAllowed(env, false, "errado"), false);
  assert.equal(signupAllowed(env, false, "abc-123"), true);
  assert.equal(signupAllowed(env, true, "abc-123"), false);
});

test("PUB-1: na Vercel sem código ninguém se cadastra", async () => {
  const { signupAllowed } = await import("../lib/config");
  assert.equal(signupAllowed({ NODE_ENV: "production", VERCEL: "1" }, false), false);
  assert.equal(signupAllowed({ NODE_ENV: "production" }, false), true);
});

test("PUB-2: o banco aceita chave pública com segredo próprio, sem chave de administrador", async () => {
  const { supabaseConfig, storageProblem } = await import("../lib/config");
  const env = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: "anon", RV_DB_KEY: "s".repeat(40) };
  assert.deepEqual(supabaseConfig(env), { url: env.SUPABASE_URL, key: "anon", dbKey: env.RV_DB_KEY });
  assert.equal(supabaseConfig({ SUPABASE_URL: "u", SUPABASE_ANON_KEY: "anon" }), null);
  assert.deepEqual(supabaseConfig({ SUPABASE_URL: "u", SUPABASE_SERVICE_ROLE_KEY: "adm" }), { url: "u", key: "adm", dbKey: undefined });
  assert.equal(storageProblem({ VERCEL: "1", ...env }), null);
});

test("PUB-2: o segredo vai em cabeçalho em toda chamada, nunca no endereço", async () => {
  const { SupabaseStore } = await import("../lib/store");
  const s = new SupabaseStore("https://x.supabase.co", "anon", "segredo-do-banco");
  await withFetch((c) => ({ body: c.method === "GET" ? [] : [{ id: "i", user_id: "u", data: {}, created_at: "a", updated_at: "a" }] }), async (calls) => {
    await s.list("ideas", "u");
    await s.insert("ideas", "u", { text: "x" });
    await s.remove("ideas", "i", "u");
    await s.removeAllForUser("ideas", "u");
    assert.ok(calls.length >= 5);
    for (const c of calls) {
      assert.equal(c.headers["x-rv-key"], "segredo-do-banco");
      assert.equal(c.url.href.includes("segredo-do-banco"), false);
    }
  });
});

test("PUB-2: falha ao apagar no banco aparece, não finge que apagou", async () => {
  const { SupabaseStore } = await import("../lib/store");
  const s = new SupabaseStore("https://x.supabase.co", "anon", "k");
  await withFetch(() => ({ status: 401, body: {} }), async () => {
    await assert.rejects(() => s.removeAllForUser("ideas", "u"), /401/);
    await assert.rejects(() => s.remove("ideas", "i", "u"), /401/);
  });
});

test("PUB-3: a migração só libera a tabela para quem traz o segredo", () => {
  const sql = fs.readFileSync("supabase/migrations/0002_acesso_por_segredo.sql", "utf8");
  assert.match(sql, /x-rv-key/);
  assert.match(sql, /sha256/);
  assert.match(sql, /using \(private\.rv_allowed\(\)\)\s+with check \(private\.rv_allowed\(\)\)/);
  assert.equal(/using \(true\)/i.test(sql), false);
});

test("PUB-4: coleta não regrava post que não mudou (avança dentro do limite de tempo)", async () => {
  const { encrypt, syncAccount } = await import("../lib/instagram");
  const { getStore, scopedId } = await import("../lib/store");
  const s = getStore();
  await s.insert("ig_connection", "p1", { demo: false, status: "connected", token: encrypt("t"), igId: "i" }, scopedId("p1", "conn"));
  const reply = (c: Call) => {
    const p = c.url.pathname;
    if (p.endsWith("/media")) return { body: { data: [{ id: "m1", media_type: "IMAGE", timestamp: "2020-01-01T00:00:00Z", like_count: 3 }] } };
    if (p.endsWith("/insights")) return { body: { data: [{ name: "reach", values: [{ value: 5 }] }] } };
    return { body: { username: "u", followers_count: 1 } };
  };
  await withFetch(reply, () => syncAccount("p1"));
  const before = (await s.list("posts", "p1"))[0].updatedAt;
  await new Promise((r) => setTimeout(r, 20));
  await withFetch(reply, () => syncAccount("p1"));
  assert.equal((await s.list("posts", "p1"))[0].updatedAt, before);
});

test("PUB-5: o pacote de publicação leva só o resumo do segredo ao banco e não troca chaves já geradas", async () => {
  const { preparar } = await import("../scripts/preparar-publicacao.mjs");
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "rv-pacote-"));
  assert.equal(preparar(process.cwd(), out).criado, true);
  const env = fs.readFileSync(path.join(out, "2-vercel.env"), "utf8");
  const sql = fs.readFileSync(path.join(out, "1-supabase.sql"), "utf8");
  const val = (k: string) => env.match(new RegExp(`^${k}=(.*)$`, "m"))![1];
  const { createHash } = await import("node:crypto");
  assert.ok(sql.includes(createHash("sha256").update(val("RV_DB_KEY")).digest("hex")));
  for (const k of ["RV_DB_KEY", "RV_SECRET", "RV_SIGNUP_CODE", "CRON_SECRET"]) {
    assert.ok(val(k).length >= 16, k);
    assert.equal(sql.includes(val(k)), false, k);
  }
  assert.match(sql, /create table if not exists app_docs/);
  assert.match(sql, /app_docs_com_segredo/);
  assert.equal(preparar(process.cwd(), out).criado, false);
  assert.equal(fs.readFileSync(path.join(out, "2-vercel.env"), "utf8"), env);
  assert.match(fs.readFileSync(".gitignore", "utf8"), /^publicacao\/$/m);
});
