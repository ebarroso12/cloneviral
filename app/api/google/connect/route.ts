import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { googleAuthUrl, googleStatus } from "@/lib/google";
import { isOwner } from "@/lib/invites";

export async function GET(req: Request) {
  const user = await getUser();
  const origin = process.env.APP_URL || new URL(req.url).origin;
  if (!user) return NextResponse.redirect(`${origin}/login`);
  const back = (msg: string) => NextResponse.redirect(`${origin}/conexoes?google_erro=${encodeURIComponent(msg)}`);
  if (!(await isOwner(user.id))) return back("A ligação com o Google é só do dono.");
  const { configured, clientId } = await googleStatus(user.id);
  if (!configured) return back("Grave primeiro o seu app do Google.");
  const state = crypto.randomBytes(16).toString("hex");
  (await cookies()).set("rv_google_state", state, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });
  return NextResponse.redirect(googleAuthUrl(`${origin}/api/google/callback`, state, clientId));
}
