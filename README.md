# Radar Viral (cloneviral)

Painel de métricas e máquina de conteúdo para Instagram, reconstruído a partir do mapeamento funcional do Sistema Viral (clean-room: funções e fluxos, sem código, textos, marca ou arte do original).

- `replica/recon.md` — mapa de telas, fluxos, fórmulas das métricas, modelo de dados
- `replica/features.csv` — matriz de funções (paridade via `replica-diff`)
- `lib/` — camada de dados (arquivo local ou Supabase), métricas, créditos, IA
- Stack: Next.js 15 + TypeScript + Supabase (opcional, `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`)

## Rodar

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # testes das fórmulas
```

Sem variáveis de ambiente o app roda em modo demonstração, com dados sintéticos e sem nenhum custo.

## Conta de demonstração

`demo@radarviral.app` / `demo-radar-2026` (dados 100% sintéticos). `npm run seed` recria do zero.

## Conectar o Instagram de verdade

1. Crie um app em developers.facebook.com e adicione o produto Login do Facebook.
2. Defina `META_APP_ID`, `META_APP_SECRET` e `RV_SECRET` (veja `.env.example`).
3. Cadastre `https://SEU_DOMINIO/api/ig/callback` como URI de redirecionamento.
4. Conta do Instagram profissional ligada a uma Página do Facebook. Para usar com outras contas, o app precisa passar pela análise da Meta.

Esta parte foi escrita seguindo a documentação oficial e **não foi testada contra uma conta real**.

## O que não está pronto

- Publicação automática dos posts agendados (`/api/cron/publish` é só um esqueleto).
- Cobrança do plano START (não há gateway; "Quero mais créditos" concede um pacote de demonstração).
- Varredura de perfis de terceiros e sugestão de perfis: a API oficial não entrega esses dados.
