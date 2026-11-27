import path from "node:path";
import fs from "node:fs";
import { dataDir, getStore, uid, type Doc } from "./store";
import { HttpError } from "./auth";

const SAFE_ID = /^[A-Za-z0-9-]+$/;
export const VIDEO_EXTS = [".mp4", ".mov"];

export function uploadDir(userId: string) {
  if (!SAFE_ID.test(userId)) throw new Error("Usuário inválido.");
  return path.join(dataDir(), "uploads", userId);
}

export function videoPath(userId: string, video: { id: string; ext?: string }) {
  if (!SAFE_ID.test(video.id) || !VIDEO_EXTS.includes(String(video.ext))) throw new Error("Vídeo inválido.");
  return path.join(uploadDir(userId), video.id + video.ext);
}

// No site o disco não guarda nada: o arquivo vai em pedaços para o banco (o corpo de cada pedido é limitado).
const MB = 1024 * 1024;
export const CHUNK = 3 * MB;
export const SITE_MAX = 50 * MB;
export const SITE_TOTAL = 150 * MB; // o banco gratuito é pequeno
const STALE_MS = 10 * 60_000; // mais que o prazo máximo de uma análise
const partId = (videoId: string, i: number) => `${videoId}-${i}`;

export async function startUpload(userId: string, b: { name?: unknown; size?: unknown; duration?: unknown; width?: unknown; height?: unknown; source?: unknown }) {
  const name = String(b.name ?? "").slice(0, 200);
  const ext = path.extname(name).toLowerCase();
  const size = Number(b.size);
  const duration = Number(b.duration ?? 0);
  if (!VIDEO_EXTS.includes(ext)) throw new HttpError(400, "Formato inválido. Use MP4 ou MOV.");
  if (!Number.isInteger(size) || size <= 0) throw new HttpError(400, "O arquivo está vazio.");
  if (size > SITE_MAX) throw new HttpError(400, "No site o vídeo pode ter até 50 MB.");
  if (duration > 180) throw new HttpError(400, "O vídeo passa de 3 minutos.");
  const store = getStore();
  // análise cortada pelo servidor não chega a apagar o arquivo: a sobra sai antes de contar o espaço
  for (const old of await store.list("videos", userId))
    if (old.source === "analise" && Date.now() - Date.parse(old.createdAt) > STALE_MS) await deleteVideo(userId, old.id).catch((e) => console.error(e));
  const used = (await store.list("videos", userId)).filter((v) => v.storage === "db" && !v.freed).reduce((a, v) => a + v.size, 0);
  if (used + size > SITE_TOTAL) throw new HttpError(400, "Acabou o espaço de vídeos no site (150 MB). Exclua um vídeo antigo.");
  const id = uid();
  const v = await store.insert("videos", userId, { name, ext, size, duration, width: Number(b.width ?? 0), height: Number(b.height ?? 0), source: String(b.source ?? "planejador"), storage: "db", parts: Math.ceil(size / CHUNK), ready: false }, id);
  return v as Doc & { parts: number };
}

async function ownVideo(userId: string, id: string) {
  const v = await getStore().get("videos", id);
  if (!v || v.userId !== userId) throw new HttpError(404, "Vídeo não encontrado.");
  return v;
}

export async function savePart(userId: string, videoId: string, i: number, bytes: Buffer) {
  const v = await ownVideo(userId, videoId);
  if (v.storage !== "db" || v.ready || !Number.isInteger(i) || i < 0 || i >= v.parts) throw new HttpError(400, "Esse pedaço não pertence a um envio em andamento.");
  if (bytes.length !== Math.min(CHUNK, v.size - i * CHUNK)) throw new HttpError(400, "Pedaço com tamanho errado.");
  await getStore().insert("video_chunks", userId, { b64: bytes.toString("base64") }, partId(videoId, i));
}

async function part(userId: string, videoId: string, i: number) {
  const d = await getStore().get("video_chunks", partId(videoId, i));
  if (!d || d.userId !== userId) throw new HttpError(400, "Envio incompleto. Envie o vídeo de novo.");
  return Buffer.from(String(d.b64), "base64");
}

export async function finishUpload(userId: string, videoId: string) {
  const v = await ownVideo(userId, videoId);
  let total = 0;
  for (let i = 0; i < v.parts; i++) total += (await part(userId, videoId, i)).length;
  if (total !== v.size) throw new HttpError(400, "Envio incompleto. Envie o vídeo de novo.");
  return getStore().update("videos", videoId, userId, { ready: true });
}

export const readPart = part;

export async function readVideo(userId: string, v: Doc): Promise<Buffer> {
  if (v.storage !== "db") {
    const file = videoPath(userId, v as any);
    if (!fs.existsSync(file)) throw new Error("O arquivo do vídeo não está mais no computador.");
    return fs.readFileSync(file);
  }
  if (v.freed || !v.ready) throw new Error("O arquivo do vídeo não está mais disponível. Envie de novo.");
  const out: Buffer[] = [];
  for (let i = 0; i < v.parts; i++) out.push(await part(userId, v.id, i));
  return Buffer.concat(out);
}

/** Apaga os pedaços do banco. O registro continua, marcado, para o histórico do planejador. */
export async function freeVideo(userId: string, v: Doc) {
  if (v.storage !== "db") return;
  for (let i = 0; i < v.parts; i++) await getStore().remove("video_chunks", partId(v.id, i), userId);
  await getStore().update("videos", v.id, userId, { freed: true });
}

export async function deleteVideo(userId: string, videoId: string) {
  const v = await ownVideo(userId, videoId);
  const store = getStore();
  const busy = (await store.list("scheduled_posts", userId)).some((p) => p.videoId === videoId && p.autoPublish && ["agendado", "publicando"].includes(p.status));
  if (busy) throw new HttpError(409, "Esse vídeo está agendado para publicação. Remova o agendamento primeiro.");
  if (v.storage === "db") await freeVideo(userId, v);
  else fs.rmSync(videoPath(userId, v as any), { force: true });
  await store.remove("videos", videoId, userId);
}
