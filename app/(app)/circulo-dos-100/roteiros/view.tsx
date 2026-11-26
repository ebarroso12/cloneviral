"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHead, useToast } from "@/components/ui";
import { ScriptCard } from "@/components/ScriptCard";

export default function View({ rows }: { rows: any[] }) {
  const r = useRouter();
  const { toast, node } = useToast();
  const [f, setF] = useState("todos");
  const [rec, setRec] = useState("todos");
  const list = rows.filter((s) => (f === "todos" || s.type === f) && (rec === "todos" || (rec === "gravados") === !!s.recorded));
  return (
    <>
      <PageHead title="Roteiros do círculo" desc="Todos os roteiros que você criou, de qualquer origem, com filtro por tipo e por gravados." />
      <div className="chips" style={{ marginBottom: 8 }}>{["todos", "viral", "emocional", "tecnico"].map((k) => <button key={k} className="chip" aria-pressed={f === k} onClick={() => setF(k)}>{k}</button>)}</div>
      <div className="chips" style={{ marginBottom: 14 }}>{["todos", "gravados", "a gravar"].map((k) => <button key={k} className="chip" aria-pressed={rec === k} onClick={() => setRec(k === "a gravar" ? "agravar" : k)}>{k}</button>)}</div>
      {list.length === 0 ? <div className="empty">Nenhum roteiro com esse filtro.</div> : list.map((s) => <ScriptCard key={s.id} s={s} onChange={() => r.refresh()} onToast={toast} />)}
      {node}
    </>
  );
}
