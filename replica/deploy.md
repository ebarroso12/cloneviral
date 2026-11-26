# Deploy: Radar Viral

Data: 26/11/2026. Autorização do dono para publicar: **ainda não pedida**. Nada foi publicado.

## Verificação prévia

| item | situação |
| --- | --- |
| testes de unidade | 71 de 71 |
| fluxos no navegador | 35 de 35 |
| build de produção | passa (Next 15.5.29) |
| auditoria de dependências (`npm audit`) | 0 vulnerabilidades |
| defeitos S1 ou S2 abertos | nenhum reproduzido; ver a lista "a verificar" em `bugs.md` |
| paridade: obrigatórias | ver `parity.md`; as que faltam dependem de conta real (reprovado até testar) |
| varredura de marca | limpa |
| política de privacidade e termos | existem em `/privacidade` e `/termos`, texto de uso pessoal; sem revisão jurídica |
| exclusão de conta | existe, com senha |
| favicon e imagem social próprios | favicon sim; imagem social não |

Pela regra da fase, com itens reprovados o deploy público fica parado. O uso no próprio computador não depende dele e não tem custo.

Num servidor gratuito a publicação agendada precisaria de um agendador externo e o envio de vídeo não funciona; por isso o uso local é o recomendado.

## Para publicar (autorizado pelo dono em 26/11/2026, ainda não publicado)

Bloqueios: a criação do projeto Supabase foi negada pela trava de permissões da ferramenta; a conta da Vercel disponível no conector não enxerga o GitHub `ebarroso12`.

1. Criar um projeto Supabase gratuito, novo, só deste app (região São Paulo).
2. Importar `ebarroso12/cloneviral` na Vercel (instala o app da Vercel no GitHub).
3. Aplicar `supabase/migrations/0001_app_docs.sql` e `0002_acesso_por_segredo.sql`; gerar `RV_DB_KEY` e gravar só o sha256 em `private.rv_key`.
4. Variáveis na Vercel: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `RV_DB_KEY`, `RV_SECRET`, `RV_SIGNUP_CODE`, `CRON_SECRET`, `APP_URL`. Não definir `RV_DEMO`.
5. Publicar, criar a conta do dono com o código e testar no endereço público.

A regra de acesso foi provada num Postgres embutido (`e2e/rls.mjs`): com o segredo lê e grava; sem ele, ou com segredo errado, nada. Nunca testada num Supabase real.

## Limitações conhecidas num servidor
- Envio de vídeo responde que não está disponível (falta enviar direto ao Storage).
- `SupabaseStore` nunca foi exercitado contra um Supabase real.
- Publicação automática de Reels não funciona no servidor: depende do vídeo, que só pode ser guardado no computador.
- O plano gratuito da Vercel é para uso não comercial.
- A trava de cobrança dupla vale dentro de uma instância do servidor.
- A coleta com muitos posts precisa de várias execuções, porque cada uma para antes do limite de tempo.
