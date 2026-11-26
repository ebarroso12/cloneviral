// Decisões que dependem do ambiente. Funções puras para poderem ser testadas.
export type Env = Record<string, string | undefined>;

/** A conta de demonstração (senha pública) só existe em uso local, ou quando RV_DEMO=1. */
export function demoEnabled(env: Env = process.env) {
  if (env.RV_DEMO === "1") return true;
  if (env.RV_DEMO === "0") return false;
  return env.NODE_ENV !== "production" && !(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Em produção o primeiro cadastro vira o dono; os demais exigem RV_ALLOW_SIGNUP=1. */
export function signupAllowed(env: Env, hasOwner: boolean) {
  if (env.RV_ALLOW_SIGNUP === "1") return true;
  return env.NODE_ENV !== "production" || !hasOwner;
}
