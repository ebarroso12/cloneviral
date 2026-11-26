"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/lib/client";
import { Modal, PageHead, useToast } from "@/components/ui";
import { slideSvg, svgToPng, type Look } from "@/lib/slide";

const LANGS = [["pt-BR", "Português"], ["en", "English"], ["es", "Español"]];
export default function CarrosselView({ list, kit, patterns, models, cats, handle }: any) {
  const r = useRouter();
  const { toast, node } = useToast();
  const [theme, setTheme] = useState("");
  const [modelId, setModelId] = useState<string>("");
  const [patternId, setPatternId] = useState("");
  const [lang, setLang] = useState("pt-BR");
  const [useBrand, setUseBrand] = useState(!!kit?.applied);
  const [imgMode, setImgMode] = useState("color");
  const [photo, setPhoto] = useState<string>("");
  // reduz a foto no navegador para 1080x1440 antes de enviar
  const pickPhoto = async (file: File) => {
    try {
      if (!/^image\/(png|jpeg)$/.test(file.type)) throw new Error("Use uma foto PNG ou JPEG.");
      const img = await createImageBitmap(file);
      const cv = document.createElement("canvas");
      cv.width = 1080; cv.height = 1440;
      const k = Math.max(cv.width / img.width, cv.height / img.height);
      cv.getContext("2d")!.drawImage(img, (cv.width - img.width * k) / 2, (cv.height - img.height * k) / 2, img.width * k, img.height * k);
      setPhoto(cv.toDataURL("image/jpeg", 0.82));
    } catch (e: any) { toast(e.message || "Não consegui ler essa foto.", "err"); }
  };
  const [picker, setPicker] = useState(false);
  const [cat, setCat] = useState(cats[0].name);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(list[0]?.id ?? null);
  const model = models.find((m: any) => m.id === modelId);
  const byCat = useMemo(() => models.filter((m: any) => m.category === cat), [models, cat]);
  const lookFor = (c: any): Look => {
    const m = models.find((x: any) => x.id === c.modelId);
    if (c.brandApplied && kit) return { bg: kit.bg, fg: kit.fg, accent: kit.accent, muted: kit.fg + "aa", font: kit.font };
    return m ? { ...m.palette, font: m.font } : { bg: "#0f172a", fg: "#f8fafc", accent: "#38bdf8", muted: "#94a3b8", font: "Inter, system-ui, sans-serif" };
  };
  const go = async () => {
    setBusy(true);
    try { const c = await api("/api/ai/carousel", { body: { theme, modelId: modelId || undefined, patternId: patternId || undefined, language: lang, imageMode: imgMode, coverImage: imgMode === "photo" ? photo : undefined } }); if (!useBrand && c.brandApplied) await api(`/api/c/carousels?id=${c.id}`, { method: "PATCH", body: { brandApplied: false } }); setOpenId(c.id); toast("Carrossel criado."); r.refresh(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  };
  const edit = async (c: any, i: number, f: "title" | "text", v: string) => { const slides = c.slides.map((s: any, j: number) => (j === i ? { ...s, [f]: v } : s)); await api(`/api/c/carousels?id=${c.id}`, { method: "PATCH", body: { slides, approved: false } }); r.refresh(); };
  const approve = async (c: any) => { await api(`/api/c/carousels?id=${c.id}`, { method: "PATCH", body: { approved: !c.approved } }); r.refresh(); };
  const del = async (c: any) => { if (confirm("Excluir este carrossel?")) { await api(`/api/c/carousels?id=${c.id}`, { method: "DELETE" }); r.refresh(); } };
  const dl = async (c: any, i: number) => { try { const b = await svgToPng(slideSvg(c.slides[i], i, c.slides.length, lookFor(c), handle, c.coverImage)); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `carrossel-${i + 1}.png`; a.click(); URL.revokeObjectURL(a.href); } catch (e: any) { toast(e.message, "err"); } };
  const dlAll = async (c: any) => { for (let i = 0; i < c.slides.length; i++) { await dl(c, i); await new Promise((x) => setTimeout(x, 250)); } };
  return (
    <>
      <PageHead title="Carrossel" desc="Escolha o tema e um modelo. O app escreve os slides com a sua voz e desenha cada um em 1080 por 1440. Você revisa, aprova e baixa." />
      <div className="card">
        <div className="field"><label htmlFor="t">Tema</label><input id="t" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Ex.: 3 erros ao precificar um serviço" /></div>
        <div className="grid g3">
          <div className="field"><label>Modelo</label><button className="btn" onClick={() => setPicker(true)}>{model ? `${model.title} · ${model.slides} slides` : "Escolher entre 100 modelos"}</button></div>
          <div className="field"><label htmlFor="p">Padrão de um post seu</label><select id="p" value={patternId} onChange={(e) => setPatternId(e.target.value)}><option value="">Nenhum</option>{patterns.map((p: any) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
          <div className="field"><label htmlFor="l">Idioma</label><select id="l" value={lang} onChange={(e) => setLang(e.target.value)}>{LANGS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        </div>
        <div className="row wrap" style={{ marginBottom: 12 }}>
          <label className="row small"><input type="checkbox" style={{ width: "auto" }} checked={useBrand} disabled={!kit?.applied} onChange={(e) => setUseBrand(e.target.checked)} /> Usar minha identidade visual {!kit?.applied && <a href="/identidade-visual">(configurar)</a>}</label>
          <div className="chips">{[["color", "Fundo de cor"], ["photo", "Com foto na capa"]].map(([k, v]) => <button key={k} className="chip" aria-pressed={imgMode === k} onClick={() => setImgMode(k)}>{v}</button>)}</div>
        </div>
        {imgMode === "photo" && <div className="field"><label htmlFor="foto">Foto da capa (PNG ou JPEG, sem crédito extra)</label><input id="foto" type="file" accept="image/png,image/jpeg" onChange={(e) => e.target.files?.[0] && pickPhoto(e.target.files[0])} />{photo && <span className="tiny muted">Foto pronta.</span>}</div>}
        <button className="btn primary" onClick={go} disabled={busy || !theme.trim() || (imgMode === "photo" && !photo)}>{busy ? "Criando..." : "Criar carrossel · 2 créditos"}</button>
      </div>
      <h2 style={{ margin: "22px 0 10px" }}>Seus carrosséis</h2>
      {list.length === 0 && <div className="empty">Nenhum carrossel criado.</div>}
      {list.map((c: any) => (
        <div key={c.id} className="card" style={{ marginBottom: 12 }}>
          <div className="row between wrap"><button className="btn ghost" aria-expanded={openId === c.id} onClick={() => setOpenId(openId === c.id ? null : c.id)}>{openId === c.id ? "▾" : "▸"} {c.theme}</button><div className="row">{c.approved && <span className="tag green">Aprovado</span>}<button className="btn sm" onClick={() => approve(c)}>{c.approved ? "Desaprovar" : "Aprovar"}</button><button className="btn sm" onClick={() => dlAll(c)}>Baixar PNGs</button><button className="btn sm danger" onClick={() => del(c)}>Excluir</button></div></div>
          {openId === c.id && (
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", marginTop: 12 }}>
              {c.slides.map((s: any, i: number) => (
                <div key={i}>
                  <div dangerouslySetInnerHTML={{ __html: slideSvg(s, i, c.slides.length, lookFor(c), handle, c.coverImage).replace(/width="1080" height="1440"/, 'width="100%"') }} style={{ borderRadius: 10, overflow: "hidden" }} />
                  <input aria-label={`Título do slide ${i + 1}`} defaultValue={s.title} onBlur={(e) => e.target.value !== s.title && edit(c, i, "title", e.target.value)} style={{ marginTop: 6 }} />
                  <textarea aria-label={`Texto do slide ${i + 1}`} defaultValue={s.text} onBlur={(e) => e.target.value !== s.text && edit(c, i, "text", e.target.value)} style={{ minHeight: 60, marginTop: 6 }} />
                  <button className="btn sm" onClick={() => dl(c, i)}>Baixar PNG</button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {picker && (
        <Modal onClose={() => setPicker(false)} title="Escolha um modelo">
          <div className="chips" style={{ marginBottom: 12 }}>{cats.map((c: any) => <button key={c.name} className="chip" aria-pressed={cat === c.name} onClick={() => setCat(c.name)}>{c.name} ({c.count})</button>)}</div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", maxHeight: "55vh", overflow: "auto" }}>
            {byCat.map((m: any) => <button key={m.id} className="card" style={{ textAlign: "left", cursor: "pointer", borderColor: m.id === modelId ? "var(--accent)" : undefined }} onClick={() => { setModelId(m.id); setPicker(false); }}><div style={{ height: 8, borderRadius: 4, background: m.palette.accent, marginBottom: 8 }} /><b className="small">{m.title}</b><div className="muted tiny">{m.slides} slides</div></button>)}
          </div>
          <div className="row" style={{ marginTop: 10 }}><button className="btn" onClick={() => { setModelId(""); setPicker(false); }}>Sem modelo</button></div>
        </Modal>
      )}
      {node}
    </>
  );
}
