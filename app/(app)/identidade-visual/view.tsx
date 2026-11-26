"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { PageHead, useToast } from "@/components/ui";
import { slideSvg } from "@/lib/slide";

export const FONTS: [string, string][] = [["Moderna", "Inter, system-ui, sans-serif"], ["Editorial", "Georgia, 'Times New Roman', serif"], ["Amigável", "'Trebuchet MS', system-ui, sans-serif"], ["Clássica", "'Palatino Linotype', Georgia, serif"]];
const PRESETS: [string, string, string, string][] = [["Noite", "#0f172a", "#f8fafc", "#38bdf8"], ["Areia", "#fdf6ec", "#2b2118", "#e76f51"], ["Floresta", "#052e2b", "#ecfdf5", "#34d399"], ["Ameixa", "#3b0764", "#faf5ff", "#e879f9"], ["Rosa", "#fff1f2", "#4c0519", "#e11d48"]];
const STEPS = ["Nome", "Cores", "Fonte", "Tom", "Revisar"];

export default function IdentidadeView({ initial }: { initial: any }) {
  const { toast, node } = useToast();
  const [step, setStep] = useState(0);
  const [k, setK] = useState<any>(initial ?? { name: "", bg: "#0f172a", fg: "#f8fafc", accent: "#38bdf8", font: FONTS[0][1], tone: "acolhedor", applied: false });
  const [saved, setSaved] = useState(!!initial);
  const look = { bg: k.bg, fg: k.fg, accent: k.accent, muted: k.fg + "aa", font: k.font };
  const svg = slideSvg({ role: "capa", title: k.name || "Seu nome aqui", text: "" }, 0, 7, look, k.name ? "@" + k.name.toLowerCase().replace(/\s+/g, "") : "");
  const save = async (applied: boolean) => { try { await api("/api/c/brand_kit", { body: { ...k, applied } }); setK({ ...k, applied }); setSaved(true); toast(applied ? "Identidade aplicada aos próximos carrosséis." : "Identidade salva."); } catch (e: any) { toast(e.message, "err"); } };
  const contrast = (a: string, b: string) => { const l = (h: string) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); }; const [x, y] = [l(a), l(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const cr = contrast(k.bg, k.fg);
  return (
    <>
      <PageHead title="Identidade visual" desc="Cinco passos para o app desenhar os seus carrosséis com as suas cores, a sua fonte e o seu jeito. Depois de aplicada, vale para todo carrossel novo." />
      <div className="chips" style={{ marginBottom: 14 }}>{STEPS.map((s, i) => <button key={s} className="chip" aria-pressed={step === i} onClick={() => setStep(i)}>{i + 1}. {s}</button>)}</div>
      <div className="grid g2">
        <div className="card">
          {step === 0 && <div className="field"><label htmlFor="n">Nome que aparece nos slides</label><input id="n" value={k.name} onChange={(e) => setK({ ...k, name: e.target.value })} placeholder="Ex.: Marina Costa" /></div>}
          {step === 1 && <>
            <div className="field"><label>Paletas prontas</label><div className="chips">{PRESETS.map(([n, bg, fg, ac]) => <button key={n} className="chip" onClick={() => setK({ ...k, bg, fg, accent: ac })}><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 6, background: ac, marginRight: 6 }} />{n}</button>)}</div></div>
            {([["bg", "Fundo"], ["fg", "Texto"], ["accent", "Destaque"]] as const).map(([f, l]) => <div className="field" key={f}><label htmlFor={f}>{l}</label><input id={f} type="color" value={k[f]} onChange={(e) => setK({ ...k, [f]: e.target.value })} style={{ height: 44 }} /></div>)}
            <p className={"small " + (cr >= 4.5 ? "" : "err")}>Contraste texto e fundo: {cr.toFixed(1)}:1 {cr >= 4.5 ? "(legível)" : "(baixo: o texto pode ficar difícil de ler)"}</p>
          </>}
          {step === 2 && <div className="field"><label>Fonte</label><div className="chips">{FONTS.map(([n, f]) => <button key={n} className="chip" style={{ fontFamily: f }} aria-pressed={k.font === f} onClick={() => setK({ ...k, font: f })}>{n}</button>)}</div></div>}
          {step === 3 && <div className="field"><label>Tom dos textos</label><div className="chips">{["acolhedor", "direto", "técnico", "provocador"].map((t) => <button key={t} className="chip" aria-pressed={k.tone === t} onClick={() => setK({ ...k, tone: t })}>{t}</button>)}</div></div>}
          {step === 4 && <><p>Tudo certo? A pré-visualização ao lado é a capa dos seus carrosséis.</p><div className="row wrap"><button className="btn primary" onClick={() => save(true)}>Aplicar identidade</button><button className="btn" onClick={() => save(false)}>Só salvar</button>{k.applied && <button className="btn danger" onClick={() => save(false)}>Parar de aplicar</button>}</div></>}
          <div className="row" style={{ marginTop: 16 }}>{step > 0 && <button className="btn" onClick={() => setStep(step - 1)}>Voltar</button>}{step < 4 && <button className="btn primary" onClick={() => setStep(step + 1)}>Continuar</button>}</div>
          {saved && <p className="muted tiny" style={{ marginTop: 10 }}>{k.applied ? "Identidade aplicada." : "Identidade salva, ainda não aplicada."}</p>}
        </div>
        <div className="card" aria-label="Pré-visualização"><div style={{ maxWidth: 320, margin: "0 auto" }} dangerouslySetInnerHTML={{ __html: svg.replace(/width="1080" height="1440"/, 'width="100%"') }} /></div>
      </div>
      {node}
    </>
  );
}
