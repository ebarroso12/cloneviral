import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import IscaView from "./view";
export const dynamic = "force-dynamic";
export default async function Page() {
  const u = await requireUser();
  const s = getStore();
  const baits = (await s.list("lead_magnets", u.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const scripts = (await s.list("scripts", u.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30);
  return <IscaView baits={JSON.parse(JSON.stringify(baits))} scripts={JSON.parse(JSON.stringify(scripts))} />;
}
