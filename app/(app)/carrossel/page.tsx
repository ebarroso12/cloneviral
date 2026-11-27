import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { CAROUSEL_MODELS, CATEGORIES } from "@/lib/templates";
import CarrosselView from "./view";
import { getAi } from "@/lib/providers";
export const dynamic = "force-dynamic";
export default async function Page() {
  const u = await requireUser();
  const s = getStore();
  const list = (await s.list("carousels", u.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [kit] = await s.list("brand_kit", u.id);
  const patterns = await s.list("patterns", u.id);
  const [conn] = await s.list("ig_connection", u.id);
  return <CarrosselView imageAi={!!(await getAi("image", u.id))} textAi={!!(await getAi("text", u.id))} list={JSON.parse(JSON.stringify(list))} kit={kit ? JSON.parse(JSON.stringify(kit)) : null} patterns={JSON.parse(JSON.stringify(patterns))} models={CAROUSEL_MODELS} cats={CATEGORIES} handle={conn?.igUsername ? "@" + conn.igUsername : ""} />;
}
