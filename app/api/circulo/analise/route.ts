import { route, bad } from "@/lib/api";
import { getStore } from "@/lib/store";
import { withCharge, COSTS } from "@/lib/credits";
import { computeMetrics, type Post, type Snap, type Audience } from "@/lib/metrics";
import { analyzeTop } from "@/lib/ai";

// Análise do seu perfil (2 créditos): números reais do que está medido + o que ajustar.
export const POST = route(async (user) => {
  const s = getStore();
  const [posts, snaps, aud] = await Promise.all([s.list("posts", user.id), s.list("snapshots", user.id), s.list("audience", user.id)]);
  if (posts.length < 3 || !snaps.length) bad("Seu perfil ainda não tem dados medidos. Conecte o Instagram em Conexões.");
  const m: any = computeMetrics(posts as unknown as Post[], snaps as unknown as Snap[], (aud[0] as unknown as Audience) ?? null, "30d");
  return withCharge(user.id, COSTS.analisePerfil, "Análise do seu perfil", async () => {
  const patterns = analyzeTop(posts as unknown as Post[], 5);
  const todo = (m.authenticity?.tips ?? []).map((t: any) => `${t.title}: ${t.text}`);
  const doc = { summary: { followers: m.profile?.followers ?? 0, engagement: m.engagement?.real ?? null, authenticity: m.authenticity?.score ?? null }, patterns, todo };
  return s.insert("analyses", user.id, doc);
  });
});
