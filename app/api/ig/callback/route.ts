import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { exchangeCode, listInstagramAccounts, missingPermissions, encrypt, syncAccount, READ_PERMISSIONS } from "@/lib/instagram";
import { saveConnection } from "@/lib/connection";
import { getStore, scopedId } from "@/lib/store";

export const maxDuration = 60;

export async function GET(req: Request) {
  const origin = process.env.APP_URL || new URL(req.url).origin;
  const url = new URL(req.url);
  const back = (q: string) => NextResponse.redirect(`${origin}/conexoes?${q}`);
  const user = await getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);
  const jar = await cookies();
  if (!url.searchParams.get("code") || url.searchParams.get("state") !== jar.get("rv_oauth_state")?.value) return back("erro=autorizacao");
  jar.delete("rv_oauth_state");
  try {
    const { token, expiresIn } = await exchangeCode(url.searchParams.get("code")!, `${origin}/api/ig/callback`);
    const missing = await missingPermissions(token);
    const essential = missing.filter((p) => READ_PERMISSIONS.includes(p));
    if (essential.length) throw new Error(`Faltou liberar: ${essential.join(", ")}.`);
    const accounts = await listInstagramAccounts(token);
    if (!accounts.length) throw new Error("Nenhuma conta profissional do Instagram ligada a uma Página do Facebook foi encontrada.");
    const store = getStore();
    const [cur] = await store.list("ig_connection", user.id);
    // mais de uma opção, ou conta diferente da atual: quem decide é o dono
    if (accounts.length > 1 || (cur && !cur.demo && cur.igId && cur.igId !== accounts[0].igId)) {
      await store.removeAllForUser("ig_pending", user.id);
      await store.insert("ig_pending", user.id, { token: encrypt(token), expiresIn, accounts }, scopedId(user.id, "pending"));
      return back("escolher=1");
    }
    await saveConnection(user.id, { token, expiresIn, account: accounts[0] });
    try {
      await syncAccount(user.id);
    } catch {
      return back("ok=1"); // conectado; o erro da coleta fica registrado e aparece na tela
    }
    return back("ok=1");
  } catch (e: any) {
    return back(`erro=${encodeURIComponent(String(e.message).slice(0, 160))}`);
  }
}
