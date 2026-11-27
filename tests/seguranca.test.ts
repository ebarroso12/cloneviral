// Reproduz os defeitos de isolamento, segredos e anúncios achados na auditoria.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rv-test-"));
process.env.RV_DATA_DIR = dir;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const mods = {
  store: () => import("../lib/store"),
  seed: () => import("../lib/seed"),
  config: () => import("../lib/config"),
  insta: () => import("../lib/instagram"),
};

test("BUG-001: um usuário não sobrescreve o documento de outro informando o id", async () => {
  const store = await mods.store();
  const s = store.getStore();
  const a = await s.insert("ideas", "ana", { text: "da Ana" });
  await assert.rejects(() => s.insert("ideas", "bia", { id: a.id, text: "invasão" }));
  assert.equal((await s.get("ideas", a.id))!.text, "da Ana");
});

test("BUG-001: o corpo enviado pelo navegador não define id, dono nem datas", async () => {
  const store = await mods.store();
  assert.deepEqual(store.clientData({ id: "x", userId: "y", createdAt: "1", updatedAt: "2", text: "ok" }), { text: "ok" });
});

test("BUG-002: dados de uma conta não apagam os de outra", async () => {
  const store = await mods.store(); const seed = await mods.seed();
  const s = store.getStore();
  await seed.seedAccount("u1");
  await seed.seedAccount("u2");
  for (const u of ["u1", "u2"]) {
    assert.equal((await s.list("ig_connection", u)).length, 1, `conexão de ${u}`);
    assert.equal((await s.list("audience", u)).length, 1, `audiência de ${u}`);
    assert.equal((await s.list("snapshots", u)).length, 40, `snapshots de ${u}`);
    assert.equal((await s.list("posts", u)).length, 2000, `posts de ${u}`);
  }
});

test("BUG-003: banco local corrompido não é trocado por um banco vazio", async () => {
  const store = await mods.store();
  const file = path.join(dir, "corrompido.json");
  fs.writeFileSync(file, "{ isto não é json");
  const s = new store.FileStore(file);
  await assert.rejects(() => s.list("ideas", "ana"), /corrompido/i);
  assert.equal(fs.readFileSync(file, "utf8"), "{ isto não é json");
});

test("BUG-004: conta de demonstração fica desligada em produção e com banco real", async () => {
  const config = await mods.config();
  assert.equal(config.demoEnabled({ NODE_ENV: "development" }), true);
  assert.equal(config.demoEnabled({ NODE_ENV: "production" }), false);
  assert.equal(config.demoEnabled({ NODE_ENV: "development", SUPABASE_URL: "u", SUPABASE_SERVICE_ROLE_KEY: "k" }), false);
  assert.equal(config.demoEnabled({ NODE_ENV: "production", RV_DEMO: "1" }), true);
});

test("BUG-005: em produção só o primeiro dono se cadastra", async () => {
  const config = await mods.config();
  assert.equal(config.signupAllowed({ NODE_ENV: "production" }, false), true);
  assert.equal(config.signupAllowed({ NODE_ENV: "production" }, true), false);
  assert.equal(config.signupAllowed({ NODE_ENV: "production", RV_ALLOW_SIGNUP: "1" }, true), true);
  assert.equal(config.signupAllowed({ NODE_ENV: "development" }, true), true);
});

test("BUG-006: sem RV_SECRET o token do Instagram não é cifrado com chave pública em produção", async () => {
  const insta = await mods.insta();
  const env = process.env as Record<string, string | undefined>;
  const before = env.NODE_ENV;
  delete env.RV_SECRET;
  env.NODE_ENV = "production";
  try {
    assert.throws(() => insta.encrypt("token"), /RV_SECRET/);
  } finally {
    env.NODE_ENV = before;
  }
  env.RV_SECRET = "um-segredo-de-teste-bem-longo";
  assert.equal(insta.decrypt(insta.encrypt("token")), "token");
});

test("BUG-009: conta real nunca recebe visualizações de anúncio inventadas", async () => {
  const ads = await import("../lib/ads");
  assert.throws(() => ads.adsConnectionData({ demo: false }, 1000), /só da demonstração/i);
  assert.throws(() => ads.adsConnectionData(undefined, 1000), /só da demonstração/i);
  assert.deepEqual(ads.adsConnectionData({ demo: true }, 1000), { status: "connected", views: 180, demo: true });
  assert.equal(ads.adViewsFor({ demo: false }, { status: "connected", views: 180, demo: true }), null);
  assert.equal(ads.adViewsFor({ demo: true }, { status: "connected", views: 180, demo: true }), 180);
});

test("BUG-010: conta nova não herda a persona de outra conta", async () => {
  const { seedAccount } = await mods.seed();
  const { loadCtx } = await import("../lib/api");
  await seedAccount("dona");
  const ctx = await loadCtx("novata");
  assert.deepEqual(ctx.persona.answers, {});
});

test("BUG-011: o cadastro de vídeo não permite ler arquivo fora da pasta de envios", async () => {
  const { videoPath } = await import("../lib/videos");
  const { WRITABLE } = await import("../lib/collections");
  assert.equal(WRITABLE.has("videos"), false);
  assert.throws(() => videoPath("u1", { id: "abc", ext: "/../../../../.env.local" }), /inválido/i);
  assert.throws(() => videoPath("u1", { id: "../../x", ext: ".mp4" }), /inválido/i);
  assert.equal(videoPath("u1", { id: "abc-1", ext: ".mp4" }), path.join(dir, "uploads", "u1", "abc-1.mp4"));
});

test("BUG-012: regenerar um roteiro substitui, sem criar cópia", async () => {
  const { saveScripts } = await import("../lib/scripts");
  const s = (await mods.store()).getStore();
  const base = { type: "viral", dest: "reel", seconds: 30, hook: "g", body: "b", cta: "c" } as const;
  const [first] = await saveScripts("r1", [{ ...base, title: "um" }]);
  const [again] = await saveScripts("r1", [{ ...base, title: "dois" }], first.id);
  assert.equal(again.id, first.id);
  assert.deepEqual((await s.list("scripts", "r1")).map((x) => x.title), ["dois"]);
  await assert.rejects(() => saveScripts("outra", [{ ...base, title: "x" }], first.id), /não encontrado/i);
});

test("BUG-013: o token do Instagram nunca sai para o navegador", async () => {
  const { publicDoc } = await mods.store();
  assert.deepEqual(publicDoc({ id: "1", token: "segredo", igUsername: "a" } as any), { id: "1", igUsername: "a" });
});

test("BUG-014: cores da identidade visual não injetam marcação no slide", async () => {
  const { slideSvg } = await import("../lib/slide");
  const evil = '#000"><script>alert(1)</script>';
  const svg = slideSvg({ role: "capa", title: "t", text: "" }, 0, 1, { bg: evil, fg: evil, accent: evil, muted: evil, font: evil });
  assert.equal(svg.includes("<script"), false);
});

test("BUG-020: na Vercel o app não finge gravar em disco descartável", async () => {
  const { storageProblem } = await import("../lib/config");
  assert.match(storageProblem({ VERCEL: "1" })!, /Supabase/);
  assert.equal(storageProblem({ VERCEL: "1", SUPABASE_URL: "u", SUPABASE_SERVICE_ROLE_KEY: "k" }), null);
  assert.equal(storageProblem({}), null);
});
