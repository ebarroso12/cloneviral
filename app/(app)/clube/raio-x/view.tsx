"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { PageHead, useToast } from "@/components/ui";
import { fmtShort } from "@/lib/format";

export default function View({ posts, rows }: any) {
  const r = useRouter();
  const { toast, node } = useToast();
  const [id, setId] = useState(posts[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [highlights, setHighlights] = useState("");
  const profile = async () => { setBusy(true); try { await api("/api/clube/perfil", { body: { highlights } }); toast("Raio-X do perfil pronto."); r.refresh(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } };
  const go = async () => { setBusy(true); try { await api("/api/clube/raiox", { body: { postId: id } }); toast("Raio-X pronto."); r.refresh(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } };
  return (
    <>
      <PageHead title="Raio-X" desc="Duas leituras: o seu perfil em seis partes, e um post seu comparado com a mediana." />
      <div className="card" style={{ marginBottom: 14 }}>
        <h2>Raio-X do perfil</h2>
        <div className="field"><label htmlFor="hl">Seus destaques, separados por vírgula (a API do Instagram não os entrega)</label><input id="hl" value={highlights} onChange={(e) => setHighlights(e.target.value)} /></div>
        <button className="btn primary" onClick={profile} disabled={busy}>{busy ? "Lendo..." : "Raio-X do perfil"}</button>
      </div>
      <h2>Raio-X de um post</h2>
      <div className="card">
        <div className="field"><label htmlFor="p">Post</label><select id="p" value={id} onChange={(e) => setId(e.target.value)}>{posts.map((p: any) => <option key={p.id} value={p.id}>{fmtShort(p.publishedAt)} · {(p.caption || "(sem legenda)").slice(0, 60)}</option>)}</select></div>
        <button className="btn primary" onClick={go} disabled={busy || !id}>{busy ? "Analisando..." : "Fazer raio-x"}</button>
      </div>
      {rows.map((x: any) => x.kind === "perfil" ? (
        <div key={x.id} className="card" style={{ marginTop: 14 }}>
          <h3>Perfil</h3>
          {x.parts.map((q: any) => <div key={q.part} style={{ margin: "12px 0" }}><div className="row"><b>{q.part}</b><span className={"tag " + (q.status === "bom" ? "green" : "yellow")}>{q.status}</span></div><div className="muted small" style={{ whiteSpace: "pre-line" }}>{q.read}</div><div>{q.advice}</div></div>)}
        </div>
      ) : (
        <div key={x.id} className="card" style={{ marginTop: 14 }}>
          <table className="tbl"><thead><tr><th>Métrica</th><th>Valor</th><th>vs. mediana</th></tr></thead><tbody>{x.rows.map((m: any) => <tr key={m.k}><td>{m.k}</td><td>{m.v.toLocaleString("pt-BR")}</td><td>{String(m.x).replace(".", ",")}x</td></tr>)}</tbody></table>
          <ul>{x.notes.map((n: string, i: number) => <li key={i}>{n}</li>)}</ul>
        </div>
      ))}
      {node}
    </>
  );
}
