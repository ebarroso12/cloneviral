"use client";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client";
import { PageHead, useToast } from "@/components/ui";
import type { Ready } from "@/lib/readyScripts";

export default function View({ rows }: { rows: Ready[] }) {
  const { toast, node } = useToast();
  const [type, setType] = useState("todos");
  const use = async (n: number) => { try { await api("/api/clube/prontos", { body: { n } }); toast("Copiado para os seus roteiros."); } catch (e: any) { toast(e.message, "err"); } };
  return (
    <>
      <PageHead title="32 roteiros prontos" desc="Complete o que está entre colchetes com o seu assunto. Depois de copiar, edite em Roteiro." />
      <div className="chips" style={{ marginBottom: 14 }}>{[["todos", "Todos"], ["viral", "Viral"], ["emocional", "Emocional"], ["tecnico", "Técnico"]].map(([k, v]) => <button key={k} className="chip" aria-pressed={type === k} onClick={() => setType(k)}>{v}</button>)}</div>
      <p className="small"><Link href="/roteiro">Ver os meus roteiros</Link></p>
      {rows.filter((r) => type === "todos" || r.type === type).map((r) => (
        <details key={r.n} className="card" style={{ marginBottom: 10 }}>
          <summary><b>{r.n}. {r.title}</b> <span className="tag">{r.type}</span> <span className="muted tiny">{r.seconds} s</span></summary>
          <p><b>{r.hook}</b></p><p>{r.body}</p>
          <button className="btn sm primary" onClick={() => use(r.n)}>Usar este roteiro</button>
        </details>
      ))}
      {node}
    </>
  );
}
