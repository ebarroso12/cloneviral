import { NextResponse } from "next/server";
import { publishDue } from "@/lib/publish";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Para quem agenda de fora (servidor). No computador, o agendador interno já chama publishDue.
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  return NextResponse.json({ results: await publishDue() });
}
