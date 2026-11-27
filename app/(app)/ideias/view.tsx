"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { PageHead, useToast } from "@/components/ui";

const COLS: [string, string][] = [["ideia", "Ideias"], ["roteirizando", "Roteirizando"], ["gravado", "Gravado"], ["publicado", "Publicado"]];
export default function IdeiasView({ initial }: { initial: any[] }) {
  const { toast, node } = useToast();
  const [ideas, setIdeas] = useState(initial);
  const [text, setText] = useState("");
  const [over, setOver] = useState<string | null>(null);
  const add = async () => { if (!text.trim()) return; try { const n = await api("/api/c/ideas", { body: { text: text.trim(), status: "ideia" } }); setIdeas([...ideas, n]); setText(""); } catch (e: any) { toast(e.message, "err"); } };
  const move = async (id: string, status: string) => {
    const before = ideas;
    setIdeas(ideas.map((i) => (i.id === id ? { ...i, status } : i)));
    try { await api(`/api/c/ideas?id=${id}`, { method: "PATCH", body: { status } }); } catch (e: any) { setIdeas(before); toast(e.message, "err"); }
  };
  const toScript = async (id: string) => {
    try {
      const s = await api("/api/ideas/script", { body: { ideaId: id } });
      setIdeas((list) => list.map((i) => (i.id === id ? { ...i, status: "roteirizando", scriptId: s.id } : i)));
      toast("Roteiro criado. Ele está na tela Roteiro.");
    } catch (e: any) { toast(e.message, "err"); }
  };
  const del = async (id: string) => { setIdeas(ideas.filter((i) => i.id !== id)); await api(`/api/c/ideas?id=${id}`, { method: "DELETE" }); };
  return (
    <>
      <PageHead title="Ideias" desc="Anote a ideia antes que ela escape e arraste de coluna conforme o conteúdo avança." />
      <div className="row" style={{ marginBottom: 14 }}><input aria-label="Nova ideia" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Escreva uma ideia de conteúdo" /><button className="btn primary" onClick={add}>Adicionar</button></div>
      <div className="kanban">
        {COLS.map(([k, name], ci) => (
          <div key={k} className={"col" + (over === k ? " over" : "")} onDragOver={(e) => { e.preventDefault(); setOver(k); }} onDragLeave={() => setOver(null)} onDrop={(e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData("text/plain"); if (id) move(id, k); }} aria-label={name}>
            <div className="row between"><b>{name}</b><span className="muted tiny">{ideas.filter((i) => (i.status ?? "ideia") === k).length}</span></div>
            {ideas.filter((i) => (i.status ?? "ideia") === k).map((i) => (
              <div key={i.id} className="idea" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", i.id)}>
                {i.text}
                {i.scriptId ? <div style={{ marginTop: 6 }}><a className="tiny" href="/roteiro">Ver o roteiro</a></div> : <button className="btn sm" style={{ marginTop: 6 }} onClick={() => toScript(i.id)}>Virar roteiro</button>}
                <div className="row" style={{ marginTop: 6 }}>
                  {ci > 0 && <button className="btn sm ghost" aria-label="Mover para a coluna anterior" onClick={() => move(i.id, COLS[ci - 1][0])}>←</button>}
                  {ci < 3 && <button className="btn sm ghost" aria-label="Mover para a próxima coluna" onClick={() => move(i.id, COLS[ci + 1][0])}>→</button>}
                  <button className="btn sm ghost" aria-label="Excluir ideia" onClick={() => del(i.id)}>×</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      {node}
    </>
  );
}
