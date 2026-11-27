"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { PageHead, useToast } from "@/components/ui";

export default function NoticiasView({ topics, items }: any) {
  const r = useRouter();
  const { toast, node } = useToast();
  const [t, setT] = useState("");
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const add = async () => { if (!t.trim()) return; try { await api("/api/c/news_topics", { body: { text: t.trim(), active: true } }); setT(""); r.refresh(); } catch (e: any) { toast(e.message, "err"); } };
  const toggle = async (x: any) => { await api(`/api/c/news_topics?id=${x.id}`, { method: "PATCH", body: { active: x.active === false } }); r.refresh(); };
  const del = async (x: any) => { await api(`/api/c/news_topics?id=${x.id}`, { method: "DELETE" }); r.refresh(); };
  const search = async () => { setBusy(true); try { const f = await api("/api/ai/news", { body: { count } }); toast(f.length ? `${f.length} notícias novas.` : "Nada novo desde a última busca."); r.refresh(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } };
  const copy = async (txt: string) => { try { await navigator.clipboard.writeText(txt); toast("Copiado."); } catch { toast("Não consegui copiar.", "err"); } };
  return (
    <>
      <PageHead title="Notícias" desc="Você escolhe os assuntos do seu nicho, o app busca o que saiu e sugere um ângulo de conteúdo para cada notícia." />
      <div className="card">
        <h2>Meus assuntos</h2>
        <div className="row" style={{ margin: "10px 0" }}><input aria-label="Novo assunto" value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Ex.: marketing para pequenos negócios" /><button className="btn" onClick={add}>Adicionar</button></div>
        <div className="chips">{topics.map((x: any) => <span key={x.id} className="chip" style={{ opacity: x.active === false ? 0.5 : 1 }}>{x.text} <button className="btn sm ghost" onClick={() => toggle(x)} aria-label={x.active === false ? "Ativar" : "Pausar"}>{x.active === false ? "ativar" : "pausar"}</button><button className="btn sm ghost" onClick={() => del(x)} aria-label={`Remover ${x.text}`}>×</button></span>)}</div>
        <div className="row" style={{ marginTop: 14 }}><label htmlFor="c" className="muted small">Notícias por assunto</label><select id="c" value={count} onChange={(e) => setCount(+e.target.value)} style={{ width: 80 }}>{[3, 5, 10].map((n) => <option key={n}>{n}</option>)}</select><button className="btn primary" onClick={search} disabled={busy || !topics.length}>{busy ? "Buscando..." : "Buscar agora"}</button></div>
      </div>
      <h2 style={{ margin: "22px 0 10px" }}>Notícias encontradas</h2>
      {items.length === 0 && <div className="empty">Adicione um assunto e clique em Buscar agora.</div>}
      {items.map((n: any) => (
        <div key={n.id} className="card" style={{ marginBottom: 12 }}>
          <div className="row between wrap"><span className="tag">{n.topic}</span><span className="muted tiny">{n.publishedAt}</span></div>
          <h3 style={{ margin: "8px 0" }}>{n.title}</h3>
          {n.summary && <p className="muted small">{n.summary}</p>}
          <div style={{ whiteSpace: "pre-line" }}>{n.article}</div>
          <div className="row" style={{ marginTop: 10 }}>{n.link && <a className="btn sm" href={n.link} target="_blank" rel="noreferrer">Ler a notícia</a>}<button className="btn sm" onClick={() => copy(n.article)}>Copiar ângulo</button></div>
        </div>
      ))}
      {node}
    </>
  );
}
