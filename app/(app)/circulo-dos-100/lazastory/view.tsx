"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { PageHead, useToast } from "@/components/ui";

export default function View({ rows }: { rows: any[] }) {
  const r = useRouter();
  const { toast, node } = useToast();
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); try { await api("/api/circulo/stories", { body: { goal } }); setGoal(""); toast("Sequência criada."); r.refresh(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } };
  const copy = async (a: any) => { try { await navigator.clipboard.writeText(a.frames.map((f: any, i: number) => `${i + 1}. ${f.role}\n${f.text}`).join("\n\n")); toast("Copiado."); } catch { toast("Não consegui copiar.", "err"); } };
  return (
    <>
      <PageHead title="Lazastory" desc="Cinco stories em sequência, cada um com uma função: abrir, contextualizar, virar, provar e convidar." />
      <div className="card"><div className="field"><label htmlFor="g">Objetivo da sequência</label><input id="g" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Ex.: convidar para o encontro online" /></div><button className="btn primary" onClick={go} disabled={busy || !goal.trim()}>{busy ? "Criando..." : "Criar sequência · 1 crédito"}</button></div>
      {rows.map((a) => (
        <div key={a.id} className="card" style={{ marginTop: 14 }}>
          <div className="row between"><b>{a.goal}</b><button className="btn sm" onClick={() => copy(a)}>Copiar tudo</button></div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", marginTop: 10 }}>{a.frames.map((f: any, i: number) => <div key={i} className="card" style={{ background: "var(--card2)" }}><span className="tag">{i + 1}. {f.role}</span><p className="small">{f.text}</p></div>)}</div>
        </div>
      ))}
      {node}
    </>
  );
}
