import { requireUser } from "@/lib/auth";
import ContaView from "./view";
export const dynamic = "force-dynamic";
export default async function Page() {
  const u = await requireUser();
  return <ContaView name={u.name} email={u.email} />;
}
