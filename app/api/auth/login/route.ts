import { NextResponse } from "next/server";
import { login, createSession } from "@/lib/auth";
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const id = await login(String(email ?? ""), String(password ?? ""));
    await createSession(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}
