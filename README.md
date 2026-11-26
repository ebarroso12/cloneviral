# Radar Viral (cloneviral)

Painel de métricas e máquina de conteúdo para Instagram, reconstruído a partir do mapeamento funcional de um app de referência (`replica/recon.md`). Clean-room: funções e fluxos, sem código, textos, marca ou arte do original.

## Abrir no computador

Dê dois cliques em **`Abrir Radar Viral.cmd`**. Na primeira vez ele constrói o app (alguns minutos) e abre `http://localhost:3000`. Só este computador acessa.

1. Clique em **Criar conta**: a primeira conta vira a do dono e o cadastro fecha.
2. Seus dados ficam em `data/db.json`. O segredo que protege o token do Instagram fica em `.env.local`. Faça cópia dos dois juntos.

Requisitos: Node 20 ou mais novo e, uma única vez, `npm ci`.

## Desenvolver

```bash
npm ci
npm run dev     # http://localhost:3000, com conta de demonstração
npm test
npm run build
```

Em desenvolvimento existe a conta `demo@radarviral.app` / `demo-radar-2026`, com dados sintéticos. Ela fica desligada em produção e quando há Supabase. `npm run seed` recria a demonstração e se recusa a apagar um banco com conta real.

## Fluxos no navegador

```bash
pip install playwright && playwright install chromium
npm run build
RV_DEMO=1 RV_DATA_DIR=<pasta vazia> npx next start -p 3100
python e2e/fluxos.py http://localhost:3100
```

## Conectar o Instagram de verdade

1. Crie um app em developers.facebook.com com o produto Login do Facebook.
2. Em `.env.local`, defina `META_APP_ID` e `META_APP_SECRET`.
3. Cadastre `http://localhost:3000/api/ig/callback` (ou o seu domínio) como URI de redirecionamento.
4. A conta do Instagram precisa ser profissional e ligada a uma Página do Facebook.

Escrito conforme a documentação oficial e testado apenas com a Meta **simulada**. Nunca rodou contra uma conta real.

## Sem custo

Nada aqui cobra: dados no seu computador, textos por modelo local, publicação pela API oficial da Meta e, se você quiser, IA no plano gratuito. Passo a passo em [`replica/guia-gratis.md`](replica/guia-gratis.md).

Com o atalho aberto, o app publica o que você agendou, coleta os números uma vez por dia e guarda 14 cópias diárias em `data/backups/`.

## O que não está pronto

- Instagram (conexão, coleta e publicação) e IA gratuita: testados só com respostas simuladas.
- Dados de perfis de terceiros e sugestão de perfis: a API oficial não entrega.
- Envio de vídeo em servidor na Vercel.
- Comparação visual com o app de referência: faltam capturas das telas dele.
- Sem IA, os textos saem de modelos fixos.

## Documentos do projeto

Em `replica/`: `recon.md`, `architecture.md`, `features.csv`, `parity.md`, `test-plan.md`, `bugs.md`, `fixes.md`, `brand.md`, `launch/launch-plan.md`, `deploy.md`, `guia-gratis.md`.
