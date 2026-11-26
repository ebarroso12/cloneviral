import { route, bad } from "@/lib/api";
import { getStore } from "@/lib/store";

// CRUD genérico, sempre escopado ao usuário logado. Só coleções da lista.
const WRITABLE = new Set(["ideas", "news_topics", "scripts", "carousels", "series", "lead_magnets", "scheduled_posts", "brand_kit", "editorial_line", "business", "persona", "videos", "sweeps", "patterns", "xray", "analyses", "stories"]);
const READONLY = new Set(["posts", "snapshots", "audience", "ig_connection", "ads_connection", "news_items"]);

type Ctx = { params: Promise<{ collection: string }> };
const wrap = (fn: (c: string, user: any, req: Request) => Promise<any>) => (req: Request, ctx: Ctx) =>
  route(async (user, r) => fn((await ctx.params).collection, user, r))(req);

export const GET = wrap(async (c, user) => {
  if (!WRITABLE.has(c) && !READONLY.has(c)) bad("Coleção desconhecida.", 404);
  const rows = await getStore().list(c, user.id);
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
});
export const POST = wrap(async (c, user, req) => {
  if (!WRITABLE.has(c)) bad("Coleção desconhecida.", 404);
  const body = await req.json();
  const store = getStore();
  const singleton = c === "business" || c === "editorial_line" || c === "brand_kit" || c === "persona";
  if (singleton) {
    const cur = (await store.list(c, user.id))[0];
    return cur ? store.update(c, cur.id, user.id, body) : store.insert(c, user.id, body);
  }
  return store.insert(c, user.id, body);
});
export const PATCH = wrap(async (c, user, req) => {
  if (!WRITABLE.has(c)) bad("Coleção desconhecida.", 404);
  const id = new URL(req.url).searchParams.get("id");
  if (!id) bad("Informe o id.");
  const r = await getStore().update(c, id!, user.id, await req.json());
  if (!r) bad("Não encontrado.", 404);
  return r;
});
export const DELETE = wrap(async (c, user, req) => {
  if (!WRITABLE.has(c)) bad("Coleção desconhecida.", 404);
  const id = new URL(req.url).searchParams.get("id");
  if (!id) bad("Informe o id.");
  const ok = await getStore().remove(c, id!, user.id);
  if (!ok) bad("Não encontrado.", 404);
  return { ok: true };
});
