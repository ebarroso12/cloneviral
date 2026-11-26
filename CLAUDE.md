# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Radar Viral: painel de métricas e máquina de conteúdo para Instagram, reconstruído do mapeamento funcional do app de referência (identificado em `replica/recon.md`). Responder ao dono sempre em português.

## Comandos

```bash
npm ci
npm run dev        # http://localhost:3000, com conta demo
npm run iniciar    # uso local em modo produção (o mesmo que "Abrir Radar Viral.cmd")
npm run build
npm test           # tsx --test tests/*.test.ts
npm run seed       # recria a demo; recusa apagar banco com conta real sem --force
npx tsc --noEmit   # checagem de tipos (não há linter configurado)

# um arquivo / um teste
npx tsx --test tests/seguranca.test.ts
npx tsx --test --test-name-pattern="BUG-007" tests/seguranca.test.ts

# fluxos no navegador (Playwright para Python), servidor com banco vazio em outra janela
RV_DEMO=1 RV_DATA_DIR=<pasta vazia> npx next start -p 3100
python e2e/fluxos.py http://localhost:3100
```

Os fluxos gravam no banco: rode sempre em pasta vazia, senão os casos de cadastro falham. Testes de unidade definem `RV_DATA_DIR` temporário antes do primeiro `getStore()`; um teste novo que grave precisa fazer o mesmo, ou escreve em `data/`.

## Arquitetura

Next.js 15 (App Router) + React 19 + TypeScript estrito, CSS próprio em `app/globals.css`, alias `@/` na raiz. Cada tela em `app/(app)/<rota>/` tem `page.tsx` e, quando interativa, `view.tsx` (cliente). `app/(app)/layout.tsx` exige sessão e monta `components/Shell.tsx`, onde fica o menu.

- **Dados** (`lib/store.ts`): uma interface `Store` de documentos por coleção, com `FileStore` (`data/db.json`, gravação atrasada em 150 ms) e `SupabaseStore` (tabela única `app_docs`, via PostgREST com service role). Escolha por `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Não há schema por entidade: o modelo de dados está descrito em `replica/recon.md`. Qualquer mudança na interface vale para as duas implementações.
- **Escopo por usuário** é responsabilidade do código: RLS está ligada sem política e o servidor usa service role. `get()` e `findOne()` não filtram usuário, então quem chama precisa comparar `userId`.
- **API**: handlers usam `route()` de `lib/api.ts` (autentica e converte `HttpError` e `InsufficientCredits` em 401/4xx/402). CRUD simples passa por `app/api/c/[collection]`, que só aceita as listas `WRITABLE` e `READONLY`: coleção nova precisa entrar nelas.
- **Cliente** chama a API com `api()` de `lib/client.ts`.
- **Créditos** (`lib/credits.ts`): livro-razão `ledger`; saldo é a soma das linhas. Cobrar antes de gerar (`charge`) e devolver a diferença (`refund`) se render menos. Os custos em `COSTS` reproduzem o original e há teste sobre eles.
- **Conteúdo** (`lib/ai.ts`): geradores por modelo, determinísticos e sem custo. Com `GEMINI_API_KEY` (plano gratuito), `llmJson` tenta a IA e cai no modelo local se falhar; roteiros guardam `generator` (`ia` ou `modelo`).
- **Agendador** (`instrumentation.ts` + `lib/scheduler.ts`): só com `RV_SCHEDULER=1` (o atalho local liga); publica o vencido a cada minuto e coleta os números uma vez por dia.
- **Métricas** (`lib/metrics.ts`): funções puras sobre posts, snapshots e audiência. `tests/metrics.test.ts` fixa os números observados na tela original; mudança de fórmula tem de ser conferida com `replica/recon.md`. O terceiro sinal da autenticidade (comentários por curtida) é hipótese não confirmada.
- **Instagram** (`lib/instagram.ts`): OAuth do Facebook Login + Graph API, token em AES-256-GCM com chave derivada de `RV_SECRET` (obrigatória em produção). `syncAccount` tem prazo e devolve `partial`; `syncAll` serve `/api/cron/sync`. Os testes simulam o `fetch`.
- **Sessão** (`lib/auth.ts`): scrypt, cookie `rv_session`, hash do token em `sessions`.

## Regras que o código já garante (não desfazer)

- Regra do dono: **nenhum gasto**. Não ligar serviço pago; `aiProvider` só usa a Anthropic com `RV_ALLOW_PAID_AI=1`.
- Agendamento só nasce em `schedulePost` (`/api/schedule`); `scheduled_posts` na API genérica é leitura e exclusão.
- Conta do Instagram só é gravada por `saveConnection` (não mistura contas; troca pede confirmação e guarda cópia).
- Resultado de publicação incerto vira `conferir`, nunca `falhou`. Dia sem medição de seguidores não recebe número.
- Publicação (`lib/publish.ts`) é ação para fora: só com `autoPublish` marcado pelo dono, uma rodada por vez, sem repetir falha e sem publicar com mais de 6 horas de atraso.

- Chave fixa (`conn`, `aud`, `snap_<data>`, id de post da Meta) vira `scopedId(userId, chave)`. `insert` recusa id de outra conta.
- Corpo vindo do navegador passa por `clientData`; documento que sai para o navegador passa por `publicDoc` (remove `token`).
- `videos` é só leitura na API genérica; caminho de arquivo sai de `videoPath`.
- Geração paga usa `withCharge` (devolve o crédito se falhar). Nunca `charge` solto numa rota.
- `findAll` atravessa contas: só para a coleta diária.
- Métrica que a Meta não devolveu não é gravada como zero, e a falha vira aviso em `syncWarnings`.
- Número estimado nunca aparece como medido (anúncios simulados só na demo).
- Demo, cadastro e limitações de servidor são decididos em `lib/config.ts`.

## Limitações abertas

Instagram (conexão, coleta, publicação), Gemini e Supabase nunca testados contra o serviço real. Envio de vídeo não funciona na Vercel.

## Pipeline replica e regras do projeto

Ordem definida pelo dono: recon, architect, design, build, backend, test, diff, entrepreneur, brand, launch, deploy (skills `replica-*`). Artefatos em `replica/`; `replica/features.csv` é a matriz de paridade, e a coluna `clone` só muda depois de conferir a função rodando.

- Clean-room: reproduzir funções, fluxos e padrões de tela. Não trazer código, textos, marca, arte nem os 100 modelos de carrossel do original.
- O original é lido só pela conta autorizada do dono, no navegador dele, sem crawler, bundle JS ou captura de rede. `replica/screens/` nunca vai para o git.
- O repositório é público: nada de credencial real nem dado pessoal.
- Deploy em produção só com autorização explícita.
- Pode haver outra sessão enviando commits para a `main`: fazer `git pull` antes de editar e antes de enviar.
