"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { PageHead, useToast } from "@/components/ui";

export default function IscaView({ baits, scripts }: any) {
  const r = useRouter();
  const { toast, node } = useToast();
  const [kw, setKw] = useState("");
  const [title, setTitle] = useState("");
  const [sid, setSid] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); try { await api("/api/ai/isca", { body: { keyword: kw, title, scriptId: sid || undefined } }); toast("Isca criada."); setKw(""); setTitle(""); r.refresh(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } };
  const del = async (id: string) => { if (confirm("Excluir esta isca?")) { await api(`/api/c/lead_magnets?id=${id}`, { method: "DELETE" }); r.refresh(); } };
  return (
    <>
      <PageHead title="Isca de alto valor" desc="Um material curto em PDF que a pessoa recebe ao comentar uma palavra-chave. Combina com o CTA 'comente EU QUERO'." />
      <div className="card">
        <div className="grid g2">
          <div className="field"><label htmlFor="k">Palavra-chave que a pessoa digita</label><input id="k" value={kw} onChange={(e) => setKw(e.target.value)} placeholder="Ex.: ROTINA" /></div>
          <div className="field"><label htmlFor="ti">Título (opcional)</label><input id="ti" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        </div>
        <div className="field"><label htmlFor="s">Basear em um roteiro (opcional)</label><select id="s" value={sid} onChange={(e) => setSid(e.target.value)}><option value="">Nenhum</option>{scripts.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></div>
        <button className="btn primary" onClick={go} disabled={busy || !kw.trim()}>{busy ? "Criando..." : "Criar isca · 3 créditos"}</button>
      </div>
      <h2 style={{ margin: "22px 0 10px" }}>Suas iscas</h2>
      {baits.length === 0 && <div className="empty">Nenhuma isca criada.</div>}
      {baits.map((b: any) => (
        <div key={b.id} className="card" style={{ marginBottom: 12 }}>
          <div className="row between wrap"><div><span className="tag">{b.keyword}</span> <b style={{ marginLeft: 8 }}>{b.title}</b></div><div className="row"><a className="btn sm" href={`/api/pdf/isca/${b.id}`} target="_blank" rel="noreferrer">Baixar PDF</a><button className="btn sm danger" onClick={() => del(b.id)}>Excluir</button></div></div>
          <ul className="muted small">{b.sections.map((s: any, i: number) => <li key={i}>{s.h}</li>)}</ul>
        </div>
      ))}
      {node}
    </>
  );
}
