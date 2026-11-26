# Deploy: Radar Viral

Data: 26/11/2026. Autorização do dono para publicar: **ainda não pedida**. Nada foi publicado.

## Verificação prévia

| item | situação |
| --- | --- |
| testes de unidade | 47 de 47 |
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

## Para publicar, quando for o caso
1. Dono cria um projeto Supabase **novo** para este app e roda `supabase/migrations/0001_app_docs.sql`.
2. Variáveis no servidor: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RV_SECRET`, `CRON_SECRET`, `APP_URL`, `META_APP_ID`, `META_APP_SECRET`. Não definir `RV_DEMO`.
3. Logo após publicar, criar a conta do dono: o primeiro cadastro vira dono, então não divulgue o endereço antes disso.
4. `vercel.json` agenda a coleta diária às 9h UTC.

## Limitações conhecidas num servidor
- Envio de vídeo responde que não está disponível (falta enviar direto ao Storage).
- `SupabaseStore` nunca foi exercitado contra um Supabase real.
- A trava de cobrança dupla vale dentro de uma instância do servidor.
- A coleta com muitos posts precisa de várias execuções, porque cada uma para antes do limite de tempo.
