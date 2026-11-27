"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { PasswordInput, PageHead, useToast } from "@/components/ui";

const mes = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const dt = (iso: string) => { const d = new Date(iso); return `${d.getDate()} de ${mes[d.getMonth()]} de ${d.getFullYear()}`; };

export default function ConexoesView({ conn, ads, meta, app, aviso, flash, choices }: { conn: any; ads: any; meta: boolean; app: { appId: string; configId: string; redirect: string } | null; aviso: string; flash: Record<string, string>; choices: { igId: string; username: string }[] | null }) {
  const r = useRouter();
  const { toast, node } = useToast();
  const [busy, setBusy] = useState("");
  const connected = conn?.status === "connected";
  const choose = async (a: { igId: string; username: string }) => {
    const other = conn && !conn.demo && conn.igId && conn.igId !== a.igId;
    if (other && !confirm(`Trocar para @${a.username}? O histórico atual é guardado em uma cópia, a medição recomeça e os agendamentos automáticos são desligados.`)) return;
    setBusy("e");
    try { await api("/api/ig/choose", { body: { igId: a.igId, confirmSwitch: !!other } }); toast("Conta conectada."); r.replace("/conexoes"); r.refresh(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(""); }
  };
  const run = async (k: string, fn: () => Promise<any>, ok: string) => { setBusy(k); try { await fn(); toast(ok); r.refresh(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(""); } };
  const days = conn?.measuringSince ? Math.max(1, Math.round((Date.now() - Date.parse(conn.measuringSince)) / 86400000)) : 0;
  return (
    <>
      <PageHead title="Conexões" desc="Conecte as suas contas. O app só lê os dados: não publica nem altera nada sem você pedir." />
      {!meta && <div className="card" role="status" style={{ marginBottom: 14, borderColor: "#5a4a1c" }}>{aviso}</div>}
      {flash.erro && <div className="card err" style={{ marginBottom: 14 }}>Não deu para conectar: {flash.erro}</div>}
      {flash.ok && <div className="card ok" style={{ marginBottom: 14 }}>Instagram conectado e sincronizado.</div>}
      {choices && <div className="card" style={{ marginBottom: 14 }}><h2>Qual conta conectar?</h2><div className="row wrap">{choices.map((a) => <button key={a.igId} className="btn" disabled={busy === "e"} onClick={() => choose(a)}>@{a.username}</button>)}</div></div>}
      {conn?.status === "reautorizar" && <div className="card err" style={{ marginBottom: 14 }}>A autorização venceu ou foi revogada. Refaça para voltar a coletar e publicar. {conn.syncError}</div>}
      {connected && conn?.syncError && <div className="card err" style={{ marginBottom: 14 }}>A última coleta falhou: {conn.syncError}</div>}
      {app && <MetaApp app={app} configured={meta} onSave={(body) => run("m", () => api("/api/meta-app", { body }), "App da Meta gravado.")} busy={busy === "m"} />}
      <div className="grid g2">
        <div className="card">
          <div className="row between"><h2>Instagram</h2><span className={"tag " + (connected ? "green" : "yellow")}>{connected ? "Conectado" : "Desconectado"}</span></div>
          {connected ? (
            <>
              <p><b>@{conn.igUsername}</b></p>
              <p className="muted small">autorização a renovar até {dt(conn.authorizedUntil)}</p>
              <p className="muted small">Serve para renovar o acesso antes do prazo que a Meta exige, a cada 90 dias, ou para trocar a Página conectada sem desconectar. Nada é apagado e o seu histórico não é tocado.</p>
              {conn.syncWarnings?.length > 0 && <p className="small err">A última coleta teve avisos: {conn.syncWarnings.join(" · ")}</p>}
              <div className="row wrap">
                {meta && <a className="btn" href="/api/ig/connect">Refazer a autorização</a>}
                <button className="btn danger" disabled={busy === "d"} onClick={() => confirm("Desconectar o Instagram? O histórico medido continua salvo.") && run("d", () => api("/api/ig/disconnect", { body: {} }), "Instagram desconectado.")}>Desconectar</button>
              </div>
              <p className="muted tiny" style={{ marginTop: 12 }}>Medindo desde {dt(conn.measuringSince)} · {days} {days === 1 ? "dia medido" : "dias medidos"}</p>
            </>
          ) : (
            <>
              <p className="muted">Conecte uma conta profissional (Comercial ou Criador) ligada a uma Página do Facebook.</p>
              {meta ? <a className="btn primary" href="/api/ig/connect">Conectar Instagram</a> : <button className="btn primary" disabled>Conectar Instagram</button>}
            </>
          )}
        </div>
        <div className="card">
          <div className="row between"><h2>Anúncios Meta</h2>{ads?.status === "connected" && <span className="tag green">Conectado</span>}</div>
          <p><b>Somar as impressões dos seus anúncios</b></p>
          <p className="muted small">O cartão Visualizações, em Métricas, conta as suas publicações. Conectando os anúncios, ele passa a somar as impressões entregues no Instagram, mostrando as duas partes separadas.</p>
          <p className="muted small">O app só lê. Ele não cria, não pausa e não altera campanha, público ou orçamento nenhum.</p>
          {!connected ? <p className="small muted">Conecte primeiro o Instagram.</p> : ads?.status === "connected" ? (
            <>
              {!conn?.demo && <p className="small">{Number(ads.views).toLocaleString("pt-BR")} impressões no Instagram, em {ads.accounts} {ads.accounts === 1 ? "conta de anúncio" : "contas de anúncio"}.</p>}
              <button className="btn danger" onClick={() => run("a", () => api("/api/ads", { body: { action: "disconnect" } }), "Anúncios desconectados.")}>Desconectar anúncios</button>
            </>
          ) : (
            <div className="row wrap">
              <button className="btn primary" disabled={busy === "a"} onClick={() => run("a", () => api("/api/ads", { body: { action: "connect" } }), "Anúncios conectados.")}>Conectar anúncios</button>
              {!conn?.demo && meta && <a className="btn" href="/api/ig/connect?anuncios=1">Autorizar leitura de anúncios</a>}
            </div>
          )}
          {conn?.demo && <p className="tiny dim" style={{ marginTop: 10 }}>Conta de demonstração: o total de anúncios é simulado.</p>}
        </div>
      </div>
      {node}
    </>
  );
}

function MetaApp({ app, configured, onSave, busy }: { app: { appId: string; configId: string; redirect: string }; configured: boolean; onSave: (b: Record<string, string>) => void; busy: boolean }) {
  const [f, setF] = useState({ appId: app.appId, secret: "", configId: app.configId });
  return (
    <details className="card" style={{ marginBottom: 14 }} open={!configured}>
      <summary><b>Seu app da Meta</b> {configured ? <span className="tag green">Configurado</span> : <span className="tag yellow">Falta configurar</span>}</summary>
      <ol className="muted small">
        <li>Em <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">developers.facebook.com/apps</a>, crie um app (é gratuito) e adicione o Login do Facebook.</li>
        <li>Em endereços de retorno válidos, cole: <code>{app.redirect}</code></li>
        <li>Em Configurações, Básico, copie o ID do app e a chave secreta e cole abaixo.</li>
      </ol>
      <form onSubmit={(e) => { e.preventDefault(); onSave(f); setF({ ...f, secret: "" }); }}>
        <div className="field"><label htmlFor="ma">ID do app</label><input id="ma" inputMode="numeric" value={f.appId} onChange={(e) => setF({ ...f, appId: e.target.value })} required /></div>
        <div className="field"><label htmlFor="ms">Chave secreta {configured && "(preencha só para trocar)"}</label><PasswordInput id="ms" autoComplete="off" value={f.secret} onChange={(e) => setF({ ...f, secret: e.target.value })} required /></div>
        <div className="field"><label htmlFor="mc">ID da configuração (só no Login do Facebook para Empresas)</label><input id="mc" inputMode="numeric" value={f.configId} onChange={(e) => setF({ ...f, configId: e.target.value })} /></div>
        <button className="btn primary" disabled={busy}>Salvar</button>
      </form>
    </details>
  );
}
