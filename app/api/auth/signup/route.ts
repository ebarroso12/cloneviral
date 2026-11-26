import { NextResponse } from "next/server";
import { signup, createSession } from "@/lib/auth";
import { seedAccount } from "@/lib/seed";
export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();
    const id = await signup(String(name ?? ""), String(email ?? ""), String(password ?? ""));
    if (process.env.RV_DEMO_DATA_FOR_NEW_USERS === "1") await seedAccount(id);
    await createSession(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
