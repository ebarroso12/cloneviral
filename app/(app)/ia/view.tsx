"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { PageHead, PasswordInput, useToast } from "@/components/ui";
import type { Provider } from "@/lib/providers";

const TITLES: Record<string, [string, string]> = {
  text: ["Texto", "Roteiros, carrosséis (inclusive em outro idioma), séries, iscas, persona, Stories e sugestão de perfis. Sem IA, o app usa os modelos próprios."],
  video: ["Vídeo", "A IA assiste ao seu vídeo na Sala de análise."],
  image: ["Imagem", "Cria a imagem de capa do carrossel."],
};

export default function View({ owner, kinds, providers }: { owner: boolean; kinds: any[]; providers: Provider[] }) {
  return (
    <>
      <PageHead title="IA e integrações" desc="Ligue a inteligência artificial que quiser. Provedor pago só funciona com a sua autorização, e só para a sua conta." />
      {!owner && <div className="card muted">Só o dono da conta principal configura as chaves.</div>}
      {kinds.map((k) => <Box key={k.kind} owner={owner} saved={k} options={providers.filter((p) => p.kind === k.kind)} />)}
    </>
  );
}

function Box({ owner, saved, options }: { owner: boolean; saved: any; options: Provider[] }) {
  const r = useRouter();
  const { toast, node } = useToast();
  const [f, setF] = useState({ provider: saved.provider as string, model: saved.model as string, account: saved.account as string, key: "", allowPaid: saved.allowPaid as boolean });
  const [busy, setBusy] = useState("");
  const [image, setImage] = useState("");
  const p = options.find((x) => x.id === f.provider);
  const id = (x: string) => `${saved.kind}-${x}`;
  const run = async (what: string, body: any, done: (j: any) => void) => { setBusy(what); try { done(await api("/api/ia", { body: { kind: saved.kind, ...body } })); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(""); } };
  return (
    <section className="card" style={{ marginTop: 14 }} aria-label={TITLES[saved.kind][0]}>
      <div className="row between wrap"><h2>{TITLES[saved.kind][0]}</h2><span className={"tag " + (saved.active ? "green" : "yellow")}>{saved.active ? "Ligado: " + saved.active : "Desligado"}</span></div>
      <p className="muted small">{TITLES[saved.kind][1]}</p>
      {owner && saved.brokenKey && <p className="small" role="alert">A chave guardada não abre mais neste servidor. Cole a chave de novo e salve.</p>}
      {owner && saved.active && !saved.provider && <p className="small muted">Ligado pela configuração do servidor. Salvar com &quot;Nenhum&quot; desliga.</p>}
      {owner && (
        <form onSubmit={(e) => { e.preventDefault(); run("s", f, () => { toast(f.provider ? "IA gravada." : "IA desligada."); setF({ ...f, key: "" }); r.refresh(); }); }}>
          <div className="field"><label htmlFor={id("p")}>Provedor</label>
            <select id={id("p")} value={f.provider} onChange={(e) => { const n = options.find((x) => x.id === e.target.value); setF({ provider: e.target.value, model: n?.models[0] ?? "", account: "", key: "", allowPaid: false }); }}>
              <option value="">Nenhum</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          {p && (
            <>
              <p className="small">{p.note} <a href={p.keyUrl} target="_blank" rel="noreferrer">Pegar a chave</a></p>
              <div className="field"><label htmlFor={id("m")}>Modelo</label>
                {p.paid
                  ? <><input id={id("m")} list={id("l")} value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} /><datalist id={id("l")}>{p.models.map((m) => <option key={m} value={m} />)}</datalist></>
                  : <select id={id("m")} value={f.model || p.models[0]} onChange={(e) => setF({ ...f, model: e.target.value })}>{p.models.map((m) => <option key={m}>{m}</option>)}</select>}
              </div>
              {p.needsAccount && <div className="field"><label htmlFor={id("a")}>ID da conta da Cloudflare</label><input id={id("a")} value={f.account} onChange={(e) => setF({ ...f, account: e.target.value })} /></div>}
              <div className="field"><label htmlFor={id("k")}>Chave {saved.hasKey && !saved.brokenKey && saved.provider === f.provider && "(preencha só para trocar)"}</label><PasswordInput id={id("k")} autoComplete="off" value={f.key} onChange={(e) => setF({ ...f, key: e.target.value })} /></div>
              {p.paid && <label className="row small" style={{ marginBottom: 12 }}><input type="checkbox" style={{ width: "auto" }} checked={f.allowPaid} onChange={(e) => setF({ ...f, allowPaid: e.target.checked })} /> Autorizo a cobrança deste provedor no meu cartão.</label>}
            </>
          )}
          <div className="row wrap">
            <button className="btn primary" disabled={!!busy}>Salvar</button>
            <button type="button" className="btn" disabled={!!busy || !saved.active} onClick={() => run("t", { action: "testar" }, (j) => { if (j.image) setImage(j.image); toast(j.text ? "Funcionou: " + j.text : "Funcionou."); })}>{busy === "t" ? "Testando..." : "Testar"}</button>
          </div>
          {image && <img src={image} alt="Imagem de teste" style={{ maxWidth: 220, marginTop: 10, borderRadius: 10 }} />}
        </form>
      )}
      {node}
    </section>
  );
}
