# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Radar Viral: painel de métricas e máquina de conteúdo para Instagram, reconstruído do mapeamento funcional do Sistema Viral. Responder ao dono sempre em português.

## Comandos

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm test           # tsx --test tests/*.test.ts
npm run seed       # APAGA data/db.json inteiro e recria a conta demo
npx tsc --noEmit   # checagem de tipos (não há linter configurado)

# um arquivo / um teste
npx tsx --test tests/metrics.test.ts
npx tsx --test --test-name-pattern="autenticidade" tests/metrics.test.ts
```

Sem variáveis de ambiente o app roda em modo demonstração (`demo@radarviral.app` / `demo-radar-2026`, dados sintéticos). Variáveis opcionais em `.env.example`; o código também lê `APP_URL`, `META_GRAPH_VERSION` e `RV_DEMO_DATA_FOR_NEW_USERS`.

## Arquitetura

Next.js 15 (App Router) + React 19 + TypeScript estrito, CSS próprio em `app/globals.css`, alias `@/` na raiz. Cada tela em `app/(app)/<rota>/` tem `page.tsx` e, quando interativa, `view.tsx` (cliente). `app/(app)/layout.tsx` exige sessão e monta `components/Shell.tsx`, onde fica o menu.

- **Dados** (`lib/store.ts`): uma interface `Store` de documentos por coleção, com `FileStore` (`data/db.json`, gravação atrasada em 150 ms) e `SupabaseStore` (tabela única `app_docs`, via PostgREST com service role). Escolha por `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Não há schema por entidade: o modelo de dados está descrito em `replica/recon.md`. Qualquer mudança na interface vale para as duas implementações.
- **Escopo por usuário** é responsabilidade do código: RLS está ligada sem política e o servidor usa service role. `get()` e `findOne()` não filtram usuário, então quem chama precisa comparar `userId`.
- **API**: handlers usam `route()` de `lib/api.ts` (autentica e converte `HttpError` e `InsufficientCredits` em 401/4xx/402). CRUD simples passa por `app/api/c/[collection]`, que só aceita as listas `WRITABLE` e `READONLY`: coleção nova precisa entrar nelas.
- **Cliente** chama a API com `api()` de `lib/client.ts`.
- **Créditos** (`lib/credits.ts`): livro-razão `ledger`; saldo é a soma das linhas. Cobrar antes de gerar (`charge`) e devolver a diferença (`refund`) se render menos. Os custos em `COSTS` reproduzem o original e há teste sobre eles.
- **Conteúdo** (`lib/ai.ts`): geradores por modelo, determinísticos e sem custo. Com `ANTHROPIC_API_KEY`, `llmJson` tenta o modelo pago e qualquer falha cai em silêncio no gerador por modelo, então texto genérico não prova que a IA respondeu.
- **Métricas** (`lib/metrics.ts`): funções puras sobre posts, snapshots e audiência. `tests/metrics.test.ts` fixa os números observados na tela original; mudança de fórmula tem de ser conferida com `replica/recon.md`. O terceiro sinal da autenticidade (comentários por curtida) é hipótese não confirmada.
- **Instagram** (`lib/instagram.ts`): OAuth do Facebook Login + Graph API, token em AES-256-GCM com chave derivada de `RV_SECRET`. Nunca testado contra conta real. Vários `catch {}` na sincronização engolem erro e deixam métricas zeradas.
- **Sessão** (`lib/auth.ts`): scrypt, cookie `rv_session`, hash do token em `sessions`.

## Armadilhas (lidas no código; conferir se ainda valem)

- IDs fixos (`conn`, `aud`, `snap_<data>`) são compartilhados entre usuários. Como a conta demo é semeada sozinha (`ensureSeed` roda em todo `getUser` e `login`), um segundo usuário pode colidir com ela: snapshots descartados na sincronização, conexão e audiência sobrescritas.
- A conta demo, com senha publicada no repositório, é criada também quando o banco é o Supabase. Resolver antes de qualquer deploy.
- `RV_SECRET` ausente cai numa chave padrão escrita no código.
- `/api/upload` grava em `data/uploads/` no disco e aceita 100 MB: não funciona em função da Vercel (disco efêmero e limite de corpo de cerca de 4,5 MB).
- `/api/cron/publish` é esqueleto (501). Não há gateway de pagamento.

## Pipeline replica e regras do projeto

Ordem definida pelo dono: recon, architect, design, build, backend, test, diff, entrepreneur, brand, launch, deploy (skills `replica-*`). Artefatos em `replica/`; `replica/features.csv` é a matriz de paridade, e a coluna `clone` só muda depois de conferir a função rodando.

- Clean-room: reproduzir funções, fluxos e padrões de tela. Não trazer código, textos, marca, arte nem os 100 modelos de carrossel do original.
- O original é lido só pela conta autorizada do dono, no navegador dele, sem crawler, bundle JS ou captura de rede. `replica/screens/` nunca vai para o git.
- O repositório é público: nada de credencial real nem dado pessoal.
- Deploy em produção só com autorização explícita.
- Pode haver outra sessão enviando commits para a `main`: fazer `git pull` antes de editar e antes de enviar.
