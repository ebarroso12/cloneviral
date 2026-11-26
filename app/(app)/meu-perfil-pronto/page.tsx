import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import PerfilView from "./view";
export const dynamic = "force-dynamic";
export default async function Page() {
  const u = await requireUser();
  const s = getStore();
  const [b] = await s.list("business", u.id);
  const [p] = await s.list("persona", u.id);
  const [c] = await s.list("ig_connection", u.id);
  const j = (x: any) => JSON.parse(JSON.stringify(x ?? null));
  return <PerfilView business={j(b)} persona={j(p)} conn={j(c ? { ...c, token: undefined } : null)} />;
}
