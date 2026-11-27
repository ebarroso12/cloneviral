import { route, loadCtx, bad } from "@/lib/api";
import { getStore } from "@/lib/store";
import { genIsca } from "@/lib/ai";

export const POST = route(async (user, req) => {
  const b = await req.json();
  const keyword = String(b.keyword ?? "").trim().replace(/\s+/g, "").slice(0, 30);
  if (!keyword) bad("Escolha a palavra-chave que a pessoa vai digitar.");
  const store = getStore();
  let source = String(b.source ?? "").slice(0, 8000);
  if (b.patternId) {
    const pt = (await store.get("patterns", String(b.patternId))) as any;
    if (pt && pt.userId === user.id) source = String(pt.examples?.[0] ?? "");
  }
  if (b.scriptId) {
    const sc = (await store.get("scripts", String(b.scriptId))) as any;
    if (sc && sc.userId === user.id) source = `${sc.hook} ${sc.body}`;
  }
  const ctx = await loadCtx(user.id);
  const doc = await genIsca(ctx, { keyword, title: b.title, source });
  return store.insert("lead_magnets", user.id, { keyword: keyword.toUpperCase(), title: doc.title, sections: doc.sections });
});
