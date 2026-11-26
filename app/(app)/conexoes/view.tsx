"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { PageHead, useToast } from "@/components/ui";

const mes = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const dt = (iso: string) => { const d = new Date(iso); return `${d.getDate()} de ${mes[d.getMonth()]} de ${d.getFullYear()}`; };

export default function ConexoesView({ conn, ads, meta, flash }: { conn: any; ads: any; meta: boolean; flash: Record<string, string> }) {
  const r = useRouter();
  const { toast, node } = useToast();
  const [busy, setBusy] = useState("");
  const connected = conn?.status === "connected";
  const run = async (k: string, fn: () => Promise<any>, ok: string) => { setBusy(k); try { await fn(); toast(ok); r.refresh(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(""); } };
  const days = conn?.measuringSince ? Math.max(1, Math.round((Date.now() - Date.parse(conn.measuringSince)) / 86400000)) : 0;
  return (
    <>
      <PageHead title="Conexões" desc="Conecte as suas contas. O app só lê os dados: não publica nem altera nada sem você pedir." />
      {flash.aviso === "meta-nao-configurada" && <div className="card" style={{ marginBottom: 14, borderColor: "#5a4a1c" }}>O app Meta ainda não foi configurado neste servidor (faltam <code>META_APP_ID</code> e <code>META_APP_SECRET</code>). Enquanto isso, a conta de demonstração fica conectada. Veja o README, seção "Conectar o Instagram de verdade".</div>}
      {flash.erro && <div className="card err" style={{ marginBottom: 14 }}>Não deu para conectar: {flash.erro}</div>}
      {flash.ok && <div className="card ok" style={{ marginBottom: 14 }}>Instagram conectado e sincronizado.</div>}
      <div className="grid g2">
        <div className="card">
          <div className="row between"><h2>Instagram</h2><span className={"tag " + (connected ? "green" : "yellow")}>{connected ? "Conectado" : "Desconectado"}</span></div>
          {connected ? (
            <>
              <p><b>@{conn.igUsername}</b></p>
              <p className="muted small">autorização a renovar até {dt(conn.authorizedUntil)}</p>
              <p className="muted small">Serve para renovar o acesso antes do prazo que a Meta exige, a cada 90 dias, ou para trocar a Página conectada sem desconectar. Nada é apagado e o seu histórico não é tocado.</p>
              <div className="row wrap">
                <a className="btn" href="/api/ig/connect">Refazer a autorização</a>
                <button className="btn danger" disabled={busy === "d"} onClick={() => confirm("Desconectar o Instagram? O histórico medido continua salvo.") && run("d", () => api("/api/ig/disconnect", { body: {} }), "Instagram desconectado.")}>Desconectar</button>
              </div>
              <p className="muted tiny" style={{ marginTop: 12 }}>Medindo desde {dt(conn.measuringSince)} · {days} {days === 1 ? "dia medido" : "dias medidos"}</p>
            </>
          ) : (
            <>
              <p className="muted">Conecte uma conta profissional (Comercial ou Criador) ligada a uma Página do Facebook.</p>
              <a className="btn primary" href="/api/ig/connect">Conectar Instagram</a>
            </>
          )}
        </div>
        <div className="card">
          <div className="row between"><h2>Anúncios Meta</h2>{ads?.status === "connected" && <span className="tag green">Conectado</span>}</div>
          <p><b>Somar as visualizações dos seus anúncios</b></p>
          <p className="muted small">Hoje o cartão Visualizações, em Métricas, conta só as suas publicações. Conectando os anúncios, ele passa a mostrar o total, com a parte de publicação e a parte de anúncio separadas logo abaixo.</p>
          <p className="muted small">O app só lê. Ele vê quanto os seus anúncios entregaram e não cria, não pausa e não altera campanha, público ou orçamento nenhum.</p>
          {ads?.status === "connected" ? <button className="btn danger" onClick={() => run("a", () => api("/api/ads", { body: { action: "disconnect" } }), "Anúncios desconectados.")}>Desconectar anúncios</button> : <button className="btn primary" disabled={busy === "a"} onClick={() => run("a", () => api("/api/ads", { body: { action: "connect" } }), "Anúncios conectados.")}>Conectar anúncios</button>}
          {!meta && <p className="tiny dim" style={{ marginTop: 10 }}>Modo demonstração: o total de anúncios é simulado.</p>}
        </div>
      </div>
      {node}
    </>
  );
}
