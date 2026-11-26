import { NextResponse } from "next/server";
import { syncAll } from "@/lib/instagram";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Coleta diária. A Vercel chama com Authorization: Bearer CRON_SECRET (ver vercel.json).
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  return NextResponse.json(await syncAll());
}
