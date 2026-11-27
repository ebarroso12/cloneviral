"use client";
import { useMemo } from "react";
import { PageHead, useToast } from "@/components/ui";

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
export default function PerfilView({ business: b, persona: p, conn }: any) {
  const { toast, node } = useToast();
  const kit = useMemo(() => {
    if (!b) return null;
    const method = (b.method || "").split(/,| e /).map((x: string) => x.trim()).filter(Boolean);
    const desejo = (p?.answers?.desejo || "").replace(/\.$/, "");
    const bios = [
      `${cap(desejo || b.focus || "Ajudo você a avançar")}.\n${b.brand ? b.brand + " | " : ""}${b.voice?.cta || "Link abaixo"}`.slice(0, 150),
      `${b.differentiator ? cap(b.differentiator.replace(/\.$/, "")) : "Método simples e direto"}.\n${b.voice?.cta || "Comece pelo link"}`.slice(0, 150),
      `${b.name || ""}${b.brand ? " · " + b.brand : ""}\n${method.length ? method.join(" · ") : "Clareza · Constância · Convite"}`.slice(0, 150),
    ];
    const highlights = ["Comece aqui", ...(method.length ? method.map(cap) : ["Método"]), "Resultados", "Perguntas", "Como trabalhar comigo"].slice(0, 6);
    const pinned = [`Quem sou eu e para quem é o ${b.brand || "meu trabalho"}`, `O erro que mais vejo: ${(p?.answers?.dor || "falta de clareza").toLowerCase()}`, `Como funciona ${b.brand || "o método"} em 60 segundos`];
    const checks = [
      ["Foto de perfil com rosto nítido", false], ["Nome com a palavra que a pessoa procura", !!b.brand], ["Bio com promessa e chamada", !!b.voice?.cta], ["Link na bio funcionando", !!conn?.link],
      ["3 posts fixados", false], ["Destaques com capas padronizadas", false],
    ] as [string, boolean][];
    return { bios, highlights, pinned, checks };
  }, [b, p, conn]);
  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); toast("Copiado."); } catch { toast("Não consegui copiar.", "err"); } };
  if (!kit) return <><PageHead title="Meu perfil pronto" /><div className="empty">Preencha <a href="/meu-negocio">Meu Negócio</a> primeiro: o perfil é montado em cima dele.</div></>;
  return (
    <>
      <PageHead title="Meu perfil pronto" desc="Bio, destaques e posts fixados montados a partir do seu negócio e da sua persona." />
      <div className="card" style={{ marginBottom: 14 }}><h2>Sugestões de bio</h2>{kit.bios.map((t: string, i: number) => <div key={i} className="row between" style={{ margin: "10px 0", alignItems: "flex-start" }}><div style={{ whiteSpace: "pre-line" }}>{t}<div className="muted tiny">{t.length}/150</div></div><button className="btn sm" onClick={() => copy(t)}>Copiar</button></div>)}</div>
      <div className="grid g2">
        <div className="card"><h2>Destaques</h2><div className="chips" style={{ marginTop: 10 }}>{kit.highlights.map((h: string) => <span key={h} className="tag">{h}</span>)}</div></div>
        <div className="card"><h2>Posts para fixar</h2><ol>{kit.pinned.map((t: string) => <li key={t}>{t}</li>)}</ol></div>
      </div>
      <div className="card" style={{ marginTop: 14 }}><h2>Checklist do perfil</h2><ul style={{ listStyle: "none", padding: 0 }}>{kit.checks.map(([t, ok]) => <li key={t} style={{ margin: "8px 0" }}><span className={"tag " + (ok ? "green" : "yellow")}>{ok ? "ok" : "revisar"}</span> {t}</li>)}</ul></div>
      {node}
    </>
  );
}
