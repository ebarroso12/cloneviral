// 100 modelos de carrossel em 13 categorias (catálogo próprio; títulos, cores e estrutura originais deste projeto).
export type CarouselModel = {
  id: string;
  category: string;
  title: string;
  slides: number;
  imageSlides: number;
  roles: string[];
  palette: { bg: string; fg: string; accent: string; muted: string };
  font: string;
};

const PALETTES = [
  { bg: "#0f172a", fg: "#f8fafc", accent: "#38bdf8", muted: "#94a3b8" },
  { bg: "#fdf6ec", fg: "#2b2118", accent: "#e76f51", muted: "#8a7a6a" },
  { bg: "#111827", fg: "#fefce8", accent: "#facc15", muted: "#9ca3af" },
  { bg: "#f1f5f9", fg: "#0f172a", accent: "#6366f1", muted: "#64748b" },
  { bg: "#052e2b", fg: "#ecfdf5", accent: "#34d399", muted: "#86b8ad" },
  { bg: "#3b0764", fg: "#faf5ff", accent: "#e879f9", muted: "#c4a3d9" },
  { bg: "#fff1f2", fg: "#4c0519", accent: "#e11d48", muted: "#9f6b78" },
  { bg: "#1c1917", fg: "#fafaf9", accent: "#fb923c", muted: "#a8a29e" },
];
const FONTS = ["Inter, system-ui, sans-serif", "Georgia, 'Times New Roman', serif", "'Trebuchet MS', system-ui, sans-serif", "Verdana, system-ui, sans-serif", "'Palatino Linotype', Georgia, serif"];

const ROLE_SETS: Record<string, string[]> = {
  Autoridade: ["capa", "contexto", "método", "passo", "passo", "resultado", "convite"],
  Bastidor: ["capa", "cena", "cena", "cena", "aprendizado", "aprendizado", "convite"],
  Comparação: ["capa", "lado A", "lado B", "diferença", "diferença", "conclusão", "convite"],
  Educativo: ["capa", "conceito", "exemplo", "exemplo", "aplicação", "resumo", "convite"],
  Erro: ["capa", "erro 1", "erro 2", "erro 3", "correção", "convite"],
  Lista: ["capa", "item", "item", "item", "item", "convite"],
  Objeção: ["capa", "a dúvida", "por que parece verdade", "o que muda", "prova", "convite"],
  Oferta: ["capa", "dor", "solução", "o que inclui", "para quem é", "prova", "garantia", "convite"],
  "Passo a passo": ["capa", "passo", "passo", "passo", "passo", "resultado", "convite"],
  Pergunta: ["capa", "pergunta", "reflexão", "resposta", "convite"],
  "Prova social": ["capa", "situação inicial", "o que mudou", "resultado", "convite"],
  Storytelling: ["capa", "cena", "conflito", "virada", "lição", "convite"],
  Tendência: ["capa", "o que mudou", "o que isso significa", "o que fazer", "convite"],
};

const TITLES: Record<string, string[]> = {
  Autoridade: ["Como eu conduzo", "O método por trás do resultado", "O que 5 anos me ensinaram", "Meu critério para decidir", "O que eu faço diferente", "A regra que sigo sempre", "Como eu penso antes de agir"],
  Bastidor: ["Um dia de trabalho de verdade", "Como a equipe se organiza", "O que ninguém vê da rotina", "Da ideia à entrega", "Os bastidores de um lançamento", "O que eu faço antes de gravar", "Como eu preparo a semana"],
  Comparação: ["Iniciante x experiente", "Com método x sem método", "Antes x depois da rotina", "Mito x realidade", "Rápido x certo", "Barato x que vale a pena"],
  Educativo: ["O que é, em uma frase", "Entenda em 6 slides", "Glossário para quem começa", "Os 3 conceitos que sustentam tudo", "Como funciona por dentro", "O que mudou e por quê", "Tudo o que você precisa saber antes de começar", "O que eu queria ter aprendido primeiro", "Pergunta de iniciante, resposta direta", "O básico bem feito", "O que significa na prática"],
  Erro: ["3 erros que custam caro", "O erro invisível", "O que travou o seu resultado", "Pare de fazer isso"],
  Lista: ["5 hábitos para a semana", "Checklist para conferir hoje", "7 ideias para o próximo mês", "As 3 métricas que importam", "Ferramentas que eu uso", "Frases que eu não uso mais", "Perguntas para se fazer hoje", "Livros que mudaram minha rotina", "O mínimo para começar"],
  Objeção: ["Não tenho tempo", "Já tentei e não deu certo", "Não sou boa nisso", "Está caro", "Preciso pensar mais", "Não vai funcionar comigo", "E se eu errar?", "Não tenho seguidores", "Não sei por onde começar"],
  Oferta: ["Para quem é esta mentoria", "O que você leva", "Como funciona por dentro", "Vagas abertas", "O próximo encontro", "O que está incluso", "Sem enrolação: como é", "Antes de você decidir", "Última chamada", "Perguntas frequentes", "Seu primeiro passo"],
  "Passo a passo": ["Passo a passo para começar", "Como fazer em 10 minutos", "Do zero ao primeiro resultado", "O roteiro de 5 passos", "Monte a sua rotina", "Como organizar o mês", "Aplique hoje"],
  Pergunta: ["Você concorda?", "O que você faria?", "Qual é o seu caso?", "Verdade ou mito?", "Responda sem pensar", "O que está te segurando?"],
  "Prova social": ["O que mudou para ela", "Resultado de uma aluna", "Antes e depois da rotina", "O que dizem sobre o encontro", "Uma história real", "Três mudanças em 30 dias", "O primeiro resultado", "Depoimento em 5 slides"],
  Storytelling: ["O dia em que tudo mudou", "A história por trás do projeto", "Quase desisti", "O que aprendi com um erro", "Uma conversa que mudou minha rotina", "Do medo à decisão", "O começo de tudo", "O dia em que disse não", "A virada", "O que eu faria diferente"],
  Tendência: ["O que está mudando", "Três sinais para observar", "O que fazer agora", "O que vem por aí", "Antes que todo mundo faça"],
};

function build(): CarouselModel[] {
  const out: CarouselModel[] = [];
  let n = 0;
  for (const [category, titles] of Object.entries(TITLES)) {
    const roles = ROLE_SETS[category];
    titles.forEach((title, i) => {
      const extra = i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 2;
      const slides = Math.min(10, roles.length + (category === "Lista" || category === "Passo a passo" ? extra : 0));
      const r = [...roles];
      while (r.length < slides) r.splice(r.length - 1, 0, r[Math.max(1, r.length - 2)]);
      out.push({
        id: `m${String(++n).padStart(3, "0")}`,
        category,
        title,
        slides,
        imageSlides: 1 + (i % 3 === 0 ? 0 : 1),
        roles: r.slice(0, slides),
        palette: PALETTES[(n * 3) % PALETTES.length],
        font: FONTS[n % FONTS.length],
      });
    });
  }
  return out;
}

export const CAROUSEL_MODELS: CarouselModel[] = build();
export const CATEGORIES = Object.keys(TITLES).map((c) => ({ name: c, count: CAROUSEL_MODELS.filter((m) => m.category === c).length }));
export const modelById = (id: string) => CAROUSEL_MODELS.find((m) => m.id === id) ?? null;
