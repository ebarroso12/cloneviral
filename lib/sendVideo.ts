// Envio de vídeo pelo navegador: direto no computador, em pedaços no site.
import { api } from "./client";

export async function sendVideo(file: File, meta: { duration: number; width: number; height: number; source?: string }, site: boolean, progress: (pct: number) => void = () => {}) {
  if (!site) {
    const fd = new FormData();
    fd.append("file", file);
    for (const [k, v] of Object.entries(meta)) fd.append(k, String(v));
    return api("/api/upload", { body: fd });
  }
  const start = await api("/api/upload", { body: { action: "start", name: file.name, size: file.size, ...meta } });
  try {
    for (let i = 0; i < start.parts; i++) {
      const res = await fetch(`/api/upload?id=${start.id}&i=${i}`, { method: "PUT", headers: { "content-type": "application/octet-stream" }, body: file.slice(i * start.chunk, (i + 1) * start.chunk) });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Falha ao enviar o vídeo. Tente de novo.");
      progress(Math.round(((i + 1) / start.parts) * 100));
    }
    return await api("/api/upload", { body: { action: "finish", id: start.id } });
  } catch (e) {
    await fetch(`/api/upload?id=${start.id}`, { method: "DELETE" }).catch(() => {});
    throw e;
  }
}
