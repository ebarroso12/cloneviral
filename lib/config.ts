// Decisões que dependem do ambiente. Funções puras para poderem ser testadas.
export type Env = Record<string, string | undefined>;

/** A conta de demonstração (senha pública) só existe em uso local, ou quando RV_DEMO=1. */
export function demoEnabled(env: Env = process.env) {
  if (env.RV_DEMO === "1") return true;
  if (env.RV_DEMO === "0") return false;
  return env.NODE_ENV !== "production" && !supabaseConfig(env);
}

/**
 * Em produção o primeiro cadastro vira o dono; os demais exigem RV_ALLOW_SIGNUP=1.
 * Num endereço público o primeiro cadastro também exige o código RV_SIGNUP_CODE.
 */
export function signupAllowed(env: Env, hasOwner: boolean, code = "") {
  if (env.RV_ALLOW_SIGNUP === "1") return true;
  if (env.NODE_ENV !== "production") return true;
  if (hasOwner) return false;
  if (env.RV_SIGNUP_CODE) return code.trim() === env.RV_SIGNUP_CODE;
  return !env.VERCEL;
}

/** Banco externo: chave de administrador, ou chave pública acompanhada do segredo RV_DB_KEY. */
export function supabaseConfig(env: Env = process.env) {
  const url = env.SUPABASE_URL;
  if (!url) return null;
  if (env.SUPABASE_SERVICE_ROLE_KEY) return { url, key: env.SUPABASE_SERVICE_ROLE_KEY, dbKey: undefined };
  if (env.SUPABASE_ANON_KEY && env.RV_DB_KEY) return { url, key: env.SUPABASE_ANON_KEY, dbKey: env.RV_DB_KEY };
  return null;
}

/** Na Vercel o disco some entre execuções: sem banco externo nada ficaria salvo. */
export function storageProblem(env: Env = process.env) {
  return env.VERCEL && !supabaseConfig(env) ? "Configure o Supabase (SUPABASE_URL, SUPABASE_ANON_KEY e RV_DB_KEY): neste servidor o disco não guarda dados." : null;
}

/** Texto da tela Conexões enquanto o app da Meta não está configurado. */
export function avisoSemMeta({ demo, site }: { demo: boolean; site: boolean }) {
  const base = `A conexão com o Instagram ainda não foi ligada ${site ? "neste site" : "neste computador"}. Falta criar o seu app gratuito na Meta e informar o ID e a chave secreta dele no quadro Seu app da Meta.`;
  return demo ? `${base} Os números que aparecem são da conta de demonstração.` : base;
}
