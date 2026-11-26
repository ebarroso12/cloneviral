// Raio-X do Perfil: seis partes, só com o que foi lido da conta ou informado. O que não dá para ler, manda conferir.
import type { Business } from "./ai";

export type XrayPart = { part: "Foto" | "Nome" | "Usuário" | "Bio" | "Link" | "Destaques"; status: "bom" | "ajustar" | "conferir"; read: string; advice: string };
type Profile = { name?: string; igUsername?: string; bio?: string; link?: string; picture?: string };

export function profileXray(p: Profile, extra: { highlights?: string }, business?: Partial<Business>): XrayPart[] {
  const name = (p.name ?? "").trim();
  const user = (p.igUsername ?? "").trim();
  const bio = (p.bio ?? "").trim();
  const link = (p.link ?? "").trim();
  const highlights = (extra.highlights ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const part = (part: XrayPart["part"], status: XrayPart["status"], read: string, advice: string): XrayPart => ({ part, status, read, advice });

  const nameOk = /[|·\-–]/.test(name) && name.length >= 12;
  const userIssues = [/\d{3,}/.test(user) && "tirar a sequência de números", (user.match(/[._]/g)?.length ?? 0) > 1 && "usar no máximo um ponto ou sublinhado", user.length > 20 && "encurtar"].filter(Boolean) as string[];
  const cta = /(link|clique|agende|comente|mande|chame|baixe|acesse|fale)/i.test(bio) || (!!business?.voice?.cta && bio.includes(business.voice.cta));
  const bioIssues = [bio.length < 60 && "dizer para quem é e o que a pessoa ganha", !cta && "fechar com um convite claro", bio.length > 150 && "caber em 150 caracteres"].filter(Boolean) as string[];

  return [
    part("Foto", "conferir", p.picture ? "foto lida da conta" : "nenhuma foto lida", "Não avalio a imagem. Confira se o rosto aparece nítido e ocupa a maior parte do círculo."),
    part("Nome", !name ? "ajustar" : nameOk ? "bom" : "ajustar", name || "vazio", nameOk ? "O nome já traz quem é e o que faz." : "Junte ao seu nome a palavra que a pessoa digitaria na busca, por exemplo: Ana Souza | Dentista."),
    part("Usuário", !user ? "conferir" : userIssues.length ? "ajustar" : "bom", user ? "@" + user : "não lido", userIssues.length ? `Vale ${userIssues.join(", ")}.` : "Curto e fácil de falar em voz alta."),
    part("Bio", bioIssues.length ? "ajustar" : "bom", bio || "vazia", bioIssues.length ? `Falta ${bioIssues.join("; ")}.` : "Tem promessa e convite dentro do limite."),
    part("Link", link ? "bom" : "ajustar", link || "sem link", link ? "Abra o link no celular e confira se leva ao que a bio promete." : "Coloque um link: é o único caminho clicável do perfil."),
    part("Destaques", highlights.length >= 3 ? "bom" : highlights.length ? "ajustar" : "conferir", highlights.join(", ") || "a API do Instagram não entrega os destaques", highlights.length >= 3 ? "Confira se o primeiro apresenta você a quem acabou de chegar." : "Monte ao menos três: por onde começar, resultados e como trabalhar com você."),
  ];
}
