import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import PlanejadorView from "./view";
export const dynamic = "force-dynamic";
export default async function Page() {
  const u = await requireUser();
  const s = getStore();
  const [line] = await s.list("editorial_line", u.id);
  const posts = await s.list("scheduled_posts", u.id);
  const videos = await s.list("videos", u.id);
  const scripts = (await s.list("scripts", u.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 40);
  const [conn] = await s.list("ig_connection", u.id);
  const j = (x: any) => JSON.parse(JSON.stringify(x));
  return <PlanejadorView line={j(line ?? { viral: 3, emocional: 3, tecnico: 3 })} posts={j(posts)} videos={j(videos)} scripts={j(scripts)} real={!!conn && !conn.demo} />;
}
