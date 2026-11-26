import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import NoticiasView from "./view";
export const dynamic = "force-dynamic";
export default async function Page() {
  const u = await requireUser();
  const s = getStore();
  const topics = await s.list("news_topics", u.id);
  const items = (await s.list("news_items", u.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <NoticiasView topics={JSON.parse(JSON.stringify(topics))} items={JSON.parse(JSON.stringify(items))} />;
}
