"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { PasswordInput, useToast } from "@/components/ui";
import type { googleStatus } from "@/lib/google";

type Status = Awaited<ReturnType<typeof googleStatus>>;
type Options = { sites: string[]; properties: { id: string; name: string }[]; sitesError?: string };

export default function GoogleCard({ status, redirect, flash }: { status: Status; redirect: string; flash: Record<string, string> }) {
  const r = useRouter();
  const { toast, node } = useToast();
  const [busy, setBusy] = useState(false);
  const [app, setApp] = useState({ clientId: status.clientId, secret: "" });
  const [pick, setPick] = useState({ siteUrl: status.siteUrl, propertyId: status.propertyId, term: status.term });
  const [options, setOptions] = useState<Options | null>(null);
  const [optionsError, setOptionsError] = useState("");
  const connected = status.status === "connected";

  useEffect(() => {
    if (!connected) return;
    setOptionsError("");
    api<Options>("/api/google/options").then(setOptions).catch((e) => { setOptionsError(e.message); r.refresh(); });
  }, [connected, r]);

  const run = async (path: string, body: unknown, ok: string) => {
    setBusy(true);
    try { await api(path, { body }); toast(ok); r.refresh(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  };
  const missing = connected && !status.propertyId;

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="row between"><h2>Google: busca pelo seu nome</h2><span className={"tag " + (connected && !missing ? "green" : "yellow")}>{!connected ? "Desconectado" : missing ? "Falta escolher" : "Conectado"}</span></div>
      <p className="muted small">Mostra em Métricas as visitas vindas do Google e os cliques no WhatsApp. Com o site verificado no Search Console, mostra também quantas vezes ele apareceu nas buscas pelo seu nome e os cliques. O app só lê.</p>
      {flash.google_erro && <p className="small err">Não deu para conectar: {flash.google_erro}</p>}
      {flash.google === "ok" && connected && <p className="small" style={{ color: "var(--green)" }}>Google conectado. Agora escolha a propriedade do Analytics e toque em Salvar.</p>}
      {status.status === "reautorizar" && <p className="small err">A autorização do Google venceu ou foi retirada. Conecte de novo.</p>}

      <details open={!status.configured} style={{ marginBottom: 12 }}>
        <summary><b>Seu app do Google</b> {status.configured ? <span className="tag green">Configurado</span> : <span className="tag yellow">Falta configurar</span>}</summary>
        <ol className="muted small">
          <li>Em <a href="https://console.cloud.google.com/auth/clients" target="_blank" rel="noreferrer">console.cloud.google.com</a>, crie um cliente OAuth do tipo Aplicativo da Web (é gratuito).</li>
          <li>Em URIs de redirecionamento autorizados, cole: <code style={{ wordBreak: "break-all" }}>{redirect}</code></li>
          <li>Copie o ID do cliente e a chave secreta e cole abaixo.</li>
        </ol>
        <form onSubmit={(e) => { e.preventDefault(); run("/api/google/app", app, "App do Google gravado."); setApp({ ...app, secret: "" }); }}>
          <div className="field"><label htmlFor="gid">ID do cliente</label><input id="gid" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={app.clientId} onChange={(e) => setApp({ ...app, clientId: e.target.value })} required /></div>
          <div className="field"><label htmlFor="gse">Chave secreta do cliente {status.configured && "(preencha só para trocar)"}</label><PasswordInput id="gse" autoComplete="off" value={app.secret} onChange={(e) => setApp({ ...app, secret: e.target.value })} required /></div>
          <button className="btn primary" disabled={busy}>Salvar app</button>
        </form>
      </details>

      {connected ? (
        <form onSubmit={(e) => { e.preventDefault(); run("/api/google/settings", { siteUrl: pick.siteUrl, propertyId: pick.propertyId, ...(pick.siteUrl ? { term: pick.term } : {}) }, "Escolhas gravadas."); }}>
          {optionsError && <p className="small err">Não deu para ler a sua conta do Google: {optionsError}</p>}
          {!options && !optionsError && <p className="muted small">Lendo a sua conta do Google...</p>}
          {options && (
            <>
              {options.sitesError && <p className="small err">Não deu para ler o Search Console: {options.sitesError}</p>}
              {!options.sitesError && options.sites.length === 0 && <p className="muted small">Nenhum site verificado no Search Console. As visitas e o WhatsApp funcionam mesmo assim.</p>}
              {options.properties.length === 0 && <p className="small err">Nenhuma propriedade do Analytics nesta conta.</p>}
              <div className="field"><label htmlFor="gsite">Site (Search Console), opcional</label><select id="gsite" value={pick.siteUrl} onChange={(e) => setPick({ ...pick, siteUrl: e.target.value })}><option value="">Sem site verificado por enquanto</option>{options.sites.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
              <div className="field"><label htmlFor="gprop">Propriedade do Analytics</label><select id="gprop" value={pick.propertyId} onChange={(e) => setPick({ ...pick, propertyId: e.target.value })} required><option value="">Escolha...</option>{options.properties.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}</select></div>
              {pick.siteUrl && <div className="field"><label htmlFor="gterm">Nome pesquisado</label><input id="gterm" maxLength={60} value={pick.term} onChange={(e) => setPick({ ...pick, term: e.target.value })} required /></div>}
            </>
          )}
          <div className="row wrap">
            <button className="btn primary" disabled={busy || !options}>Salvar</button>
            <button type="button" className="btn danger" disabled={busy} onClick={() => confirm("Desconectar o Google?") && run("/api/google/disconnect", {}, "Google desconectado.")}>Desconectar</button>
          </div>
        </form>
      ) : status.configured ? <a className="btn primary" href="/api/google/connect">Conectar Google</a> : <button className="btn primary" disabled>Conectar Google</button>}
      {node}
    </div>
  );
}
