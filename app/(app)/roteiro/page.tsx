import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import RoteiroView from "./view";
export const dynamic = "force-dynamic";
export default async function Page() {
  const u = await requireUser();
  const rows = (await getStore().list("scripts", u.id)).filter((s: any) => s.source === "manual").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <RoteiroView initial={JSON.parse(JSON.stringify(rows))} />;
}
