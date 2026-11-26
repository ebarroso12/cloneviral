// Agendamento: toda criação passa por aqui, porque um agendamento automático vira publicação de verdade.
import { getStore } from "./store";
import { HttpError } from "./auth";

const g = globalThis as unknown as { __scheduleQueue?: Promise<unknown> };

/** Uma criação por vez: dois cliques seguidos não passam juntos pela checagem de repetido. */
export function schedulePost(userId: string, body: Record<string, any>, now: Date = new Date()) {
  const run = (g.__scheduleQueue ?? Promise.resolve()).then(() => create(userId, body, now));
  g.__scheduleQueue = run.catch(() => {});
  return run;
}

async function create(userId: string, b: Record<string, any>, now: Date) {
  const store = getStore();
  const date = String(b.date ?? "");
  const time = String(b.time ?? "");
  const due = new Date(`${date}T${time}:00`); // horário do computador
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || Number.isNaN(due.getTime())) throw new HttpError(400, "Informe uma data e um horário válidos.");
  const kind = ["viral", "emocional", "tecnico"].includes(b.kind) ? b.kind : "viral";
  const videoId = b.videoId ? String(b.videoId) : null;
  const scriptId = b.scriptId ? String(b.scriptId) : null;
  for (const [collection, id, name] of [["videos", videoId, "vídeo"], ["scripts", scriptId, "roteiro"]] as const) {
    if (!id) continue;
    const doc = await store.get(collection, id);
    if (!doc || doc.userId !== userId) throw new HttpError(404, `Não achei esse ${name}.`);
  }
  const autoPublish = b.autoPublish === true;
  if (autoPublish) {
    if (!videoId) throw new HttpError(400, "Escolha o vídeo que será publicado.");
    if (due.getTime() <= now.getTime()) throw new HttpError(400, "Esse horário já passou. Escolha um horário futuro para publicar sozinho.");
    const [conn] = await store.list("ig_connection", userId);
    if (!conn || conn.demo || conn.status !== "connected") throw new HttpError(400, "Conecte a sua conta real do Instagram para publicar sozinho.");
    const same = (await store.list("scheduled_posts", userId)).some((p) => p.autoPublish && ["agendado", "publicando"].includes(p.status) && p.videoId === videoId && p.date === date && p.time === time);
    if (same) throw new HttpError(409, "Esse vídeo já está agendado para esse dia e horário.");
  }
  return store.insert("scheduled_posts", userId, { date, time, kind, videoId, scriptId, caption: String(b.caption ?? "").slice(0, 2200), autoPublish, status: "agendado" });
}
