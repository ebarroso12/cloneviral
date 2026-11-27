"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { Bar, PageHead, useToast } from "@/components/ui";

const Q: [string, string, string][] = [
  ["cliente", "Quem é o seu cliente ideal?", "Idade, o que faz, o que já tentou."],
  ["dor", "Qual é a maior dor dele?", "Em uma frase, do jeito que ele falaria."],
  ["desejo", "O que ele mais deseja?", "O resultado que ele quer ver na vida."],
  ["objecao", "Qual objeção ele tem para comprar?", "O que ele diz para não decidir."],
  ["decisao", "Como ele decide?", "O que precisa ver ou ouvir antes de comprar."],
];

export default function PersonaView({ initial }: { initial: any }) {
  const r = useRouter();
  const { toast, node } = useToast();
  const [a, setA] = useState<Record<string, string>>(initial?.answers ?? {});
  const [doc, setDoc] = useState<string>(initial?.document ?? "");
  const [busy, setBusy] = useState(false);
  const filled = Q.filter(([k]) => (a[k] ?? "").trim().length > 8).length;
  const pct = Math.round((filled / Q.length) * 100);
  const gen = async () => {
    setBusy(true);
    try { const p = await api("/api/ai/persona", { body: { answers: a } }); setDoc(p.document); toast("Persona criada."); r.refresh(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHead title="Persona" desc="Aqui mora quem é o seu cliente: dor, desejo, objeção e o jeito dele decidir. É a primeira coisa a responder no app, porque é este material que faz tudo que o app escreve falar com uma pessoa específica, e não com todo mundo." />
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row between"><b>{pct === 100 ? "Afinada" : "Em construção"}</b><span className="muted">{pct}%</span></div>
        <Bar pct={pct} green={pct === 100} />
        <p className="muted small" style={{ marginTop: 8 }}>{pct === 100 ? "A sua persona sai falando do seu nicho e do seu público, com as suas palavras." : `Faltam ${Q.length - filled} respostas para afinar a persona.`}</p>
      </div>
      <div className="card">
        {Q.map(([k, label, hint]) => (
          <div className="field" key={k}><label htmlFor={k}>{label} <span className="dim">· {hint}</span></label><textarea id={k} value={a[k] ?? ""} onChange={(e) => setA({ ...a, [k]: e.target.value })} /></div>
        ))}
        <div className="row"><button className="btn primary" onClick={gen} disabled={busy}>{busy ? "Criando..." : initial ? "Criar uma nova persona" : "Criar persona"}</button><span className="muted small">As respostas ficam salvas ao criar.</span></div>
      </div>
      {doc && <div className="card" style={{ marginTop: 14 }}><h3>Persona criada</h3><div className="muted tiny" style={{ marginBottom: 8 }}>{doc.length.toLocaleString("pt-BR")} caracteres</div><pre style={{ whiteSpace: "pre-wrap", font: "inherit", margin: 0 }}>{doc}</pre></div>}
      {node}
    </>
  );
}
