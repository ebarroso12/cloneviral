# Arquitetura do Radar Viral

Stack: Next.js 15 (App Router) + React 19 + TypeScript, CSS próprio, pdf-lib. Dados atrás de uma interface `Store`.

- **FileStore** (padrão): `data/db.json`, escrita atômica com atraso. Custo zero.
- **SupabaseStore**: tabela única `app_docs` (ver `supabase/migrations/0001_app_docs.sql`), ligada por `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
- Escopo por usuário em toda consulta (`user_id`); API genérica `/api/c/[collection]` só aceita coleções da lista.
- Auth: senha com scrypt, cookie `rv_session` httpOnly (hash sha256 do token guardado em `sessions`).
- Créditos: livro-razão (`ledger`) com `grant`, `charge`, `refund`; cobrança antes de gerar e estorno quando entrega menos.
- IA: geradores por modelo em `lib/ai.ts`; LLM opcional via `ANTHROPIC_API_KEY`.
- Instagram: OAuth do Facebook Login + Graph API v21, token criptografado (AES-256-GCM). Não testado contra conta real.

Riscos: (1) sincronização real exige app Meta aprovado; (2) publicação agendada não implementada; (3) FileStore não serve para produção multiusuário, use Supabase.
Próximo passo: Stripe para o plano START e agendador de publicação.
