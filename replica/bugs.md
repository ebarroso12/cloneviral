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
| BUG-015 | S4 | ajuda "i": passar o mouse abria e o clique fechava | fluxo no navegador falhou | corrigido |
| BUG-016 | S3 | ícones entravam no nome lido por leitor de tela; botão de menu aparecia no computador; quarto indicador e calendário desalinhados; texto longo estourava a largura no celular | fluxos no navegador e capturas | corrigido |
| BUG-017 | S2 | 7 dias, Hoje e Ontem contavam posições na lista e erravam com dias sem coleta | teste: 100 em vez de 50 | corrigido |
| BUG-018 | S2 | falha da Meta era engolida e gravava zero por cima da métrica | teste BUG-018 | corrigido |
| BUG-019 | S2 | sincronização sem prazo, post a post | teste BUG-019 | corrigido: para no prazo e continua depois |
| BUG-020 | S1 | no servidor sem banco externo, o app aceitaria dados num disco descartável | teste BUG-020 (módulo novo) | corrigido |
| BUG-021 | S1 | Next 15.1.6 e React 19.0.0 com vulnerabilidades críticas, entre elas execução remota de código | `npm audit` | corrigido: Next 15.5.29, 0 vulnerabilidades |

## A verificar (não reproduzido)

- Integração com conta real do Instagram: nomes de métricas, audiência e prazos.
- `SupabaseStore` contra um Supabase real.
- Busca de notícias contra o feed real.
- Alcance do dia atual pode vir com a data deslocada, conforme o `end_time` da Meta.
- Qualidade dos textos sem IA: frases repetidas entre slides.
