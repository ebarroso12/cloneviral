import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { metaStatus } from "@/lib/metaApp";
import { isOwner } from "@/lib/invites";
import { googleStatus } from "@/lib/google";
import { appOrigin, avisoSemMeta } from "@/lib/config";
import { headers } from "next/headers";
import ConexoesView from "./view";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const s = getStore();
  const [conn] = await s.list("ig_connection", u.id);
  const [ads] = await s.list("ads_connection", u.id);
  const [pending] = await s.list("ig_pending", u.id);
  const app = await metaStatus();
  const origin = appOrigin(process.env, await headers());
  const choices = pending && sp.escolher ? JSON.parse(JSON.stringify(pending.accounts)) : null;
  const owner = await isOwner(u.id);
  const google = owner ? { status: await googleStatus(u.id), redirect: `${origin}/api/google/callback` } : null;
  return <ConexoesView google={google} choices={choices} conn={conn ? JSON.parse(JSON.stringify({ ...conn, token: undefined })) : null} ads={ads ?? null} meta={app.configured} app={owner && !app.fromServer ? { appId: app.appId, configId: app.configId, redirect: `${origin}/api/ig/callback` } : null} aviso={avisoSemMeta({ demo: !!conn?.demo, site: !!process.env.VERCEL })} flash={sp} />;
}
