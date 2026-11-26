import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import VarreduraView from "./view";
export const dynamic = "force-dynamic";
export default async function Page() {
  const u = await requireUser();
  const s = getStore();
  const sweeps = (await s.list("sweeps", u.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const scripts = (await s.list("scripts", u.id)).filter((x: any) => x.source === "varredura");
  const patterns = await s.list("patterns", u.id);
  return <VarreduraView sweeps={JSON.parse(JSON.stringify(sweeps))} scripts={JSON.parse(JSON.stringify(scripts))} patterns={JSON.parse(JSON.stringify(patterns))} />;
}
