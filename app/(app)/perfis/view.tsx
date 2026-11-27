"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { PageHead, useToast } from "@/components/ui";
import { fmtPct } from "@/lib/format";

export default function View({ rows, connected, ai }: { rows: any[]; connected: boolean; ai: boolean }) {
  const r = useRouter();
  const { toast, node } = useToast();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState("");
  const run = async (what: string, fn: () => Promise<string>) => { setBusy(what); try { toast(await fn()); r.refresh(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(""); } };
  return (
    <>
      <PageHead title="Perfis de referência" desc="Estude contas profissionais do seu nicho com os números que o próprio Instagram informa." />
      {!connected && <div className="card" style={{ marginBottom: 14 }}>Para consultar outros perfis, <Link href="/conexoes">conecte o seu Instagram</Link>. A consulta usa a sua autorização.</div>}
      <div className="card">
        <form className="row wrap" onSubmit={(e) => { e.preventDefault(); run("a", async () => { await api("/api/perfis", { body: { action: "adicionar", username: name } }); setName(""); return "Perfil adicionado."; }); }}>
          <input aria-label="Perfil do Instagram" placeholder="@perfil" value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: 280 }} />
          <button className="btn primary" disabled={!connected || !name.trim() || !!busy}>{busy === "a" ? "Consultando..." : "Adicionar perfil"}</button>
          <button type="button" className="btn" disabled={!connected || !ai || !!busy} onClick={() => run("s", async () => { const j = await api("/api/perfis", { body: { action: "sugerir" } }); return j.found ? [`${j.found} perfis confirmados pelo Instagram.`, j.warning].filter(Boolean).join(" ") : "Nenhuma sugestão foi confirmada pelo Instagram. Tente de novo."; })}>{busy === "s" ? "Procurando..." : "Sugerir perfis"}</button>
        </form>
        {!ai && <p className="muted tiny">A sugestão automática precisa de uma IA de texto ligada em <Link href="/ia">IA e integrações</Link>.</p>}
      </div>
      {rows.length === 0 && <div className="empty" style={{ marginTop: 14 }}>Nenhum perfil guardado.</div>}
      {rows.map((p) => (
        <div key={p.id} className="card" style={{ marginTop: 14 }}>
          <div className="row between wrap"><div><b>{p.name}</b> <a href={`https://www.instagram.com/${encodeURIComponent(p.username)}/`} target="_blank" rel="noreferrer">@{p.username}</a> {p.suggested && <span className="tag">sugerido pela IA</span>}</div>
            <div className="row"><Link className="btn sm primary" href={`/varredura?perfil=${encodeURIComponent(p.id)}`}>Estudar na Varredura</Link><button className="btn sm danger" onClick={() => run("d", async () => { await api(`/api/c/ref_profiles?id=${encodeURIComponent(p.id)}`, { method: "DELETE" }); return "Perfil removido."; })}>Remover</button></div></div>
          <p className="muted small">{p.bio}</p>
          {p.reason && <p className="small">{p.reason}</p>}
          <div className="grid g3"><div className="kpi card"><div className="label">Seguidores</div><div className="value">{p.followers.toLocaleString("pt-BR")}</div></div><div className="kpi card"><div className="label">Publicações</div><div className="value">{p.mediaCount.toLocaleString("pt-BR")}</div></div><div className="kpi card"><div className="label">Interação por post</div><div className="value">{p.engagement == null ? "—" : fmtPct(p.engagement)}</div></div></div>
          <p className="muted tiny">Interação: média de curtidas e comentários dos últimos {p.posts.length} posts, dividida pelos seguidores.</p>
        </div>
      ))}
      {node}
    </>
  );
}
