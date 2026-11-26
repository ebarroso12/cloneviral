import { route } from "@/lib/api";
import { getStore } from "@/lib/store";
// Desconectar revoga o acesso guardado, mas NÃO apaga o histórico medido.
export const POST = route(async (user) => {
  const s = getStore();
  const cur = (await s.list("ig_connection", user.id))[0];
  if (cur) await s.update("ig_connection", cur.id, user.id, { status: "disconnected", token: null });
  return { ok: true };
});
