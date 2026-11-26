import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { metaConfigured } from "@/lib/instagram";
import { avisoSemMeta } from "@/lib/config";
import ConexoesView from "./view";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const s = getStore();
  const [conn] = await s.list("ig_connection", u.id);
  const [ads] = await s.list("ads_connection", u.id);
  const [pending] = await s.list("ig_pending", u.id);
  const choices = pending && sp.escolher ? JSON.parse(JSON.stringify(pending.accounts)) : null;
  return <ConexoesView choices={choices} conn={conn ? JSON.parse(JSON.stringify({ ...conn, token: undefined })) : null} ads={ads ?? null} meta={metaConfigured()} aviso={avisoSemMeta({ demo: !!conn?.demo, site: !!process.env.VERCEL })} flash={sp} />;
}
