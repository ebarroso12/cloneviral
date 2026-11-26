import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import IdentidadeView from "./view";
export const dynamic = "force-dynamic";
export default async function Page() {
  const u = await requireUser();
  const [k] = await getStore().list("brand_kit", u.id);
  return <IdentidadeView initial={k ? JSON.parse(JSON.stringify(k)) : null} />;
}
