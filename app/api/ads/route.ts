import { route } from "@/lib/api";
import { getStore } from "@/lib/store";
// Anúncios Meta (somente leitura). Em demonstração simula um total; com Meta real, a leitura exige o escopo ads_read (App Review).
export const POST = route(async (user, req) => {
  const { action } = await req.json();
  const s = getStore();
  const cur = (await s.list("ads_connection", user.id))[0];
  const posts = await s.list("posts", user.id);
  const organic = posts.reduce((a, p: any) => a + p.views, 0);
  const data = action === "connect" ? { status: "connected", views: Math.round(organic * 0.18), demo: true } : { status: "disconnected", views: 0 };
  return cur ? s.update("ads_connection", cur.id, user.id, data) : s.insert("ads_connection", user.id, data);
});
