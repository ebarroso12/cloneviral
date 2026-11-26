import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import NegocioView from "./view";
export const dynamic = "force-dynamic";
export default async function Page() {
  const u = await requireUser();
  const [b] = await getStore().list("business", u.id);
  return <NegocioView initial={b ? JSON.parse(JSON.stringify(b)) : {}} />;
}
