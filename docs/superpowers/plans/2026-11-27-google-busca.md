# Google: busca pelo nome — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** mostrar no app: busca pelo nome → cliques → visitas ao site vindas do Google → cliques no WhatsApp.

**Architecture:** OAuth do Google no mesmo molde da Meta (`lib/metaApp.ts` + rotas `connect`/`callback`/`disconnect`). Um módulo guarda a conexão, outro consulta Search Console e Analytics na hora do pedido, sem cache. Um quadro novo em Conexões e um bloco novo em Métricas.

**Tech Stack:** Next.js 15, React 19, TypeScript estrito, `fetch` direto (sem dependência nova), `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-27-google-busca-design.md`

## Global Constraints

- Custo zero; nenhuma dependência nova.
- Repositório público: sem chave, token, ID de propriedade ou dado pessoal no código (a sugestão "edson barroso" vem do nome da conta do dono, não de texto fixo).
- Escopos exatos: `https://www.googleapis.com/auth/webmasters.readonly` e `https://www.googleapis.com/auth/analytics.readonly`.
- Retorno: `<APP_URL>/api/google/callback`.
- Só o dono configura, conecta e vê. Segredo e token cifrados com `encrypt` de `lib/instagram.ts` e nunca saem para o navegador.
- Sem conexão ou com erro: aviso e `--`, nunca zero.
- Site e propriedade escolhidos pelo dono; nenhuma escolha automática.
- Texto de tela em português. Campo de segredo usa `PasswordInput`.
- Trabalho no ramo `google-busca`. Nenhum envio ao GitHub nem publicação sem o sim do dono.

## Review Focus

- O dono desmarca uma das permissões no Google → não grava a conexão e diz qual faltou (Tarefa 1).
- Token revogado ou vencido (`invalid_grant`) → status `reautorizar` e aviso, não erro 500 (Tarefa 1).
- Uma fonte falha e a outra responde → mostra a que respondeu; a outra com aviso e `--` (Tarefa 2).
- Conectado sem site ou sem propriedade escolhidos → pede a escolha, sem consultar (Tarefa 2).
- Nome vazio ou só espaços → recusado, porque filtraria todas as buscas (Tarefa 2).

---

### Task 1: Conexão com o Google

**Files:**
- Create: `lib/google.ts`, `app/api/google/app/route.ts`, `app/api/google/connect/route.ts`, `app/api/google/callback/route.ts`, `app/api/google/disconnect/route.ts`
- Modify: `lib/account.ts` (incluir `google_app`, `google_connection` na lista apagada)
- Test: `tests/google.test.ts` (mesmo preparo e `withFetch` de `tests/correcoes.test.ts`)

**Interfaces (Produces):**
```ts
export const GOOGLE_SCOPES: string[];
export async function saveGoogleApp(userId: string, b: { clientId?: unknown; secret?: unknown }): Promise<void>; // 403 não dono; 400 formato
export async function googleStatus(userId: string): Promise<{ configured: boolean; clientId: string; status: "disconnected" | "connected" | "reautorizar"; siteUrl: string; propertyId: string; propertyName: string; term: string }>;
export function googleAuthUrl(redirect: string, state: string, clientId: string): string; // access_type=offline, prompt=consent
export async function connectGoogle(userId: string, code: string, redirect: string): Promise<void>;
export async function accessToken(userId: string): Promise<string>; // renova pelo refresh token
export async function disconnectGoogle(userId: string): Promise<void>; // revoga (se falhar, segue) e apaga o token
```
Coleções: `google_app {clientId, secret}` e `google_connection {status, token, siteUrl, propertyId, propertyName, term}` (`token` = refresh token cifrado), ids por `scopedId`.
Validação: `clientId` casa `/^[\w-]+\.apps\.googleusercontent\.com$/`; `secret` casa `/^[\w-]{20,100}$/`.

- [ ] **Step 1:** `git checkout -b google-busca`
- [ ] **Step 2: testes que falham**, com estes nomes e asserções:
  - `só o dono grava o app do Google` — outro usuário: rejeita 403; ID sem o sufixo: 400.
  - `endereço de autorização pede só leitura e acesso offline` — `scope` contém exatamente os 2 escopos; `access_type=offline`; `prompt=consent`.
  - `conectar grava o token cifrado e googleStatus não o expõe` — o documento não contém o texto do token; `JSON.stringify(status)` não contém token nem segredo.
  - `permissão desmarcada não conecta` — resposta com um só escopo: rejeita citando "Search Console" ou "Analytics" (o que faltou); status segue `disconnected`.
  - `resposta sem refresh_token não conecta`.
  - `invalid_grant vira reautorizar` — `accessToken` rejeita com `HttpError` 409 e status passa a `reautorizar`.
  - `desconectar apaga o token mesmo se a revogação falhar`.
- [ ] **Step 3:** `npx tsx --test tests/google.test.ts` → FAIL (módulo não existe).
- [ ] **Step 4:** implementar `lib/google.ts` (token em `https://oauth2.googleapis.com/token`, `application/x-www-form-urlencoded`; revogação em `https://oauth2.googleapis.com/revoke`; timeout de 20 s) e as rotas, espelhando `app/api/ig/*`: cookie `rv_google_state`; `connect` exige dono; sem app configurado volta para `/conexoes?erro=...`; sucesso volta para `/conexoes?google=ok`; `app` é POST.
- [ ] **Step 5:** `npx tsx --test tests/google.test.ts` → PASS.
- [ ] **Step 6:** `git commit -am` após `git add` dos novos: "Conexão somente leitura com o Google".

### Task 2: Consulta dos números e escolhas

**Files:**
- Create: `lib/googleData.ts`, `app/api/google/options/route.ts` (GET), `app/api/google/settings/route.ts` (POST), `app/api/google/report/route.ts` (GET `?dias=7|28|90`)
- Test: `tests/google.test.ts`

**Interfaces:**
- Consumes: `accessToken`, `googleStatus` (Tarefa 1).
- Produces:
```ts
export async function googleOptions(userId: string): Promise<{ sites: string[]; properties: { id: string; name: string }[] }>;
export async function saveGoogleSettings(userId: string, b: { siteUrl?: unknown; propertyId?: unknown; term?: unknown }): Promise<void>;
export function reportRange(days: 7 | 28 | 90, now?: Date): { start: string; end: string }; // end = hoje - 3 dias; intervalo com `days` dias
export type Part<T> = ({ ok: true } & T) | { ok: false; error: string };
export async function googleReport(userId: string, days: 7 | 28 | 90): Promise<{
  start: string; end: string; term: string;
  search: Part<{ impressions: number; clicks: number; ctr: number | null; position: number | null; queries: { query: string; impressions: number; clicks: number }[] }>;
  site: Part<{ visits: number; whatsapp: number }>;
}>;
```
Chamadas:
- Sites: `GET https://www.googleapis.com/webmasters/v3/sites`, descartando `siteUnverifiedUser`.
- Propriedades: `GET https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200`, seguindo `nextPageToken`.
- Busca: `POST .../webmasters/v3/sites/{encodeURIComponent(siteUrl)}/searchAnalytics/query`, filtro `query` `contains` o termo; uma chamada sem dimensão (totais) e uma com `dimensions:["query"]`, `rowLimit:25`.
- Site: `POST https://analyticsdata.googleapis.com/v1beta/properties/{id}:runReport`; filtro `sessionSource="google"` e `sessionMedium="organic"`; `sessions` numa chamada, `eventCount` com `eventName="generate_lead"` noutra.
- Resposta sem linhas = zero medido (`ctr` e `position` ficam `null`). Resposta com erro = `ok:false` com a mensagem do Google (até 200 caracteres).

- [ ] **Step 1: testes que falham:**
  - `intervalo termina três dias antes` — `reportRange(7, new Date("2026-11-27T12:00:00Z"))` = `{start:"2026-11-18", end:"2026-11-24"}`.
  - `relatório soma as duas fontes com o filtro pelo nome` — valores simulados aparecem; o corpo enviado à busca contém o termo; o do Analytics contém `google` e `organic`.
  - `sem linhas é zero, sem taxa inventada` — `clicks===0`, `ctr===null`, `position===null`.
  - `falha de uma fonte não derruba a outra` — Analytics 403: `site.ok===false`, `search.ok===true`; e o inverso.
  - `sem site ou propriedade escolhidos não consulta` — rejeita 409; zero chamadas.
  - `termo vazio é recusado` — `"   "` → 400.
  - `só aceita site e propriedade que a conta tem` — valor fora de `googleOptions` → 400.
  - `outro usuário não vê relatório` — 403.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** implementar. Dias fora de 7/28/90 → 400. `term` sem valor gravado = nome do dono sem título ("Dr."), minúsculo; limite de 60 caracteres.
- [ ] **Step 4:** rodar → PASS.
- [ ] **Step 5:** commit "Números da busca pelo nome e do site".

### Task 3: Quadro Google na tela Conexões

**Files:**
- Create: `app/(app)/conexoes/google.tsx` (cliente, `GoogleCard`)
- Modify: `app/(app)/conexoes/page.tsx`, `app/(app)/conexoes/view.tsx`

**Interfaces:** consome `googleStatus` e as rotas das Tarefas 1 e 2. `GoogleCard({ status, redirect }: { status: Awaited<ReturnType<typeof googleStatus>>; redirect: string })`, renderizado só para o dono.

- [ ] **Step 1:** estados: sem app (formulário ID + segredo com `PasswordInput` e o endereço de retorno para copiar); desconectado (botão **Conectar Google**, link para `/api/google/connect`); conectado (listas "Site" e "Propriedade do Analytics" começando em "Escolha...", campo "Nome pesquisado", Salvar, Desconectar com confirmação); `reautorizar` (aviso e botão de novo).
- [ ] **Step 2:** `npx tsc --noEmit && npm run build` → sem erro.
- [ ] **Step 3:** commit "Quadro do Google em Conexões".

### Task 4: Bloco Google em Métricas

**Files:**
- Create: `app/(app)/metricas/google.tsx` (cliente, `GoogleBlock()`)
- Modify: `app/(app)/metricas/view.tsx` (inserir `<GoogleBlock />` no fim)
- Modify: `e2e/fluxos.py` (um caso novo)

- [ ] **Step 1: caso no navegador que falha:** em Métricas, o dono sem Google conectado vê "Conecte o Google" e nenhum número no bloco.
- [ ] **Step 2:** `GoogleBlock` busca `/api/google/report?dias=28`; períodos 7, 28 (padrão) e 90; quatro cartões: "Apareceu na busca", "Cliques" (com taxa e posição), "Visitas vindas do Google", "Cliques no WhatsApp"; lista dos termos; mostra as datas do intervalo. Parte com `ok:false`: `--` e a mensagem. Quem não é dono (403): bloco não aparece. Avisos fixos, com este texto:
  - "Os dois primeiros números são só das buscas com o nome. Os dois últimos contam todas as visitas vindas da busca do Google: o Analytics não informa a palavra pesquisada."
  - "Os dados da busca chegam com alguns dias de atraso e o Google esconde buscas muito raras. O Analytics só conta a partir de quando a medição foi instalada no site."
- [ ] **Step 3:** `npm test`, `npx tsc --noEmit`, `npm run build`, fluxos do `CLAUDE.md` em pasta vazia → tudo passa (S07, notícias, pode falhar por limite externo do Google).
- [ ] **Step 4:** commit "Bloco Google em Métricas".

### Task 5: Guia e documentação

**Files:** Modify: `replica/guia-gratis.md`, `README.md`, `CLAUDE.md`

- [ ] **Step 1:** guia passo a passo com links: projeto novo no Google Cloud; ativar Search Console API, Google Analytics Data API e Google Analytics Admin API **antes** da autorização; tela de consentimento Externa com `https://cloneviralapp.vercel.app/privacidade` (conferir o caminho real da página no app) e publicada "Em produção"; cliente OAuth "Aplicativo da Web" com o retorno; verificar o site no Search Console. Conferir os nomes das telas na documentação atual do Google.
- [ ] **Step 2:** CLAUDE.md: um item em Arquitetura (`lib/google.ts`, `lib/googleData.ts`) e a limitação "Google só simulado até a conexão real".
- [ ] **Step 3:** commit "Guia da ligação com o Google". **Parar** e pedir autorização para enviar e publicar; depois conectar a conta real com o dono e conferir os números contra os painéis do Google.
