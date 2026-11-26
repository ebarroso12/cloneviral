import fs from "node:fs";
import path from "node:path";
import { route, bad } from "@/lib/api";
import { getStore, uid } from "@/lib/store";

const MAX = 100 * 1024 * 1024;
export const POST = route(async (user, req) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) bad("Envie um arquivo.");
  const f = file as File;
  const ext = path.extname(f.name).toLowerCase();
  if (![".mp4", ".mov"].includes(ext)) bad("Formato inválido. Use MP4 ou MOV.");
  if (f.size > MAX) bad("O vídeo passa de 100 MB.");
  const duration = Number(form.get("duration") ?? 0);
  if (duration > 180) bad("O vídeo passa de 3 minutos.");
  const id = uid();
  const dir = path.join(process.cwd(), "data", "uploads", user.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, id + ext), Buffer.from(await f.arrayBuffer()));
  return getStore().insert("videos", user.id, { name: f.name, ext, size: f.size, duration, width: Number(form.get("width") ?? 0), height: Number(form.get("height") ?? 0), source: String(form.get("source") ?? "planejador") }, id);
});
export const GET = route(async (user, req) => {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const v = await getStore().get("videos", id);
  if (!v || v.userId !== user.id) bad("Vídeo não encontrado.", 404);
  const buf = fs.readFileSync(path.join(process.cwd(), "data", "uploads", user.id, id + v!.ext));
  return new Response(buf, { headers: { "content-type": v!.ext === ".mov" ? "video/quicktime" : "video/mp4", "content-length": String(buf.length) } });
});
