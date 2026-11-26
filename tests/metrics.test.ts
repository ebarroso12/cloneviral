import test from "node:test";
import assert from "node:assert/strict";
import { computeMetrics, type Post, type Snap } from "../lib/metrics";
import { COSTS } from "../lib/credits";
import { fmtCompact, fmtPct } from "../lib/format";

// Fixture que reproduz os totais observados na tela original (2010 posts, 10.993 seguidores).
const N = 2010;
const posts: Post[] = Array.from({ length: N }, (_, i) => ({
  id: "p" + i, type: i % 5 === 0 ? "VIDEO" : "IMAGE", publishedAt: "2026-01-01T00:00:00Z", caption: "", permalink: "",
  views: 2_100_000 / N, reach: 815_700 / N, likes: 159_100 / N, comments: 8_800 / N, saves: 2_900 / N, shares: 5_700 / N,
}));
const snaps: Snap[] = Array.from({ length: 10 }, (_, i) => ({ date: `2026-11-${String(17 + i).padStart(2, "0")}`, followers: 10966 + i * 3, following: 4679, mediaCount: 2010, reach: 300 + i }));
snaps[9].followers = 10993;

test("engajamento real = interações ÷ alcance", () => {
  const m = computeMetrics(posts, snaps, null, "30d");
  assert.ok(Math.abs(m.engagement.real - 21.63) < 0.05, String(m.engagement.real));
});
test("sobre seguidores ≈ 0,8% e alcance sobre seguidores ≈ 0,04", () => {
  const m = computeMetrics(posts, snaps, null, "30d");
  assert.equal(fmtPct(m.engagement.onFollowers, 1), "0,8%");
  assert.equal(m.engagement.reachOnFollowers.toFixed(2), "0.04");
});
test("nota de autenticidade bate com a observada (27/100) e alcance vem primeiro", () => {
  const m = computeMetrics(posts, snaps, null, "30d");
  assert.equal(m.authenticity.score, 27);
  assert.equal(m.authenticity.tips[0].key, "alcance");
  assert.ok(m.authenticity.tips.every((t, i, a) => i === 0 || a[i - 1].points >= t.points));
});
test("faixa saudável: 21,63% está acima de 3% a 6%", () => {
  assert.equal(computeMetrics(posts, snaps, null, "30d").engagement.bandStatus, "acima");
});
test("crescimento por período", () => {
  assert.equal(computeMetrics(posts, snaps, null, "hoje").growth.delta, 10993 - snaps[8].followers!);
  assert.equal(computeMetrics(posts, snaps, null, "30d").growth.delta, 10993 - 10966);
  assert.equal(computeMetrics(posts, snaps, null, "7d").growth.series.length, 8);
});
test("custos de crédito iguais ao original", () => {
  assert.equal(COSTS.serie(7), 9);
  assert.equal(COSTS.varredura(5), 8);
  assert.equal(COSTS.varredura(10), 14);
});
test("formatação pt-BR", () => {
  assert.equal(fmtCompact(2_100_000), "2,1M");
  assert.equal(fmtCompact(815_700), "815,7 mil");
  assert.equal(fmtCompact(725), "725");
});
