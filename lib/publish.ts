// Publicação de Reels pela API oficial, com envio direto do arquivo (upload retomável): não precisa
// de endereço público nem de serviço pago. Documentação: IG User Media e Content Publishing, da Meta.
import fs from "node:fs";
import { getStore, type Doc } from "./store";
import { decrypt, GRAPH, gj, MetaError } from "./instagram";
import { readVideo, freeVideo } from "./videos";
import { dueTime } from "./due";

const LATE_LIMIT = 6 * 3600_000; // passou disso, não publica de surpresa: o dono decide
const STUCK_LIMIT = 30 * 60_000;

/** O pedido de publicação saiu, mas não dá para saber o resultado: nunca tratar como falha. */
export class PublishUncertain extends Error {}

export async function publishReel(conn: Record<string, any>, file: string | Buffer, caption: string, opts: { pollMs?: number; maxPolls?: number } = {}) {
  const userToken = decrypt(conn.token);
  let token = userToken;
  try {
    const page = await gj(`${GRAPH}/${conn.pageId}?fields=access_token&access_token=${userToken}`);
    if (page.access_token) token = page.access_token;
  } catch {
    // sem token da Página a Meta ainda pode aceitar o do usuário; se não aceitar, o erro aparece abaixo
  }
  const q = new URLSearchParams({ media_type: "REELS", upload_type: "resumable", caption, access_token: token });
  const created = await gj(`${GRAPH}/${conn.igId}/media?${q}`, { method: "POST" });
  const target = new URL(String(created.uri));
  if (target.protocol !== "https:" || target.hostname !== "rupload.facebook.com") throw new Error("A Meta devolveu um endereço de envio inesperado.");
  const bytes = typeof file === "string" ? fs.readFileSync(file) : file;
  await gj(target.toString(), { method: "POST", headers: { Authorization: `OAuth ${token}`, offset: "0", file_size: String(bytes.length) }, body: bytes, timeoutMs: 600_000 });

  const wait = opts.pollMs ?? 15_000;
  for (let i = 0; ; i++) {
    const s = await gj(`${GRAPH}/${created.id}?fields=status_code&access_token=${token}`);
    if (s.status_code === "FINISHED") break;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error(`A Meta não processou o vídeo (${s.status_code}).`);
    if (i >= (opts.maxPolls ?? 20)) throw new Error("A Meta demorou demais para processar o vídeo. Confira no Instagram antes de tentar de novo.");
    await new Promise((r) => setTimeout(r, wait));
  }
  try {
    const done = await gj(`${GRAPH}/${conn.igId}/media_publish`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ creation_id: created.id }), timeoutMs: 120_000 });
    return String(done.id);
  } catch (e) {
    // recusa clara da Meta é falha; queda, demora ou erro do lado dela deixa o resultado em aberto
    if (e instanceof MetaError && e.status < 500) throw e;
    const check = await gj(`${GRAPH}/${created.id}?fields=status_code&access_token=${token}`).catch(() => null);
    if (check?.status_code === "PUBLISHED") return "";
    throw new PublishUncertain("Não recebi a confirmação da Meta. Confira no Instagram antes de agendar de novo.");
  }
}

type Result = { id: string; status: string; error?: string };
const g = globalThis as unknown as { __publishing?: Promise<Result[]> };

/** Publica o que está na hora. Chamadas simultâneas compartilham a mesma rodada. */
export function publishDue(now: Date = new Date(), opts: { pollMs?: number } = {}): Promise<Result[]> {
  g.__publishing ||= run(now, opts).finally(() => { g.__publishing = undefined; });
  return g.__publishing;
}

async function run(now: Date, opts: { pollMs?: number }) {
  const store = getStore();
  const posts = await store.findAll("scheduled_posts", (p) => p.autoPublish === true && (p.status === "agendado" || p.status === "publicando"));
  const results: Result[] = [];
  const set = async (p: Doc, status: string, extra: Record<string, any> = {}) => {
    await store.update("scheduled_posts", p.id, p.userId, { status, ...extra });
    results.push({ id: p.id, status, error: extra.error });
  };
  for (const listed of posts) {
    // relê na hora: o envio anterior pode ter levado minutos, e o post pode ter sido apagado ou adiado
    const p = await store.get("scheduled_posts", listed.id);
    if (!p || p.autoPublish !== true) continue;
    if (p.status === "publicando") {
      // o app fechou no meio: não dá para saber se saiu, então não repete
      if (now.getTime() - Date.parse(p.startedAt) > STUCK_LIMIT) await set(p, "conferir", { error: "O app fechou durante a publicação. Confira no Instagram." });
      continue;
    }
    if (p.status !== "agendado") continue;
    const due = dueTime(p as { date?: unknown; time?: unknown; tzOffset?: unknown });
    if (!Number.isFinite(due)) { await set(p, "falhou", { error: "Data ou horário inválido." }); continue; }
    if (due > now.getTime()) continue;
    if (now.getTime() - due > LATE_LIMIT) { await set(p, "atrasado", { error: "O app estava fechado no horário. Reagende para publicar." }); continue; }
    await store.update("scheduled_posts", p.id, p.userId, { status: "publicando", startedAt: now.toISOString() });
    try {
      const [conn] = await store.list("ig_connection", p.userId);
      if (!conn || conn.demo || conn.status !== "connected") throw new Error("Não há conta real do Instagram conectada.");
      const video = p.videoId ? await store.get("videos", String(p.videoId)) : null;
      if (!video || video.userId !== p.userId) throw new Error("Escolha um vídeo enviado para publicar.");
      const bytes = await readVideo(p.userId, video);
      const mediaId = await publishReel(conn, bytes, String(p.caption ?? "").slice(0, 2200), opts);
      await set(p, "publicado", { mediaId, publishedAt: new Date().toISOString(), error: null });
      // no site, o vídeo publicado libera espaço se nenhum outro agendamento ainda depende dele
      const pending = (await store.list("scheduled_posts", p.userId)).some((x) => x.videoId === video.id && x.autoPublish && x.status === "agendado");
      if (!pending) await freeVideo(p.userId, video).catch((e) => console.error("liberar vídeo:", e.message));
    } catch (e: any) {
      await set(p, e instanceof PublishUncertain ? "conferir" : "falhou", { error: String(e?.message ?? e).slice(0, 300) });
    }
  }
  return results;
}
