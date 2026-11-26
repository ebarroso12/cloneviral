import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { metaConfigured } from "@/lib/instagram";
import ConexoesView from "./view";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const s = getStore();
  const [conn] = await s.list("ig_connection", u.id);
  const [ads] = await s.list("ads_connection", u.id);
  return <ConexoesView conn={conn ? JSON.parse(JSON.stringify({ ...conn, token: undefined })) : null} ads={ads ?? null} meta={metaConfigured()} flash={sp} />;
}
