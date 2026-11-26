## Parity: 89.0 / 100

features 89.0  (70 counted, must-haves 45 of 53 done)

Not shippable yet: 8 must-have features are not done.

## By area, weakest first
- exclusivos                    62.5  (4 features)
- conexões                      70.8  (5 features)
- publicar                      75.0  (4 features)
- plano                         75.0  (4 features)
- configurar                    80.8  (5 features)
- planejar                      81.2  (10 features)
- criar                         96.0  (9 features)
- métricas                      98.0  (26 features)
- navegação                    100.0  (1 features)
- conta                        100.0  (2 features)

## Missing, in build order
- [must] publicar: Planejador: publicar como Reels no horário marcado, no  (exige app Meta aprovado e vídeo em endereço público)
- [must] conexões: Conectar Instagram via OAuth Meta (conta profissional), partial  (código pronto; nunca testado com app Meta e conta real)
- [must] conexões: Renovar autorização / trocar Página sem apagar histórico, partial  (nunca testado com conta real)
- [must] configurar: Persona: perguntas; documento e % afinada, partial  (documento curto gerado por modelo; o original é muito mais longo)
- [must] métricas: Sincronização do perfil e posts (última sincronização exibida), partial  (coleta manual e diária testadas com a Meta simulada; falta conta real)
- [must] planejar: Varredura: alvo (meu perfil/um perfil/meu nicho/um conteúdo), partial  (só Meu perfil; a API oficial não entrega perfis de terceiros)
- [must] plano: Comprar mais créditos e gerenciar assinatura, partial  (sem pagamento; Quero mais créditos concede pacote sem cobrar)
- [must] plano: Trial 30 dias com 30 créditos; START 100 créditos/mês, partial  (trial concede 30 créditos; não há renovação mensal nem bloqueio no fim)
- [should] criar: Carrossel: usar padrão da Varredura e idioma, partial  (padrão ok; outro idioma só com ANTHROPIC_API_KEY)
- [should] planejar: Notícias: assuntos + Buscar agora + artigo pronto, partial  (busca no feed público não testada; texto do artigo é modelo curto)
- [should] planejar: Varredura: reembolso quando rende menos que o previsto, partial  (estorno de entrega menor existe mas nunca é acionado pelo gerador local)
- [could] configurar: Persona criada pela equipe (Perfil Pronto) não muda ao editar, no
- [could] exclusivos: Sala de Análise de vídeo (resposta em até 3 dias), no  (no original é revisão humana de vídeo; aqui há análise automática dos números)
- [could] planejar: Sugestão de perfis (12 créditos), no  (exige dados de perfis de terceiros)
- [could] conexões: Conectar Anúncios Meta (só leitura) para somar visualizações pagas, partial  (só na demonstração; leitura real (ads_read) não implementada)
- [could] exclusivos: LazaStory (assistente de Stories), partial  (original visto de relance)

## Left out on purpose (not scored)
- Carrossel: imagem por IA: indisponível no original também
- Perfil Pronto (documento entregue pela equipe): conteúdo e equipe do original; existe um Perfil Pronto próprio gerado do negócio
- 32 roteiros prontos: conteúdo do original

## Yours, not in the original (not scored)
- CopyCut
