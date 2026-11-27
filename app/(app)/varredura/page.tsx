import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import VarreduraView from "./view";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ perfil?: string }> }) {
  const u = await requireUser();
  const s = getStore();
  const sweeps = (await s.list("sweeps", u.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const scripts = (await s.list("scripts", u.id)).filter((x: any) => x.source === "varredura");
  const patterns = await s.list("patterns", u.id);
  // vindo de Perfis de referência: as legendas mais curtidas já entram no campo de estudo
  const { perfil } = await searchParams;
  const ref = perfil ? await s.get("ref_profiles", perfil) : null;
  const sample = ref && ref.userId === u.id
    ? [...ref.posts].sort((a: any, b: any) => (b.likes ?? 0) + b.comments - ((a.likes ?? 0) + a.comments)).filter((p: any) => p.caption.trim()).slice(0, 10).map((p: any) => p.caption.replace(/\n\s*\n/g, "\n")).join("\n\n")
    : "";
  return <VarreduraView key={perfil ?? ""} initialSample={sample} sweeps={JSON.parse(JSON.stringify(sweeps))} scripts={JSON.parse(JSON.stringify(scripts))} patterns={JSON.parse(JSON.stringify(patterns))} />;
}
