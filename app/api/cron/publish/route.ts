import { NextResponse } from "next/server";

// ESQUELETO: a publicação automática de agendamentos ainda não está implementada.
// Exigiria app Meta aprovado (instagram_content_publish), vídeo em URL pública e um agendador chamando esta rota.
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  return NextResponse.json({ today: new Date().toISOString().slice(0, 10), published: 0, note: "Não implementado." }, { status: 501 });
}
