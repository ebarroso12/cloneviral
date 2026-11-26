# Deploy: Radar Viral

Data: 26/11/2026. Autorização do dono para publicar: **ainda não pedida**. Nada foi publicado.

## Verificação prévia

| item | situação |
| --- | --- |
| testes de unidade | 34 de 34 |
| fluxos no navegador | 30 de 30, duas execuções seguidas |
| build de produção | passa (Next 15.5.29) |
| auditoria de dependências (`npm audit`) | 0 vulnerabilidades |
| defeitos S1 ou S2 abertos | nenhum reproduzido; ver a lista "a verificar" em `bugs.md` |
| paridade: obrigatórias | **45 de 53 (reprovado)**; nota 89,0 |
| varredura de marca | limpa |
| política de privacidade e termos | **não existem** |
| exclusão de conta | **não existe** |
| favicon e imagem social próprios | **não existem** |

Pela regra da fase, com itens reprovados o deploy público fica parado. O uso no próprio computador não depende dele.

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
