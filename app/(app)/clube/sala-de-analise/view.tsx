"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { PageHead, useToast } from "@/components/ui";
import { fmtDateTimePt, fmtPct } from "@/lib/format";

export default function View({ rows }: { rows: any[] }) {
  const r = useRouter();
  const { toast, node } = useToast();
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); try { await api("/api/clube/analise", { body: {} }); toast("Análise pronta."); r.refresh(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } };
  return (
    <>
      <PageHead title="Sala de análise" desc="Uma leitura do seu perfil com os números que já foram medidos, os padrões dos seus melhores posts e o que ajustar primeiro." />
      <button className="btn primary" onClick={go} disabled={busy}>{busy ? "Analisando..." : "Analisar meu perfil · 2 créditos"}</button>
      {rows.length === 0 && <div className="empty" style={{ marginTop: 16 }}>Nenhuma análise ainda.</div>}
      {rows.map((a) => (
        <div key={a.id} className="card" style={{ marginTop: 14 }}>
          <div className="muted small">{fmtDateTimePt(a.createdAt)}</div>
          <div className="grid g3" style={{ margin: "10px 0" }}>
            <div className="kpi card"><div className="label">Seguidores</div><div className="value">{a.summary.followers?.toLocaleString("pt-BR")}</div></div>
            <div className="kpi card"><div className="label">Engajamento</div><div className="value">{a.summary.engagement != null ? fmtPct(a.summary.engagement) : "—"}</div></div>
            <div className="kpi card"><div className="label">Autenticidade</div><div className="value">{a.summary.authenticity ?? "—"}</div></div>
          </div>
          <h3>Padrões dos seus melhores posts</h3>
          <ul>{a.patterns.map((p: any, i: number) => <li key={i}>{p.label}</li>)}</ul>
          {a.todo.length > 0 && <><h3>O que ajustar primeiro</h3><ol>{a.todo.map((t: string, i: number) => <li key={i}>{t}</li>)}</ol></>}
        </div>
      ))}
      {node}
    </>
  );
}
