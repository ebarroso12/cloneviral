"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { Bar, PageHead, useToast } from "@/components/ui";
import { fmtDateTimePt } from "@/lib/format";

export default function PlanoView({ s, plan, trialEndsAt, costs, start }: any) {
  const r = useRouter();
  const { toast, node } = useToast();
  const [open, setOpen] = useState(false);
  const total = s.granted || 1;
  const left = Math.max(0, Math.ceil((Date.parse(trialEndsAt) - Date.now()) / 86400000));
  const more = async () => { try { await api("/api/credits", { body: {} }); toast("Pacote de demonstração adicionado: +20 créditos."); r.refresh(); } catch (e: any) { toast(e.message, "err"); } };
  return (
    <>
      <PageHead title="Meu plano" desc="Quanto você usou, quanto ainda tem, e onde cada crédito foi parar." />
      <div className="grid g2">
        <div className="card">
          <div className="row between"><h2>{plan === "trial" ? "Trial de 30 dias" : "START"}</h2><span className="tag green">Ativo</span></div>
          <div style={{ fontSize: 38, fontWeight: 700, margin: "8px 0" }}>{s.available} <span className="muted" style={{ fontSize: 16 }}>créditos disponíveis</span></div>
          <Bar pct={(s.used / total) * 100} />
          <p className="muted small" style={{ marginTop: 8 }}>{s.used} usados de {s.granted} neste ciclo{plan === "trial" ? ` · o trial termina em ${left} ${left === 1 ? "dia" : "dias"}` : ""}</p>
          <div className="row wrap" style={{ marginTop: 10 }}>
            <button className="btn primary" onClick={more}>Quero mais créditos</button>
            <button className="btn" onClick={() => toast("Sem gateway de pagamento configurado: a assinatura START (R$ 97 por mês, 100 créditos) fica ativa quando você ligar o Stripe. Veja o README.")}>Gerenciar assinatura</button>
          </div>
        </div>
        <div className="card">
          <h2>Quanto custa cada criação</h2>
          <table className="tbl"><tbody>{costs.map((c: any) => <tr key={c.label}><td>{c.label}</td><td style={{ textAlign: "right" }}><b>{c.credits}</b> {c.credits === 1 ? "crédito" : "créditos"}</td></tr>)}</tbody></table>
          <p className="muted tiny">O START tem {start.monthlyCredits} créditos por mês. Quando a criação rende menos do que o previsto, a diferença volta como estorno.</p>
        </div>
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <button className="btn ghost" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? "▾" : "▸"} Onde foram seus créditos</button>
        {open && (
          <table className="tbl" style={{ marginTop: 10 }}>
            <thead><tr><th>Quando</th><th>O quê</th><th style={{ textAlign: "right" }}>Créditos</th></tr></thead>
            <tbody>{s.rows.map((x: any) => (
              <tr key={x.id}><td className="muted small">{fmtDateTimePt(x.at)}</td><td>{x.label}{x.note && <div className="muted tiny">{x.note}</div>}</td><td style={{ textAlign: "right", color: x.amount > 0 ? "var(--green)" : "var(--fg)" }}>{x.amount > 0 ? "+" : ""}{x.amount}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {node}
    </>
  );
}
