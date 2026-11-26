import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import PersonaView from "./view";
export const dynamic = "force-dynamic";
export default async function Page() {
  const u = await requireUser();
  const [p] = await getStore().list("persona", u.id);
  return <PersonaView initial={p ? JSON.parse(JSON.stringify(p)) : null} />;
}
