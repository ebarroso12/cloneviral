import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import IdeiasView from "./view";
export const dynamic = "force-dynamic";
export default async function Page() {
  const u = await requireUser();
  const ideas = (await getStore().list("ideas", u.id)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return <IdeiasView initial={JSON.parse(JSON.stringify(ideas))} />;
}
