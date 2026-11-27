import { route, loadCtx, bad } from "@/lib/api";
import { getStore } from "@/lib/store";
import { profileXray } from "@/lib/xray";

export const POST = route(async (user, req) => {
  const b = await req.json();
  const s = getStore();
  const [conn] = (await s.list("ig_connection", user.id)) as any[];
  if (!conn || conn.status !== "connected") bad("Conecte o Instagram em Conexões para eu ler o perfil.");
  const ctx = await loadCtx(user.id);
  const parts = profileXray(conn, { highlights: String(b.highlights ?? "").slice(0, 300) }, ctx.business);
  return s.insert("xray", user.id, { kind: "perfil", parts });
});
