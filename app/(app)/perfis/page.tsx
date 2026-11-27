import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { getAi } from "@/lib/providers";
import View from "./view";
export const dynamic = "force-dynamic";
export default async function Page() {
  const u = await requireUser();
  const s = getStore();
  const rows = (await s.list("ref_profiles", u.id)).sort((a, b) => (b.engagement ?? -1) - (a.engagement ?? -1));
  const [conn] = await s.list("ig_connection", u.id);
  return <View rows={JSON.parse(JSON.stringify(rows))} connected={!!conn && !conn.demo && conn.status === "connected"} ai={!!(await getAi("text", u.id))} />;
}
