# Defeitos: Radar Viral

Só entra aqui o que foi reproduzido (teste que falhou antes da correção). S1 = perda de dado, falha de segurança ou dinheiro; S2 = função quebrada; S3 = contornável; S4 = cosmético.

| ID | sev | defeito no código recebido | como foi reproduzido | situação |
| --- | --- | --- | --- | --- |
| BUG-001 | S1 | quem informava o `id` de um documento alheio o sobrescrevia | teste BUG-001: gravação aceita | corrigido |
| BUG-002 | S1 | IDs fixos faziam uma conta apagar conexão, audiência e histórico de outra | teste BUG-002: conta 1 ficou com 0 conexões | corrigido |
| BUG-003 | S1 | banco local ilegível era tratado como vazio e regravado | teste BUG-003 (falhou por falta de API testável; comportamento confirmado na leitura) | corrigido |
| BUG-004 | S1 | conta demo de senha pública existia também em produção | teste BUG-004 | corrigido |
| BUG-005 | S1 | cadastro aberto a qualquer pessoa em produção | teste BUG-005 | corrigido |
| BUG-006 | S1 | sem `RV_SECRET`, o token do Instagram era cifrado com chave escrita no código | teste BUG-006: nenhuma exceção | corrigido |
| BUG-007 | S1 | duas cobranças simultâneas passavam com saldo para uma | teste BUG-007: 2 cobranças aceitas | corrigido num processo; várias instâncias seguem sem garantia |
| BUG-008 | S2 | falha na criação deixava o crédito cobrado | teste BUG-008 | corrigido |
| BUG-009 | S1 | conta real recebia visualizações de anúncio inventadas (18% do orgânico) | teste BUG-009 | corrigido: a função agora recusa |
| BUG-010 | S1 | conta nova herdava a persona de outra conta | teste BUG-010: veio a persona da demo | corrigido |
| BUG-011 | S1 | cadastro de vídeo pela API genérica permitia apontar para arquivo fora da pasta de envios | teste BUG-011 (falhou por falta do módulo; caminho confirmado na leitura) | corrigido |
| BUG-012 | S2 | "Regenerar" criava um roteiro extra além de reescrever o atual | teste BUG-012 (idem, confirmado na leitura) | corrigido |
| BUG-013 | S3 | token cifrado do Instagram ia para o navegador | teste BUG-013 | corrigido |
| BUG-014 | S3 | cores da identidade visual permitiam injetar marcação no slide | teste BUG-014: `<script>` presente no SVG | corrigido |

## A verificar (ainda não reproduzido)

- Ícone de ajuda "i": no computador, passar o mouse abre e o clique fecha em seguida.
- Sincronização real do Instagram busca métrica post a post; com 2.000 posts deve estourar o tempo de uma função.
- Erros da sincronização são engolidos e deixam métricas zeradas sem aviso.
- Crescimento de Hoje, Ontem e 7 dias conta posições na lista, não datas: com dias faltando, o período fica errado.
- Não há coleta diária automática; o histórico só cresce quando se clica em sincronizar.
