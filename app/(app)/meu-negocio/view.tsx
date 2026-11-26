"use client";
import { useRef, useState } from "react";
import { api } from "@/lib/client";
import { Bar, PageHead, useToast } from "@/components/ui";

type F = { path: string; label: string; area?: boolean; req?: boolean };
const SECTIONS: { id: string; title: string; desc: string; fields: F[] }[] = [
  { id: "quem", title: "Quem você é", desc: "Como você assina o seu conteúdo.", fields: [{ path: "name", label: "Seu nome" }, { path: "brand", label: "Nome do negócio ou marca" }] },
  { id: "oferta", title: "Sua oferta", desc: "Os níveis de produto, do mais barato ao mais caro.", fields: [{ path: "offerMain", label: "Produto principal", area: true }, { path: "offerEntry", label: "Produtos de entrada", area: true }, { path: "offerPremium", label: "Produto premium ou alto ticket", area: true }] },
  { id: "dif", title: "Seu diferencial", desc: "O que só você faz, e o nome do seu método.", fields: [{ path: "differentiator", label: "Seu diferencial único", area: true }, { path: "method", label: "Mecanismo ou metodologia própria", area: true }] },
  { id: "prova", title: "Sua prova", desc: "O que já aconteceu com quem passou por você.", fields: [{ path: "proof", label: "Números de prova social", area: true }] },
  { id: "onde", title: "Onde te encontram", desc: "Só onde você realmente publica ou atende. Em branco significa que você não usa.", fields: [{ path: "channels.instagram", label: "Instagram" }, { path: "channels.tiktok", label: "TikTok" }, { path: "channels.youtube", label: "YouTube" }, { path: "channels.whatsapp", label: "WhatsApp" }, { path: "channels.site", label: "Site" }] },
  { id: "conteudo", title: "Seu conteúdo", desc: "O que o seu conteúdo tem que fazer primeiro.", fields: [{ path: "focus", label: "Foco do conteúdo", area: true }] },
  { id: "voz", title: "Como você fala", desc: "Aqui é sobre você, e não sobre o seu cliente. Vale pra todo conteúdo que o app escrever.", fields: [{ path: "voice.style", label: "Estilo *", area: true, req: true }, { path: "voice.reference", label: "Referência", area: true }, { path: "voice.never", label: "O que nunca usar", area: true }, { path: "voice.always", label: "O que sempre usar", area: true }, { path: "voice.cta", label: "CTA padrão", area: true }] },
];
const get = (o: any, p: string) => p.split(".").reduce((a, k) => (a ? a[k] : undefined), o) ?? "";
const set = (o: any, p: string, v: string) => { const c = structuredClone(o); const ks = p.split("."); let t = c; ks.slice(0, -1).forEach((k) => (t = t[k] ||= {})); t[ks.at(-1)!] = v; return c; };

export default function NegocioView({ initial }: { initial: any }) {
  const [b, setB] = useState<any>(initial);
  const [edit, setEdit] = useState<string | null>(null);
  const { toast, node } = useToast();
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const all = SECTIONS.flatMap((s) => s.fields);
  const optional = all.filter((f) => !f.req);
  const answered = optional.filter((f) => String(get(b, f.path)).trim()).length;
  const pct = Math.round(((answered + (get(b, "voice.style") ? 1 : 0)) / (optional.length + 1)) * 100);
  const missing = all.filter((f) => !String(get(b, f.path)).trim());
  const save = async () => { try { await api("/api/c/business", { body: b }); toast("Salvo."); setEdit(null); } catch (e: any) { toast(e.message, "err"); } };
  return (
    <>
      <PageHead title="Meu Negócio" desc="O que a sua persona não responde e o seu conteúdo precisa: o que te diferencia, o que você vende além do principal, a sua prova, os seus canais e o seu jeito de falar." />
      <div className="card">
        <div className="row between"><span className={"tag " + (pct >= 80 ? "green" : "yellow")}>{pct >= 80 ? "Afinado" : "Em construção"}</span><b>{pct}%</b></div>
        <div style={{ margin: "8px 0" }}><Bar pct={pct} green={pct >= 80} /></div>
        <p className="muted small">{missing.length ? `Faltam ${missing.length} respostas para afinar ainda mais o texto.` : "Tudo respondido."}</p>
        <div className="chips">{missing.map((f) => <span key={f.path} className="tag">{f.label}</span>)}</div>
      </div>
      <div className="muted tiny" style={{ margin: "16px 0 6px", letterSpacing: ".12em" }}>AS 7 PARTES</div>
      <div className="chips" style={{ marginBottom: 6 }}>{SECTIONS.map((s) => <button key={s.id} className="chip" onClick={() => refs.current[s.id]?.scrollIntoView({ behavior: "smooth", block: "start" })}>{s.title}</button>)}</div>
      <div className="muted small" style={{ marginBottom: 12 }}>Escolha uma parte para ir direto até ela.</div>
      {SECTIONS.map((s) => (
        <div key={s.id} className="card" style={{ marginBottom: 14 }} ref={(el) => { refs.current[s.id] = el; }}>
          <div className="row between"><h2>{s.title}</h2>{edit === s.id ? <div className="row"><button className="btn sm primary" onClick={save}>Salvar</button><button className="btn sm" onClick={() => { setB(initial); setEdit(null); }}>Cancelar</button></div> : <button className="btn sm" onClick={() => setEdit(s.id)}>Editar</button>}</div>
          <p className="muted small">{s.desc}</p>
          {s.fields.map((f) => {
            const v = String(get(b, f.path));
            return edit === s.id ? (
              <div className="field" key={f.path}><label htmlFor={f.path}>{f.label}</label>{f.area ? <textarea id={f.path} value={v} onChange={(e) => setB(set(b, f.path, e.target.value))} /> : <input id={f.path} value={v} onChange={(e) => setB(set(b, f.path, e.target.value))} />}</div>
            ) : (
              <div key={f.path} style={{ marginBottom: 12 }}><div className="muted small">{f.label}</div><div style={{ whiteSpace: "pre-line" }}>{v || <span className="dim">Ainda sem resposta. Dá pra responder quando quiser.</span>}</div></div>
            );
          })}
        </div>
      ))}
      {node}
    </>
  );
}
