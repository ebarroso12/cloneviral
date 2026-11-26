import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import View from "./view";
export const dynamic = "force-dynamic";
export default async function Page() {
  const u = await requireUser();
  const s = getStore();
  const posts = ((await s.list("posts", u.id)) as any[]).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 60).map((p) => ({ id: p.id, caption: p.caption, publishedAt: p.publishedAt, type: p.type }));
  const rows = (await s.list("xray", u.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <View posts={posts} rows={JSON.parse(JSON.stringify(rows))} />;
}
