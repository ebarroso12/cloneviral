# Plano de testes: Radar Viral

Fluxos de `replica/recon.md`. Testa-se somente o clone, nunca o original.

Legenda do status: `não rodado`, `passou`, `falhou (BUG-nnn)`, `manual`.

| caso | fluxo | passos | resultado esperado | status |
| --- | --- | --- | --- | --- |
| F01-H1 | Conectar e medir | entrar, abrir Conexões, abrir Métricas | conta conectada e painel preenchido | passou |
| F01-H2 | Conectar e medir | trocar Hoje, Ontem, 7 dias, 30 dias | só crescimento e alcance diário mudam | passou |
| F01-E1 | Conectar e medir | sem app Meta configurado, clicar Conectar | aviso claro, nenhum dado inventado | passou |
| F01-E2 | Conectar e medir | dias sem coleta na série | aviso de dias não medidos | passou (unidade, BUG-017) |
| F01-N1 | Conectar e medir | voltar do OAuth com `state` errado | erro de autorização, nada gravado | não rodado (precisa do retorno da Meta) |
| F01-N2 | Conectar e medir | conta real liga anúncios | recusa, sem número simulado | passou |
| F02-H1 | Configurar voz | salvar Persona, Meu Negócio e Identidade | dados persistem após recarregar | passou |
| F02-E1 | Configurar voz | texto longo, emoji e acento | gravado sem corte nem erro | passou |
| F03-H1 | Varredura | 5 posts, 5 roteiros | 5 roteiros e 8 créditos cobrados | passou |
| F03-N1 | Varredura | nenhum tipo marcado | botão bloqueado e API recusa | passou |
| F03-N2 | Varredura | saldo insuficiente | 402, nenhuma varredura presa em "rodando" | passou |
| F04-H1 | Criar | roteiro, carrossel, série, isca e PDF | cada item salvo e cobrado uma vez | passou |
| F04-E1 | Criar | regenerar um roteiro | o roteiro é substituído, sem cópia extra | passou |
| F04-E2 | Criar | clique duplo em criar com saldo justo | saldo nunca negativo | passou |
| F05-H1 | Planejar | ideia, roteiro, agendar dia | evento aparece no calendário | passou |
| F05-E1 | Planejar | vídeo acima de 100 MB ou 3 min | recusado com mensagem | passou em formato; limites de tamanho e duração não exercitados |
| F06-H1 | Créditos | abrir Meu plano e o extrato | soma do extrato igual ao saldo | passou |
| F07-H1 | Círculo | análise, raio-x, stories | resultados salvos e cobrados | passou |
| SEG-1 | Todos | segundo usuário não vê nem altera dados do primeiro | isolamento | passou |
| SEG-2 | Todos | rotas de API sem sessão | 401 | passou |
| VIS-1 | Todos | largura 390 px e teclado | menu abre, sem rolagem horizontal da página | passou em 390 px; teclado só parcial |

Manual, sem como automatizar hoje: OAuth real da Meta, sincronização com conta real, publicação agendada, cobrança.

Última execução: 26/11/2026, 64 de 64 testes de unidade e 35 de 35 fluxos.
