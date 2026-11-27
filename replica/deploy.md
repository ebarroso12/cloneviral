# Deploy: Radar Viral

Data: 26/11/2026. **Publicado** em https://cloneviral-iota.vercel.app (Vercel, time `edsonbdados-9184`, projeto `cloneviral`, região gru1). Banco: Supabase `wwflyczpnizlmnzczqsl`.

Atenção: o projeto da Vercel está ligado à cópia `edsonbdados-Bancodados/cloneviral`, não a `ebarroso12/cloneviral`. A conta `ebarroso12` é colaboradora da cópia e o `git push origin` do computador do dono grava nas duas.

## Provas no endereço público
- `SupabaseStore` contra o banco real: gravar, ler, buscar, alterar e apagar; com segredo errado ou sem segredo, nada.
- Conta temporária: cadastro só com o código, 17 telas respondendo 200, ideia persistida, varredura com texto colado, créditos descontados (retirados depois), PDF, segundo cadastro recusado, exclusão da conta. Banco com 0 registros depois.
- Não testado: Instagram, Gemini, execução do cron diário, aparência das telas no navegador.

## Verificação prévia

| item | situação |
| --- | --- |
| testes de unidade | 72 de 72 |
| fluxos no navegador | 35 de 35 |
| build de produção | passa (Next 15.5.29) |
| auditoria de dependências (`npm audit`) | 0 vulnerabilidades |
| defeitos S1 ou S2 abertos | nenhum reproduzido; ver a lista "a verificar" em `bugs.md` |
| paridade: obrigatórias | ver `parity.md`; as que faltam dependem de conta real (reprovado até testar) |
| varredura de marca | limpa |
| política de privacidade e termos | existem em `/privacidade` e `/termos`, texto de uso pessoal; sem revisão jurídica |
| exclusão de conta | existe, com senha |
| favicon e imagem social próprios | favicon sim; imagem social não |

## Publicação agendada no site
`.github/workflows/publicar.yml` chama `/api/cron/publish` a cada 10 minutos (grátis em repositório público; o GitHub pode atrasar). Precisa do segredo `CRON_SECRET` em `ebarroso12/cloneviral`, Settings, Secrets and variables, Actions, com o mesmo valor da Vercel. Cadastrado; em 27/11/2026 as execuções agendadas terminavam com sucesso (a das 10:37 UTC sem aviso no registro). Publicação de um item real ainda não testada. O GitHub desliga agendamentos de repositório parado por 60 dias.

## Limitações conhecidas num servidor
- Vídeo no site: até 50 MB por arquivo e 150 MB no total, em pedaços no banco; apagado depois de publicado. Provado no banco real com 6 MB; não testado pelo navegador no site.
- O plano gratuito da Vercel é para uso não comercial.
- A trava de cobrança dupla e a de publicação valem dentro de uma instância do servidor.
- A coleta com muitos posts precisa de várias execuções, porque cada uma para antes do limite de tempo.
