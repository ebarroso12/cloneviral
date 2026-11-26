import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { exchangeCode, findInstagramAccount, encrypt, syncAccount } from "@/lib/instagram";
import { getStore } from "@/lib/store";

export async function GET(req: Request) {
  const origin = process.env.APP_URL || new URL(req.url).origin;
  const url = new URL(req.url);
  const user = await getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);
  const jar = await cookies();
  if (!url.searchParams.get("code") || url.searchParams.get("state") !== jar.get("rv_oauth_state")?.value) return NextResponse.redirect(`${origin}/conexoes?erro=autorizacao`);
  jar.delete("rv_oauth_state");
  try {
    const { token, expiresIn } = await exchangeCode(url.searchParams.get("code")!, `${origin}/api/ig/callback`);
    const { igId, pageId } = await findInstagramAccount(token);
    const store = getStore();
    const data = { demo: false, token: encrypt(token), igId, pageId, status: "connected", authorizedUntil: new Date(Date.now() + expiresIn * 1000).toISOString(), measuringSince: new Date().toISOString().slice(0, 10) };
    const cur = (await store.list("ig_connection", user.id))[0];
    if (cur?.demo) { for (const c of ["posts", "snapshots", "audience"]) await store.removeAllForUser(c, user.id); }
    if (cur) await store.update("ig_connection", cur.id, user.id, data); else await store.insert("ig_connection", user.id, data, "conn");
    await syncAccount(user.id);
    return NextResponse.redirect(`${origin}/conexoes?ok=1`);
  } catch (e: any) {
    return NextResponse.redirect(`${origin}/conexoes?erro=${encodeURIComponent(e.message.slice(0, 120))}`);
  }
}
