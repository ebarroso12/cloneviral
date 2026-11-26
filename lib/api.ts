import { NextResponse } from "next/server";
import { apiUser, HttpError, type SessionUser } from "./auth";
import { InsufficientCredits } from "./credits";
import { getStore } from "./store";
import type { Ctx, Business, Persona } from "./ai";

export function route<T>(fn: (user: SessionUser, req: Request) => Promise<T>) {
  return async (req: Request) => {
    try {
      const user = await apiUser();
      const data = await fn(user, req);
      return data instanceof Response ? data : NextResponse.json(data);
    } catch (e: any) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof InsufficientCredits) return NextResponse.json({ error: e.message, needed: e.needed, available: e.available }, { status: 402 });
      console.error(e);
      return NextResponse.json({ error: e?.message ?? "Erro inesperado." }, { status: 500 });
    }
  };
}

export async function loadCtx(userId: string): Promise<Ctx> {
  const s = getStore();
  const persona = ((await s.get("persona", "persona")) as any) ?? { answers: {} };
  const business = ((await s.list("business", userId))[0] as any) ?? { voice: {} };
  const p = (await s.list("persona", userId))[0] as any;
  return { persona: (p ?? persona) as Persona, business: business as Business };
}

export function bad(msg: string, status = 400): never {
  throw new HttpError(status, msg);
}
