import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { PageHead } from "@/components/ui";
export const dynamic = "force-dynamic";
const ITEMS = [
  ["/clube/sala-de-analise", "Sala de análise", "Análise do seu perfil com os números medidos e o que ajustar.", "2 créditos"],
  ["/clube/raio-x", "Raio-X", "Escolha um post seu e veja por que ele foi bem ou mal.", "1 crédito"],
  ["/clube/stories", "Stories em sequência", "Sequência de 5 stories com começo, virada e convite.", "1 crédito"],
  ["/clube/roteiros", "Roteiros do clube", "Todos os seus roteiros num lugar só, por tipo.", "Grátis"],
];
export default async function Page() {
  await requireUser();
  return (
    <>
      <PageHead title="Clube Radar" desc="Ferramentas extras para quem já está criando toda semana." />
      <div className="grid g2">{ITEMS.map(([h, t, d, c]) => <Link key={h} href={h} className="card" style={{ display: "block" }}><div className="row between"><b>{t}</b><span className="tag">{c}</span></div><p className="muted small">{d}</p></Link>)}</div>
    </>
  );
}
