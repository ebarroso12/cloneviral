import { route, bad } from "@/lib/api";
import { getStore } from "@/lib/store";
import type { Post } from "@/lib/metrics";

// Raio-X de um post seu: compara com a mediana do perfil e aponta o que explicou o resultado.
export const POST = route(async (user, req) => {
  const { postId } = await req.json();
  const s = getStore();
  const posts = (await s.list("posts", user.id)) as unknown as Post[];
  const p = posts.find((x) => x.id === postId);
  if (!p) bad("Post não encontrado.", 404);
  const med = (f: (x: Post) => number) => { const a = posts.map(f).sort((x, y) => x - y); return a[Math.floor(a.length / 2)] || 1; };
  const ratio = (v: number, m: number) => Math.round((v / m) * 10) / 10;
  const post = p!;
  const rows = [
    { k: "Alcance", v: post.reach, x: ratio(post.reach, med((x) => x.reach)) },
    { k: "Curtidas", v: post.likes, x: ratio(post.likes, med((x) => x.likes)) },
    { k: "Comentários", v: post.comments, x: ratio(post.comments, med((x) => x.comments)) },
    { k: "Salvamentos", v: post.saves, x: ratio(post.saves, med((x) => x.saves)) },
    { k: "Compartilhamentos", v: post.shares, x: ratio(post.shares, med((x) => x.shares)) },
  ];
  const best = [...rows].sort((a, b) => b.x - a.x)[0];
  const worst = [...rows].sort((a, b) => a.x - b.x)[0];
  const hook = (post.caption || "").split(/[.!?\n]/)[0].slice(0, 120);
  const notes = [
    `O ponto forte foi ${best.k.toLowerCase()}: ${best.x}x a mediana do seu perfil.`,
    `O ponto fraco foi ${worst.k.toLowerCase()}: ${worst.x}x a mediana.`,
    hook ? `Gancho usado: "${hook}".` : "O post não tem legenda, então não há gancho escrito para avaliar.",
    /comente|salve|link|compartilhe/i.test(post.caption || "") ? "Tem chamada para ação na legenda." : "Não tem chamada para ação clara na legenda.",
  ];
  return s.insert("xray", user.id, { postId, rows, notes });
});
