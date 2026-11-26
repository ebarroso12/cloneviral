import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { authUrl } from "@/lib/instagram";
import { metaConfig } from "@/lib/metaApp";

export async function GET(req: Request) {
  const user = await getUser();
  const url = new URL(req.url);
  const origin = process.env.APP_URL || url.origin;
  if (!user) return NextResponse.redirect(`${origin}/login`);
  const cfg = await metaConfig();
  if (!cfg) return NextResponse.redirect(`${origin}/conexoes?aviso=meta-nao-configurada`);
  const state = crypto.randomBytes(16).toString("hex");
  (await cookies()).set("rv_oauth_state", state, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });
  return NextResponse.redirect(authUrl(`${origin}/api/ig/callback`, state, cfg, { ads: url.searchParams.get("anuncios") === "1" }));
}
