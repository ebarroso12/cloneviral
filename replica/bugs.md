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
| BUG-022 | S1 | uma chave paga de IA presente no ambiente do computador seria usada sem aviso | teste BUG-022 (função nova; comportamento confirmado na leitura) | corrigido: só com `RV_ALLOW_PAID_AI=1` |
| BUG-023 | S2 | conta recém-criada, sem persona, quebrava ao criar roteiro sem tema | teste: `s is not iterable` | corrigido |
| BUG-024 | S1 | clique duplo em Agendar criava dois posts automáticos, e o formulário mantinha vídeo e publicação automática para o próximo | teste REV-1 | corrigido |
| BUG-025 | S1 | publicação automática marcada em horário passado saía no minuto seguinte | teste REV-2 | corrigido: recusa; a API genérica não cria agendamento |
| BUG-026 | S1 | post apagado ou adiado durante o envio de outro era publicado assim mesmo | teste REV-3 | corrigido |
| BUG-027 | S1 | resposta perdida da Meta virava "falhou", convidando a publicar em dobro | teste REV-4 | corrigido: confere o contêiner ou marca "conferir" |
| BUG-028 | S1 | com duas Páginas ligava a primeira; trocar de conta misturava históricos e mantinha agendados | teste REV-5 | corrigido: escolha, confirmação e cópia do histórico |
| BUG-029 | S2 | primeira coleta inventava 30 dias de seguidores iguais aos de hoje | teste REV-6 | corrigido |
| BUG-030 | S2 | coleta com erro repetia a cada minuto, sem aviso na tela, e podia rodar duas vezes juntas | teste REV-7 | corrigido |
| BUG-031 | S1 | falha ao gravar o banco local se perdia; cópia ilegível podia empurrar as boas para fora | teste REV-8 | corrigido |
| BUG-032 | S2 | Login do Facebook para Empresas (config_id) não era suportado e permissões faltando não eram avisadas | teste REV-9 | corrigido conforme a documentação, sem teste real |
| BUG-033 | S3 | post sem métrica na Meta era pedido para sempre, atrasando os outros | teste REV-10 | corrigido |
| BUG-034 | S3 | abrir o atalho duas vezes terminava em erro de porta ocupada | teste "Atalho aberto duas vezes" | corrigido |

Também ajustado sem teste que o reproduzisse: a versão padrão da API da Meta passou de v21.0 para v27.0, a dos exemplos atuais da documentação.

## A verificar (não reproduzido)

- Integração com conta real do Instagram: nomes de métricas, audiência, prazos e publicação de Reels.
- IA gratuita com chave de verdade, inclusive o nome do modelo.
- `SupabaseStore` contra um Supabase real.
- Busca de notícias contra o feed real.
- Alcance do dia atual pode vir com a data deslocada, conforme o `end_time` da Meta.
- Qualidade dos textos sem IA: frases repetidas entre slides.

BUG-024 a BUG-033 vieram de uma revisão independente do código.
