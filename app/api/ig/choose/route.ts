import { route, bad } from "@/lib/api";
import { getStore } from "@/lib/store";
import { decrypt, syncAccount, type IgAccount } from "@/lib/instagram";
import { saveConnection, OtherAccount } from "@/lib/connection";

export const maxDuration = 60;

export const POST = route(async (user, req) => {
  const { igId, confirmSwitch } = await req.json();
  const store = getStore();
  const [pending] = await store.list("ig_pending", user.id);
  if (!pending || Date.now() - Date.parse(pending.createdAt) > 15 * 60_000) bad("A escolha expirou. Clique em Conectar Instagram de novo.", 410);
  const account = (pending.accounts as IgAccount[]).find((a) => a.igId === igId);
  if (!account) bad("Conta não encontrada nessa autorização.", 404);
  try {
    await saveConnection(user.id, { token: decrypt(pending.token), expiresIn: pending.expiresIn, account: account!, confirmSwitch: confirmSwitch === true });
  } catch (e: any) {
    if (e instanceof OtherAccount) bad(e.message, 409);
    throw e;
  }
  await store.removeAllForUser("ig_pending", user.id);
  try {
    await syncAccount(user.id);
  } catch {
    // o erro fica registrado na conexão e aparece na tela
  }
  return { ok: true };
});
