// Funções da matriz que faltavam: foto na capa, raio-x do perfil e ideia que vira roteiro.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.RV_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "rv-func-"));
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.ANTHROPIC_API_KEY;

const look = { bg: "#000", fg: "#fff", accent: "#f00", muted: "#999", font: "serif" };
const jpg = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";

test("Foto própria aparece só na capa do carrossel", async () => {
  const { slideSvg } = await import("../lib/slide");
  const s = { role: "capa", title: "t", text: "x" };
  assert.ok(slideSvg(s, 0, 3, look, "", jpg).includes(`href="${jpg}"`));
  assert.equal(slideSvg(s, 1, 3, look, "", jpg).includes("<image"), false);
});

test("Foto da capa aceita apenas PNG ou JPEG embutidos e de tamanho limitado", async () => {
  const { validCover } = await import("../lib/slide");
  assert.equal(validCover(jpg), jpg);
  assert.equal(validCover("https://exemplo.test/rastreio.png"), null);
  assert.equal(validCover("data:image/svg+xml;base64,PHN2Zz4="), null);
  assert.equal(validCover('data:image/png;base64,AAAA" onload="x'), null);
  assert.equal(validCover("data:image/png;base64," + "A".repeat(2_000_001)), null);
});

test("Raio-X do perfil avalia seis partes com o que foi lido, sem inventar", async () => {
  const { profileXray } = await import("../lib/xray");
  const parts = profileXray(
    { name: "Ana", igUsername: "ana_1234567", bio: "oi", link: "", picture: "" },
    { highlights: "" },
    { brand: "Clínica Ana", voice: { cta: "Agende pelo link" } } as any,
  );
  assert.deepEqual(parts.map((p) => p.part), ["Foto", "Nome", "Usuário", "Bio", "Link", "Destaques"]);
  const by = Object.fromEntries(parts.map((p) => [p.part, p]));
  assert.equal(by["Foto"].status, "conferir");
  assert.equal(by["Link"].status, "ajustar");
  assert.equal(by["Bio"].status, "ajustar");
  assert.match(by["Usuário"].advice, /número/i);
  const good = profileXray(
    { name: "Ana Souza | Dentista", igUsername: "draanasouza", bio: "Dentista em Campinas. Sorriso sem medo, com plano claro. Agende pelo link", link: "exemplo.test", picture: "https://x/y.jpg" },
    { highlights: "Comece aqui, Resultados, Dúvidas" },
    { brand: "Clínica Ana", voice: { cta: "Agende pelo link" } } as any,
  );
  assert.ok(good.filter((p) => p.status === "bom").length >= 4);
});

test("Ideia vira roteiro: cobra 1, grava o roteiro e move a ideia", async () => {
  const { getStore } = await import("../lib/store");
  const { grant, balance } = await import("../lib/credits");
  const { ideaToScript } = await import("../lib/ideas");
  const s = getStore();
  await grant("i1", 2, "teste");
  const idea = await s.insert("ideas", "i1", { text: "mitos sobre sono", status: "ideia" });
  const script = await ideaToScript("i1", idea.id);
  assert.equal(await balance("i1"), 1);
  assert.match(`${script.title} ${script.body}`, /mitos sobre sono/i);
  const after = await s.get("ideas", idea.id);
  assert.equal(after!.status, "roteirizando");
  assert.equal(after!.scriptId, script.id);
  await assert.rejects(() => ideaToScript("outra", idea.id), /não encontrada/i);
});

test("Logo da identidade visual entra nos slides; endereço externo é ignorado", async () => {
  const { slideSvg } = await import("../lib/slide");
  const s = { role: "capa", title: "t", text: "" };
  const png = "data:image/png;base64,iVBORw0KGgo=";
  for (const i of [0, 1]) assert.ok(slideSvg(s, i, 3, { ...look, logo: png }).includes(`href="${png}"`));
  assert.equal(slideSvg(s, 0, 3, { ...look, logo: "https://exemplo.test/x.png" }).includes("<image"), false);
});
