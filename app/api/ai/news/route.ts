import { route, loadCtx, bad } from "@/lib/api";
import { getStore } from "@/lib/store";
import { newsAngle } from "@/lib/ai";

function tag(xml: string, name: string) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim() : "";
}

// Busca pelo feed RSS público do Google Notícias.
export const POST = route(async (user, req) => {
  const b = await req.json();
  const store = getStore();
  const topics = (await store.list("news_topics", user.id)).filter((t) => t.active !== false);
  if (!topics.length) bad("Adicione um assunto em Meus assuntos para eu ter o que buscar.");
  const count = Math.min(10, Math.max(1, Number(b.count ?? 5)));
  const ctx = await loadCtx(user.id);
  const found: any[] = [];
  try {
    for (const t of topics) {
      const res = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(t.text)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`, { headers: { "user-agent": "RadarViral/1.0" }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`feed ${res.status}`);
      const xml = await res.text();
      const items = xml.split("<item>").slice(1, 1 + count);
      for (const it of items) {
        const title = tag(it, "title");
        const summary = tag(it, "description");
        const link = tag(it, "link");
        const dup = (await store.list("news_items", user.id)).some((n) => n.link === link);
        if (dup) continue;
        found.push(await store.insert("news_items", user.id, { topicId: t.id, topic: t.text, title, link, publishedAt: tag(it, "pubDate"), summary, article: newsAngle(ctx, title, summary) }));
      }
    }
  } catch (e: any) {
    console.error(e);
    bad("Não consegui buscar as notícias agora. Tente de novo em instantes.", 502);
  }
  return found;
});
