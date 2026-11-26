import path from "node:path";
import { dataDir } from "./store";

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
