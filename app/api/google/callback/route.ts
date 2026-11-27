import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { connectGoogle } from "@/lib/google";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = process.env.APP_URL || url.origin;
  const back = (q: string) => NextResponse.redirect(`${origin}/conexoes?${q}`);
  const fail = (msg: string) => back(`google_erro=${encodeURIComponent(msg.slice(0, 200))}`);
  const user = await getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);
  const jar = await cookies();
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || state !== jar.get("rv_google_state")?.value) return fail("A autorização não foi concluída. Tente de novo.");
  jar.delete("rv_google_state");
  try {
    await connectGoogle(user.id, code, `${origin}/api/google/callback`);
    return back("google=ok");
  } catch (e: any) {
    return fail(String(e.message));
  }
}
