"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { Modal } from "@/components/ui";

export const TYPE_NAME: Record<string, string> = { viral: "Viral", emocional: "Emocional", tecnico: "Técnico" };
export const fullText = (s: any) => `${s.title}\n\nGancho: ${s.hook}\n\n${s.body}\n\nCTA: ${s.cta}`;

export function ScriptCard({ s, onChange, onToast }: { s: any; onChange: () => void; onToast: (m: string, k?: "ok" | "err") => void }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [tele, setTele] = useState(false);
  const [d, setD] = useState(s);
  const [speed, setSpeed] = useState(3);
  const patch = async (b: any) => { try { await api(`/api/c/scripts?id=${s.id}`, { method: "PATCH", body: b }); onChange(); } catch (e: any) { onToast(e.message, "err"); } };
  const copy = async () => { try { await navigator.clipboard.writeText(fullText(s)); onToast("Roteiro copiado."); } catch { onToast("Não consegui copiar. Selecione o texto e copie.", "err"); } };
  const del = async () => { if (!confirm("Excluir este roteiro?")) return; try { await api(`/api/c/scripts?id=${s.id}`, { method: "DELETE" }); onChange(); } catch (e: any) { onToast(e.message, "err"); } };
  const regen = async () => {
    try { await api("/api/ai/scripts", { body: { type: s.type, dest: s.dest, theme: s.title, seconds: s.seconds, replaceId: s.id } }); onToast("Roteiro refeito. Custou 1 crédito."); onChange(); } catch (e: any) { onToast(e.message, "err"); }
  };
  const save = async () => { await patch({ title: d.title, hook: d.hook, body: d.body, cta: d.cta }); setEdit(false); onToast("Roteiro salvo."); };
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="row between wrap">
        <div className="row"><span className="tag">{TYPE_NAME[s.type] ?? s.type}</span><span className="tag">{s.dest === "reel" ? "Reel" : "Criativo"} · {s.seconds}s</span>{s.recorded && <span className="tag green">Gravado</span>}</div>
        <div className="row wrap">
          <button className="btn sm" onClick={() => setOpen(!open)}>{open ? "Fechar" : "Abrir"}</button>
          <button className="btn sm" onClick={() => { setD(s); setEdit(true); setOpen(true); }}>Editar</button>
          <button className="btn sm" onClick={copy}>Copiar</button>
          <button className="btn sm" onClick={() => setTele(true)}>Teleprompter</button>
          <button className="btn sm" onClick={() => patch({ recorded: !s.recorded })}>{s.recorded ? "Desmarcar gravado" : "Já gravei"}</button>
          <a className="btn sm" href={`/api/pdf/script/${s.id}`} target="_blank" rel="noreferrer">PDF</a>
          <button className="btn sm" onClick={regen}>Regenerar · 1 crédito</button>
          <button className="btn sm danger" onClick={del}>Excluir</button>
        </div>
      </div>
      <h3 style={{ margin: "10px 0 4px" }}>{s.title}</h3>
      <p className="muted" style={{ margin: 0 }}>{s.hook}</p>
      {open && !edit && <div style={{ marginTop: 10, whiteSpace: "pre-line" }}>{s.body}<p style={{ marginTop: 10 }}><b>CTA:</b> {s.cta}</p></div>}
      {open && edit && (
        <div style={{ marginTop: 12 }}>
          {(["title", "hook", "body", "cta"] as const).map((k) => <div className="field" key={k}><label>{{ title: "Título", hook: "Gancho", body: "Roteiro", cta: "CTA" }[k]}</label>{k === "body" ? <textarea style={{ minHeight: 160 }} value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} /> : <input value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} />}</div>)}
          <div className="row"><button className="btn primary" onClick={save}>Salvar</button><button className="btn" onClick={() => setEdit(false)}>Cancelar</button></div>
        </div>
      )}
      {tele && (
        <Modal onClose={() => setTele(false)} title="Teleprompter">
          <div className="row" style={{ marginBottom: 10 }}><label htmlFor="sp" className="muted small">Tamanho</label><input id="sp" type="range" min={1} max={6} value={speed} onChange={(e) => setSpeed(+e.target.value)} style={{ width: 160 }} /></div>
          <div style={{ fontSize: 16 + speed * 6, lineHeight: 1.5, maxHeight: "60vh", overflow: "auto", whiteSpace: "pre-line", textAlign: "center" }}>{`${s.hook}\n\n${s.body}\n\n${s.cta}`}</div>
        </Modal>
      )}
    </div>
  );
}
