import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isOwner } from "@/lib/invites";
import { getStore } from "@/lib/store";
import ConvitesView from "./view";
export const dynamic = "force-dynamic";
export default async function Page() {
  const u = await requireUser();
  if (!(await isOwner(u.id))) redirect("/metricas");
  const now = Date.now();
  const open = (await getStore().list("invites", u.id)).filter((i) => Date.parse(i.expiresAt) > now).length;
  return <ConvitesView open={open} />;
}
