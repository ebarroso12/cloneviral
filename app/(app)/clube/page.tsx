import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { PageHead } from "@/components/ui";
export const dynamic = "force-dynamic";
const ITEMS = [
  ["/clube/sala-de-analise", "Sala de análise", "Análise do seu perfil com os números medidos e o que ajustar."],
  ["/clube/raio-x", "Raio-X", "Escolha um post seu e veja por que ele foi bem ou mal."],
  ["/clube/stories", "Assistente de Stories", "Sequências em cinco formatos, com ajuste por pedido quando há IA."],
  ["/clube/prontos", "32 roteiros prontos", "Modelos para completar com o seu assunto e gravar."],
  ["/clube/roteiros", "Roteiros do clube", "Todos os seus roteiros num lugar só, por tipo."],
];
export default async function Page() {
  await requireUser();
  return (
    <>
      <PageHead title="Clube Radar" desc="Ferramentas extras para quem já está criando toda semana." />
      <div className="grid g2">{ITEMS.map(([h, t, d]) => <Link key={h} href={h} className="card" style={{ display: "block" }}><b>{t}</b><p className="muted small">{d}</p></Link>)}</div>
    </>
  );
}
