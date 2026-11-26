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
  const go = async () => { setBusy(true); try { await api("/api/circulo/raiox", { body: { postId: id } }); toast("Raio-X pronto."); r.refresh(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } };
  return (
    <>
      <PageHead title="Raio-X" desc="Compara um post seu com a mediana do seu perfil e diz o que explicou o resultado." />
      <div className="card">
        <div className="field"><label htmlFor="p">Post</label><select id="p" value={id} onChange={(e) => setId(e.target.value)}>{posts.map((p: any) => <option key={p.id} value={p.id}>{fmtShort(p.publishedAt)} · {(p.caption || "(sem legenda)").slice(0, 60)}</option>)}</select></div>
        <button className="btn primary" onClick={go} disabled={busy || !id}>{busy ? "Analisando..." : "Fazer raio-x · 1 crédito"}</button>
      </div>
      {rows.map((x: any) => (
        <div key={x.id} className="card" style={{ marginTop: 14 }}>
          <table className="tbl"><thead><tr><th>Métrica</th><th>Valor</th><th>vs. mediana</th></tr></thead><tbody>{x.rows.map((m: any) => <tr key={m.k}><td>{m.k}</td><td>{m.v.toLocaleString("pt-BR")}</td><td>{String(m.x).replace(".", ",")}x</td></tr>)}</tbody></table>
          <ul>{x.notes.map((n: string, i: number) => <li key={i}>{n}</li>)}</ul>
        </div>
      ))}
      {node}
    </>
  );
}
