"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { PageHead, useToast } from "@/components/ui";
import { ScriptCard } from "@/components/ScriptCard";

const TYPES = [["viral", "Viral", "Ganchos fortes para alcance"], ["emocional", "Emocional", "Histórias que criam vínculo"], ["tecnico", "Técnico", "Ensina e gera autoridade"]];
export default function RoteiroView({ initial }: { initial: any[] }) {
  const r = useRouter();
  const { toast, node } = useToast();
  const [type, setType] = useState("viral");
  const [dest, setDest] = useState("reel");
  const [theme, setTheme] = useState("");
  const [count, setCount] = useState(1);
  const [sec, setSec] = useState(30);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { await api("/api/ai/scripts", { body: { type, dest, theme, count, seconds: sec } }); toast(`${count === 1 ? "Roteiro criado" : count + " roteiros criados"}.`); r.refresh(); } catch (e: any) { toast(e.message, e.status === 402 ? "err" : "err"); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHead title="Roteiro" desc="Escolha o tipo, diga o tema (ou deixe em branco) e receba um roteiro pronto para gravar, no seu jeito de falar." />
      <div className="card">
        <div className="field"><label>Tipo de conteúdo</label><div className="chips">{TYPES.map(([k, n, d]) => <button key={k} className="chip" aria-pressed={type === k} onClick={() => setType(k)} title={d}>{n}</button>)}</div></div>
        <div className="field"><label>Para quê</label><div className="chips">{[["reel", "Reel"], ["criativo", "Criativo de anúncio"]].map(([k, n]) => <button key={k} className="chip" aria-pressed={dest === k} onClick={() => setDest(k)}>{n}</button>)}</div></div>
        <div className="field"><label htmlFor="tema">Tema (opcional)</label><input id="tema" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Ex.: como falar de preço sem vergonha" /></div>
        <div className="grid g2">
          <div className="field"><label htmlFor="q">Quantos roteiros</label><select id="q" value={count} onChange={(e) => setCount(+e.target.value)}>{[1, 2, 3, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
          <div className="field"><label htmlFor="d">Duração</label><select id="d" value={sec} onChange={(e) => setSec(+e.target.value)}>{[15, 30, 45, 60, 90].map((n) => <option key={n} value={n}>{n} segundos</option>)}</select></div>
        </div>
        <button className="btn primary" onClick={go} disabled={busy}>{busy ? "Criando..." : `Criar roteiro · ${count} ${count === 1 ? "crédito" : "créditos"}`}</button>
      </div>
      <h2 style={{ margin: "22px 0 10px" }}>Seus roteiros</h2>
      {initial.length === 0 ? <div className="empty">Você ainda não criou nenhum roteiro.</div> : initial.map((s) => <ScriptCard key={s.id} s={s} onChange={() => r.refresh()} onToast={toast} />)}
      {node}
    </>
  );
}
