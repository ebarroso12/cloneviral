import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { authUrl, metaConfigured } from "@/lib/instagram";
import { getStore } from "@/lib/store";

export async function GET(req: Request) {
  const user = await getUser();
  const origin = process.env.APP_URL || new URL(req.url).origin;
  if (!user) return NextResponse.redirect(`${origin}/login`);
  if (!metaConfigured()) {
    // Modo demonstração: conecta a conta de exemplo (sem chamar a Meta).
    return NextResponse.redirect(`${origin}/conexoes?aviso=meta-nao-configurada`);
  }
  const state = crypto.randomBytes(16).toString("hex");
  (await cookies()).set("rv_oauth_state", state, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });
  void getStore;
  return NextResponse.redirect(authUrl(`${origin}/api/ig/callback`, state));
}
