import { route, bad } from "@/lib/api";
import { getStore } from "@/lib/store";
import { adsConnectionData } from "@/lib/ads";

// Anúncios Meta (somente leitura). Só a conta de demonstração tem total simulado; a leitura real exige ads_read (App Review).
export const POST = route(async (user, req) => {
  const { action } = await req.json();
  const s = getStore();
  const cur = (await s.list("ads_connection", user.id))[0];
  let data: Record<string, any> = { status: "disconnected", views: 0 };
  if (action === "connect") {
    const conn = (await s.list("ig_connection", user.id))[0] as any;
    const organic = (await s.list("posts", user.id)).reduce((a, p: any) => a + p.views, 0);
    try {
      data = adsConnectionData(conn, organic);
    } catch (e: any) {
      bad(e.message, 501);
    }
  }
  return cur ? s.update("ads_connection", cur.id, user.id, data) : s.insert("ads_connection", user.id, data);
});
