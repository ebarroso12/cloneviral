import fs from "node:fs";
import path from "node:path";
import { uploadDir, videoPath, VIDEO_EXTS, CHUNK, startUpload, savePart, finishUpload, readPart, deleteVideo } from "@/lib/videos";
import { route, bad } from "@/lib/api";
import { getStore, uid } from "@/lib/store";

const MAX = 100 * 1024 * 1024;
export const POST = route(async (user, req) => {
  // envio em pedaços (site): começar e terminar
  if (req.headers.get("content-type")?.includes("application/json")) {
    const b = await req.json();
    if (b.action === "finish") return finishUpload(user.id, String(b.id ?? ""));
    const v = await startUpload(user.id, b);
    return { id: v.id, parts: v.parts, chunk: CHUNK };
  }
  if (process.env.VERCEL) bad("Neste servidor o vídeo é enviado em pedaços. Atualize a página.", 400);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) bad("Envie um arquivo.");
  const f = file as File;
  const ext = path.extname(f.name).toLowerCase();
  if (!VIDEO_EXTS.includes(ext)) bad("Formato inválido. Use MP4 ou MOV.");
  if (f.size > MAX) bad("O vídeo passa de 100 MB.");
  const duration = Number(form.get("duration") ?? 0);
  if (duration > 180) bad("O vídeo passa de 3 minutos.");
  const id = uid();
  const dir = uploadDir(user.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(videoPath(user.id, { id, ext }), Buffer.from(await f.arrayBuffer()));
  return getStore().insert("videos", user.id, { name: f.name, ext, size: f.size, duration, width: Number(form.get("width") ?? 0), height: Number(form.get("height") ?? 0), source: String(form.get("source") ?? "planejador") }, id);
});
export const GET = route(async (user, req) => {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const v = await getStore().get("videos", id);
  if (!v || v.userId !== user.id) bad("Vídeo não encontrado.", 404);
  const type = v!.ext === ".mov" ? "video/quicktime" : "video/mp4";
  if (v!.storage === "db") {
    if (v!.freed || !v!.ready) bad("O arquivo desse vídeo não está mais no servidor.", 404);
    // responde um pedaço por vez; o tocador de vídeo pede os seguintes
    const start = Math.min(Number(/bytes=(\d+)-/.exec(req.headers.get("range") ?? "")?.[1] ?? 0), v!.size - 1);
    const i = Math.floor(start / CHUNK);
    const slice = (await readPart(user.id, id, i)).subarray(start - i * CHUNK);
    return new Response(new Uint8Array(slice), { status: 206, headers: { "content-type": type, "accept-ranges": "bytes", "content-length": String(slice.length), "content-range": `bytes ${start}-${start + slice.length - 1}/${v!.size}` } });
  }
  const file = videoPath(user.id, v as any);
  if (!fs.existsSync(file)) bad("O arquivo desse vídeo não está mais no servidor.", 404);
  const buf = fs.readFileSync(file);
  return new Response(buf, { headers: { "content-type": type, "content-length": String(buf.length) } });
});
export const PUT = route(async (user, req) => {
  const q = new URL(req.url).searchParams;
  const bytes = Buffer.from(await req.arrayBuffer());
  if (bytes.length > CHUNK) bad("Pedaço grande demais.", 413);
  await savePart(user.id, q.get("id") ?? "", Number(q.get("i")), bytes);
  return { ok: true };
});
export const DELETE = route(async (user, req) => {
  await deleteVideo(user.id, new URL(req.url).searchParams.get("id") ?? "");
  return { ok: true };
});
