# Deploy: Radar Viral

Data: 26/11/2026. **Publicado** em https://cloneviral-iota.vercel.app (Vercel, time `edsonbdados-9184`, projeto `cloneviral`, região gru1). Banco: Supabase `wwflyczpnizlmnzczqsl`.

Atenção: o projeto da Vercel está ligado à cópia `edsonbdados-Bancodados/cloneviral`, não a `ebarroso12/cloneviral`. A conta `ebarroso12` é colaboradora da cópia e o `git push origin` do computador do dono grava nas duas.

## Provas no endereço público
- `SupabaseStore` contra o banco real: gravar, ler, buscar, alterar e apagar; com segredo errado ou sem segredo, nada.
- Conta temporária: cadastro só com o código, 17 telas respondendo 200, ideia persistida, varredura com texto colado, créditos descontados, PDF, segundo cadastro recusado, exclusão da conta. Banco com 0 registros depois.
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

## Limitações conhecidas num servidor
- Envio de vídeo responde que não está disponível (falta enviar direto ao Storage).
- Publicação automática de Reels não funciona no servidor: depende do vídeo, que só pode ser guardado no computador.
- O plano gratuito da Vercel é para uso não comercial.
- A trava de cobrança dupla vale dentro de uma instância do servidor.
- A coleta com muitos posts precisa de várias execuções, porque cada uma para antes do limite de tempo.
