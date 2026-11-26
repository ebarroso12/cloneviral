// Análise antes de postar: só o que dá para medir no texto e no arquivo. Não avalia imagem nem som.
export type Check = { item: string; status: "bom" | "ajustar" | "conferir"; advice: string };
const check = (item: string, status: Check["status"], advice: string): Check => ({ item, status, advice });
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const WORDS_PER_SECOND = 2.5; // fala em ritmo de conversa

export function reviewScript(text: string): Check[] {
  const t = text.trim();
  if (!t) return [check("Roteiro", "conferir", "Cole o roteiro para eu analisar.")];
  const sentences = t.split(/(?<=[.!?])\s+|\n+/).filter((x) => x.trim());
  const first = words(sentences[0] ?? "");
  const seconds = Math.round(words(t) / WORDS_PER_SECOND);
  const longest = Math.max(...sentences.map(words));
  const cta = /\b(salve|salva|comente|comenta|compartilhe|envie|siga|segue|clique|acesse|agende|chame|baixe)\b|link na bio/i.test(t);
  return [
    check("Gancho", first <= 14 ? "bom" : "ajustar", first <= 14 ? `A primeira frase tem ${first} palavras.` : `A primeira frase tem ${first} palavras. Corte para até 14.`),
    check("Duração falada", seconds <= 75 ? "bom" : "ajustar", `Cerca de ${seconds} segundos em ritmo de conversa.${seconds > 75 ? " Para Reel, tente ficar abaixo de 75." : ""}`),
    check("Frases", longest <= 28 ? "bom" : "ajustar", longest <= 28 ? "Frases curtas o bastante para falar sem perder o fôlego." : `Há frase com ${longest} palavras. Divida.`),
    check("Convite", cta ? "bom" : "ajustar", cta ? "Há um pedido de ação." : "Termine pedindo uma ação: salvar, comentar, chamar ou acessar o link."),
  ];
}

export function reviewVideo(v: { duration: number; width: number; height: number; size: number; ext: string }): Check[] {
  const ratio = v.width ? v.height / v.width : 0;
  const ext = v.ext.toLowerCase();
  return [
    check("Arquivo", [".mp4", ".mov"].includes(ext) && v.size <= 100 * 1048576 ? "bom" : "ajustar", `${ext || "sem extensão"}, ${(v.size / 1048576).toFixed(1)} MB. Aceito MP4 ou MOV até 100 MB.`),
    check("Formato", !ratio ? "conferir" : ratio >= 1.7 && ratio <= 1.85 ? "bom" : "ajustar", !ratio ? "Não consegui ler as dimensões." : `${v.width} x ${v.height}. O recomendado para Reel é vertical 9:16.`),
    check("Resolução", !v.width ? "conferir" : v.width >= 1080 ? "bom" : "ajustar", !v.width ? "Não consegui ler a resolução." : `Largura de ${v.width} px. Use pelo menos 1080.`),
    check("Duração", !v.duration ? "conferir" : v.duration >= 3 && v.duration <= 180 ? "bom" : "ajustar", !v.duration ? "Não consegui ler a duração." : `${Math.round(v.duration)} segundos. Aceito de 3 segundos a 3 minutos.`),
  ];
}
