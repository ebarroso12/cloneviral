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

/** O envio de vídeo grava em disco e passa do limite de corpo da Vercel; falta enviar direto ao Storage. */
export function uploadProblem(env: Env = process.env) {
  return env.VERCEL ? "O envio de vídeo ainda não funciona neste servidor. Use o app instalado no seu computador para guardar vídeos." : null;
}
