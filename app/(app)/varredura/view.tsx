"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { PageHead, useToast } from "@/components/ui";
import { ScriptCard } from "@/components/ScriptCard";
import { fmtDateTimePt } from "@/lib/format";

const cost = (n: number) => 2 + Math.ceil(n * 1.2);
export default function VarreduraView({ sweeps, scripts, patterns }: any) {
  const r = useRouter();
  const { toast, node } = useToast();
  const [target, setTarget] = useState("perfil");
  const [dest, setDest] = useState("reel");
  const [types, setTypes] = useState<string[]>(["viral", "tecnico"]);
  const [analyze, setAnalyze] = useState(5);
  const [n, setN] = useState(5);
  const [dur, setDur] = useState("variado");
  const [theme, setTheme] = useState("");
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(sweeps[0]?.id ?? null);
  const tog = (t: string) => setTypes(types.includes(t) ? types.filter((x) => x !== t) : [...types, t]);
  const go = async () => {
    setBusy(true);
    try { const res = await api("/api/ai/varredura", { body: { target, dest, types, analyze, scripts: n, duration: dur, theme } }); setOpenId(res.sweepId); toast("Varredura pronta."); r.refresh(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHead title="Varredura" desc="O app estuda os posts que mais funcionaram, acha o padrão do gancho e do formato, e escreve roteiros novos em cima dele." />
      <div className="card">
        <div className="field"><label>O que varrer</label><div className="chips">{[["perfil", "Meu perfil"], ["um-perfil", "Um perfil"], ["nicho", "Um nicho"], ["conteudo", "Um conteúdo"]].map(([k, v]) => <button key={k} className="chip" aria-pressed={target === k} onClick={() => setTarget(k)}>{v}</button>)}</div>{target !== "perfil" && <span className="muted tiny">Só a varredura do seu próprio perfil tem dado completo por enquanto: perfis de terceiros dependem de acesso que a API oficial do Instagram não dá.</span>}</div>
        <div className="grid g2">
          <div className="field"><label>Destino</label><div className="chips">{[["reel", "Reel"], ["criativo", "Criativo"]].map(([k, v]) => <button key={k} className="chip" aria-pressed={dest === k} onClick={() => setDest(k)}>{v}</button>)}</div></div>
          <div className="field"><label>Tipos de roteiro</label><div className="chips">{[["viral", "Viral"], ["emocional", "Emocional"], ["tecnico", "Técnico"]].map(([k, v]) => <button key={k} className="chip" aria-pressed={types.includes(k)} onClick={() => tog(k)}>{v}</button>)}</div></div>
        </div>
        <div className="grid g3">
          <div className="field"><label htmlFor="a">Posts a analisar</label><select id="a" value={analyze} onChange={(e) => setAnalyze(+e.target.value)}>{[3, 5, 10].map((x) => <option key={x}>{x}</option>)}</select></div>
          <div className="field"><label htmlFor="n">Roteiros a criar</label><select id="n" value={n} onChange={(e) => setN(+e.target.value)}>{[1, 3, 5, 7, 10].map((x) => <option key={x}>{x}</option>)}</select></div>
          <div className="field"><label htmlFor="du">Duração</label><select id="du" value={dur} onChange={(e) => setDur(e.target.value)}>{["variado", "15", "30", "45", "60"].map((x) => <option key={x} value={x}>{x === "variado" ? "Variada" : x + " s"}</option>)}</select></div>
        </div>
        <div className="field"><label htmlFor="th">Tema (opcional)</label><input id="th" value={theme} onChange={(e) => setTheme(e.target.value)} /></div>
        <button className="btn primary" onClick={go} disabled={busy || !types.length}>{busy ? "Varrendo..." : `Iniciar varredura · ${cost(n)} créditos`}</button>
        <p className="muted tiny" style={{ marginTop: 8 }}>Se a varredura entregar menos roteiros do que o previsto, a diferença volta para você em créditos.</p>
      </div>
      <h2 style={{ margin: "22px 0 10px" }}>Suas varreduras</h2>
      {sweeps.length === 0 && <div className="empty">Nenhuma varredura ainda.</div>}
      {sweeps.map((s: any) => (
        <div key={s.id} className="card" style={{ marginBottom: 12 }}>
          <button className="btn ghost" onClick={() => setOpenId(openId === s.id ? null : s.id)} aria-expanded={openId === s.id}>{openId === s.id ? "▾" : "▸"} {fmtDateTimePt(s.createdAt)} · {s.delivered ?? 0} roteiros · {s.status === "pronto" ? "pronta" : s.status}{s.refund ? ` · ${s.refund} créditos devolvidos` : ""}</button>
          {openId === s.id && (
            <div style={{ marginTop: 10 }}>
              <div className="muted small" style={{ marginBottom: 6 }}>Padrões encontrados</div>
              <div className="chips" style={{ marginBottom: 12 }}>{patterns.filter((p: any) => p.sweepId === s.id).map((p: any) => <span key={p.id} className="tag" title={p.examples?.[0]}>{p.label}</span>)}</div>
              {scripts.filter((x: any) => x.sweepId === s.id).map((x: any) => <ScriptCard key={x.id} s={x} onChange={() => r.refresh()} onToast={toast} />)}
            </div>
          )}
        </div>
      ))}
      {node}
    </>
  );
}
