"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { PageHead, useToast } from "@/components/ui";
import { ScriptCard } from "@/components/ScriptCard";

export default function SerieView({ series, scripts }: any) {
  const r = useRouter();
  const { toast, node } = useToast();
  const [theme, setTheme] = useState("");
  const [ch, setCh] = useState(7);
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); try { await api("/api/ai/series", { body: { theme, chapters: ch } }); toast("Série criada."); r.refresh(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } };
  const del = async (id: string) => { if (!confirm("Excluir a série e os roteiros dela?")) return; for (const s of scripts.filter((x: any) => x.seriesId === id)) await api(`/api/c/scripts?id=${s.id}`, { method: "DELETE" }); await api(`/api/c/series?id=${id}`, { method: "DELETE" }); r.refresh(); };
  return (
    <>
      <PageHead title="Série" desc="Uma história contada em capítulos, que leva a pessoa a assistir o próximo. Cada capítulo é um roteiro que fecha com um gancho para o seguinte." />
      <div className="card">
        <div className="field"><label htmlFor="t">Tema da série</label><input id="t" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Ex.: como saí do zero e fechei meus primeiros clientes" /></div>
        <div className="field"><label>Capítulos</label><div className="chips">{[3, 5, 7, 10].map((n) => <button key={n} className="chip" aria-pressed={ch === n} onClick={() => setCh(n)}>{n}</button>)}</div></div>
        <button className="btn primary" onClick={go} disabled={busy || !theme.trim()}>{busy ? "Escrevendo..." : `Criar série · ${2 + ch} créditos`}</button>
      </div>
      {series.map((se: any) => (
        <div key={se.id} style={{ marginTop: 22 }}>
          <div className="row between"><h2>{se.theme}</h2><button className="btn sm danger" onClick={() => del(se.id)}>Excluir série</button></div>
          {scripts.filter((x: any) => x.seriesId === se.id).map((x: any, i: number) => <div key={x.id}><div className="muted small" style={{ margin: "8px 0 4px" }}>Capítulo {i + 1}</div><ScriptCard s={x} onChange={() => r.refresh()} onToast={toast} /></div>)}
        </div>
      ))}
      {series.length === 0 && <div className="empty" style={{ marginTop: 18 }}>Você ainda não criou nenhuma série.</div>}
      {node}
    </>
  );
}
