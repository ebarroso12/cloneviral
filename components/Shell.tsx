"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";

const NAV: { phase?: string; n?: number; ex?: boolean; items: { href: string; label: string; ic: string; soon?: boolean }[] }[] = [
  { items: [{ href: "/metricas", label: "Métricas", ic: "▦" }] },
  { n: 1, phase: "CONFIGURAR", items: [{ href: "/conexoes", label: "Conexões", ic: "⚙" }, { href: "/persona", label: "Persona", ic: "☺" }, { href: "/meu-negocio", label: "Meu Negócio", ic: "▤" }, { href: "/identidade-visual", label: "Identidade Visual", ic: "◐" }] },
  { n: 2, phase: "PLANEJAR", items: [{ href: "/varredura", label: "Varredura", ic: "◎" }, { href: "/noticias", label: "Notícias", ic: "☰" }, { href: "/ideias", label: "Ideias", ic: "✦" }] },
  { n: 3, phase: "CRIAR", items: [{ href: "/roteiro", label: "Roteiro", ic: "✎" }, { href: "/carrossel", label: "Carrossel", ic: "▣" }, { href: "/serie", label: "Série", ic: "≡" }, { href: "/isca", label: "Isca de Alto Valor", ic: "⬇" }, { href: "#", label: "Cortes", ic: "✂", soon: true }] },
  { n: 4, phase: "PUBLICAR", items: [{ href: "/planejador-editorial", label: "Planejador Editorial", ic: "▦" }] },
  { phase: "EXCLUSIVOS", ex: true, items: [{ href: "/meu-perfil-pronto", label: "Perfil Pronto", ic: "★" }, { href: "/clube", label: "Clube Radar", ic: "◌" }] },
];

export default function Shell({ owner, handle, user, children }: { owner?: boolean; handle?: string; user: { name: string; email: string }; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const pop = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (menu && !pop.current?.contains(e.target as Node) && !(e.target as HTMLElement).closest(".avatar")) setMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menu]);
  return (
    <div className="shell">
      <aside className={"sidebar" + (open ? " open" : "")} aria-label="Menu de navegação">
        <Link href="/metricas" className="brand" aria-label="Radar Viral, ir para Métricas">
          <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden><circle cx="17" cy="17" r="15" fill="none" stroke="url(#lg)" strokeWidth="2.5" /><circle cx="17" cy="17" r="8" fill="none" stroke="#4da3ff" strokeWidth="2" /><path d="M17 17 L27 9" stroke="#ff4fa3" strokeWidth="2.5" strokeLinecap="round" /><circle cx="17" cy="17" r="2.4" fill="#fff" /><defs><linearGradient id="lg"><stop stopColor="#4da3ff" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs></svg>
          <span>Radar <b>Viral</b><small>sua máquina de conteúdo</small></span>
        </Link>
        {NAV.map((g, gi) => (
          <div key={gi}>
            {g.phase && <div className={"phase" + (g.ex ? " ex" : "")}>{g.n ? <i>{g.n}</i> : <i>★</i>}{g.phase}</div>}
            {g.items.map((it) => it.soon ? (
              <div key={it.label} className="nav-item soon" aria-disabled="true"><span className="ic" aria-hidden>{it.ic}</span>{it.label}<span className="badge">Em breve</span></div>
            ) : (
              <Link key={it.href} href={it.href} className={"nav-item" + (path === it.href || path.startsWith(it.href + "/") ? " active" : "")}><span className="ic" aria-hidden>{it.ic}</span>{it.label}</Link>
            ))}
          </div>
        ))}
      </aside>
      <div className="main">
        <div className="topbar">
          <button className="btn sm menu-btn" onClick={() => setOpen((o) => !o)} aria-label={open ? "Fechar menu" : "Abrir menu"}>☰</button>
          <span />
          <div>
            <button className="avatar" aria-label={`Conta: ${user.name} (${user.email})`} onClick={() => setMenu((m) => !m)}>{user.name.charAt(0).toUpperCase()}</button>
            {menu && (
              <div className="pop" ref={pop} role="menu">
                <b>{user.name}</b><div className="muted small">{user.email}</div>
                <hr />
                {handle && <a className="nav-item" role="menuitem" href={`https://www.instagram.com/${encodeURIComponent(handle)}/`} target="_blank" rel="noreferrer">Ver o meu perfil</a>}
                {owner && <Link href="/convites" className="nav-item" role="menuitem">Convidar pessoas</Link>}
                <Link href="/conta" className="nav-item" role="menuitem">Minha conta</Link>
                <button className="nav-item" style={{ width: "100%", background: "none", color: "inherit", font: "inherit", textAlign: "left", cursor: "pointer" }} role="menuitem" onClick={async () => { await api("/api/auth/logout", { method: "POST", body: {} }); router.push("/login"); router.refresh(); }}><span aria-hidden>↪ </span>Sair</button>
              </div>
            )}
          </div>
        </div>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
