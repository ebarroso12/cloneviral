"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { PageHead, useToast } from "@/components/ui";

const FORMATS = [["sequencia", "Sequência com convite"], ["enquete", "Enquete"], ["perguntas", "Caixinha de perguntas"], ["bastidor", "Bastidor"], ["oferta", "Oferta"]];

export default function View({ rows }: { rows: any[] }) {
  const r = useRouter();
  const { toast, node } = useToast();
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const [format, setFormat] = useState("sequencia");
  const [count, setCount] = useState(5);
  const [ask, setAsk] = useState<Record<string, string>>({});
  const adjust = async (id: string) => { setBusy(true); try { await api("/api/clube/stories", { body: { id, instruction: ask[id] } }); setAsk({ ...ask, [id]: "" }); toast("Sequência ajustada."); r.refresh(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } };
  const go = async () => { setBusy(true); try { await api("/api/clube/stories", { body: { goal, format, count } }); setGoal(""); toast("Sequência criada."); r.refresh(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } };
  const copy = async (a: any) => { try { await navigator.clipboard.writeText(a.frames.map((f: any, i: number) => `${i + 1}. ${f.role}\n${f.text}`).join("\n\n")); toast("Copiado."); } catch { toast("Não consegui copiar.", "err"); } };
  return (
    <>
      <PageHead title="Assistente de Stories" desc="Diga o que você quer criar, escolha o formato e receba a sequência tela por tela. Com uma IA ligada, dá para pedir ajustes." />
      <div className="card"><div className="field"><label htmlFor="g">O que você quer criar? (objetivo da sequência)</label><input id="g" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Ex.: convidar para o encontro online" /></div><div className="grid g2"><div className="field"><label htmlFor="fm">Formato</label><select id="fm" value={format} onChange={(e) => setFormat(e.target.value)}>{FORMATS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></div><div className="field"><label htmlFor="qt">Telas</label><select id="qt" value={count} onChange={(e) => setCount(+e.target.value)}>{[3, 5, 7].map((n) => <option key={n}>{n}</option>)}</select></div></div><button className="btn primary" onClick={go} disabled={busy || !goal.trim()}>{busy ? "Criando..." : "Criar sequência"}</button></div>
      {rows.map((a) => (
        <div key={a.id} className="card" style={{ marginTop: 14 }}>
          <div className="row between"><b>{a.goal}</b><button className="btn sm" onClick={() => copy(a)}>Copiar tudo</button></div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", marginTop: 10 }}>{a.frames.map((f: any, i: number) => <div key={i} className="card" style={{ background: "var(--card2)" }}><span className="tag">{i + 1}. {f.role}</span><p className="small">{f.text}</p></div>)}</div>
          <div className="row wrap" style={{ marginTop: 10 }}><input aria-label={`Ajuste para ${a.goal}`} placeholder="Pedir ajuste: mais curto, mais direto..." value={ask[a.id] ?? ""} onChange={(e) => setAsk({ ...ask, [a.id]: e.target.value })} style={{ maxWidth: 360 }} /><button className="btn sm" disabled={busy || !ask[a.id]?.trim()} onClick={() => adjust(a.id)}>Ajustar</button></div>
        </div>
      ))}
      {node}
    </>
  );
}
