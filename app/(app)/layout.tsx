import { isOwner } from "@/lib/invites";
import { requireUser } from "@/lib/auth";
import Shell from "@/components/Shell";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [conn] = await getStore().list("ig_connection", user.id);
  return <Shell owner={await isOwner(user.id)} handle={conn?.igUsername} user={{ name: user.name, email: user.email }}>{children}</Shell>;
}
