import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import SerieView from "./view";
export const dynamic = "force-dynamic";
export default async function Page() {
  const u = await requireUser();
  const s = getStore();
  const series = (await s.list("series", u.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const scripts = (await s.list("scripts", u.id)).filter((x: any) => x.source === "serie").sort((a: any, b: any) => a.createdAt.localeCompare(b.createdAt));
  return <SerieView series={JSON.parse(JSON.stringify(series))} scripts={JSON.parse(JSON.stringify(scripts))} />;
}
