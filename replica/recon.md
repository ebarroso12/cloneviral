# Recon map: Sistema Viral (web, pt-BR)

Scope: o app inteiro como visto na conta autorizada do Edson (cliente: mentora Instagram). Prioridade de fidelidade: tela **Métricas** e todas as fórmulas.
For: produto próprio do Edson (clone fiel de funções; marca, textos e assets serão próprios, ver replica-brand).
Date: 2026-11-26

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | conta logada (autorizada pelo dono) | https://sistemaviral.app.br/ | lida pelo navegador do usuário, a pé, sem crawler, sem JS bundle, sem rede |
| 2 | tooltips "Como eu chego..." na própria tela | /metricas | fonte das definições de Visualizações e Autenticidade |
| 3 | tela Meu plano | /meu-plano | custos em créditos, plano START |

Termos: não verificados. A conta é do próprio usuário; clone sai rebrandado antes de qualquer lançamento.

## Core loop

Conectar o Instagram, medir o perfil, e transformar o que performou (Varredura) em roteiros/carrosséis/séries/iscas escritos com a voz da pessoa (Persona + Meu Negócio), gastando créditos, e agendar a publicação.

## Navegação (4 fases + exclusivos)

1 Configurar: Conexões, Persona, Meu Negócio, Identidade Visual
2 Planejar: Varredura, Notícias, Ideias
3 Criar: Roteiro, Carrossel, Série, Isca de Alto Valor, CopyCut (marcado "Em breve")
4 Publicar: Planejador Editorial
Exclusivos: Perfil Pronto, Círculo dos 100
Topo direito: avatar com menu (perfil, trial/créditos, Meu plano, Sair). Menu lateral vira dialog no mobile ("Abrir menu"/"Fechar menu").

## Screens

| ID | screen | route | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Métricas | /metricas (e /) | painel do perfil | seletor de período (Hoje, Ontem, 7 dias, 30 dias), cartão do perfil, 4 KPIs, 2 sparklines, análise de engajamento, nota de autenticidade, ações urgentes, interações por formato, faixa etária, gênero, países, cidades, top 12 posts, tabela últimos posts | preenchido, "todos os dias medidos", dias faltantes |
| S02 | Conexões | /conexoes | Instagram (autorização 90 dias, refazer, desconectar) e Anúncios Meta (somar visualizações pagas, só leitura) | cartão por integração, botões Refazer autorização, Desconectar, Conectar | conectado, a renovar até data |
| S03 | Persona | /persona | cliente ideal: dor, desejo, objeção, decisão; barra de "afinada" | barra de progresso, perguntas, documento de persona gerado (67 mil caracteres) | pronta, 100% afinada |
| S04 | Meu Negócio | /meu-negocio | 7 partes: Quem você é, Oferta, Diferencial, Prova, Onde te encontram, Conteúdo, Como você fala | índice de partes, cards editáveis, progresso (93%), campos "ainda sem resposta" | afinado 93%, perguntas faltantes |
| S05 | Identidade Visual | /identidade-visual | wizard 5 passos: marca, cores, tipografia, logo, revisar e usar | stepper, prévia de carrossel, botão "Usar a minha marca nos carrosséis" | não aplicada / aplicada, carregando |
| S06 | Varredura | /varredura | analisa top conteúdos, extrai padrão, escreve lote de roteiros | alvo (Meu perfil, Um perfil, Meu nicho, Um conteúdo), destino (Reel orgânico, Criativo tráfego), tipo (Viral, Emocional, Técnico), tema opcional, quantos analisar, quantos roteiros, duração, lista de varreduras, "organizar padrões" | vazio, rodando, pronto |
| S07 | Notícias | /noticias | notícias dos assuntos com artigo pronto | lista Meus assuntos, Adicionar, Buscar agora (preço por busca) | sem assunto, sem notícia |
| S08 | Ideias | /ideias | kanban de ideias | colunas Banco de ideias, Em produção, Pronto, Publicado; arrastar cartão; Adicionar cartão; mandar virar roteiro | vazio |
| S09 | Roteiro | /roteiro | banco de roteiros | cartão com número, tipo, destino, duração, título, gancho; ações Abrir, Editar, Copiar, Teleprompter, Já gravei, PDF, Regenerar, Excluir | com roteiros da varredura |
| S10 | Carrossel | /carrossel | escreve slides, aprova, depois desenha peça 1080x1440 | tema, direção, padrão da Varredura, idioma, modelo (100 em 13 categorias), identidade visual, imagem (fundo colorido, minha imagem, IA indisponível), Escrever, Gerar exemplo, lista salva | vazio, identidade não aplicada |
| S11 | Modelos de carrossel | modal em /carrossel | catálogo de 100 modelos | filtro por categoria (Autoridade 7, Bastidor 7, Comparação 6, Educativo 11, Erro 4, Lista 9, Objeção 9, Oferta 11, Passo a passo 7, Pergunta 6, Prova social 8, Storytelling 10, Tendência 5), cartão com slides e slides com imagem | |
| S12 | Série | /serie | tema vira N capítulos (cada um um roteiro) | tema, quantidade (7 padrão), custo calculado (2 + 1 por capítulo), padrão, idioma | vazio |
| S13 | Isca de Alto Valor | /isca | material entregue por palavra-chave, revisa e baixa em PDF | origem (colar roteiro, escolher do banco, partir de padrão), palavra-chave, título, 3 créditos | vazio |
| S14 | CopyCut | item de menu | "Em breve" | | desabilitado |
| S15 | Planejador Editorial | /planejador-editorial | calendário do mês, agenda de publicação, vídeos guardados, upload | abas Este mês / Linha editorial, grade de dias, publicações do mês, vídeos guardados, envio MP4/MOV até 100 MB e 3 min, publica como Reels | mês vazio |
| S16 | Linha editorial | aba do Planejador | meta mensal por tipo | 3 contadores: Viral (topo, atrair), Emocional (meio, autoridade), Técnico (fundo, vender); total de peças; Salvar | |
| S17 | Perfil Pronto | /meu-perfil-pronto | documento entregue pela equipe | status, botão Abrir o meu Perfil Pronto (edita a mesma cópia da equipe) | disponível |
| S18 | Círculo dos 100 | /circulo-dos-100 | hub exclusivo com 4 ferramentas | 4 cartões | |
| S18a | Sala de Análise | /circulo-dos-100/sala-de-analise | análise de vídeo antes de postar (resposta em até 3 dias) | abas Roteiro / Vídeo, escolher vídeo, upload MP4/MOV 100 MB 3 min | sem vídeo |
| S18b | Raio-X do Perfil | /circulo-dos-100/raio-x | lê foto, nome, @, bio, destaques; devolve o que mudar | seis partes, dados lidos do perfil, Gerar meu Raio-X | sem Raio-X |
| S18c | LazaStory | /circulo-dos-100/lazastory | assistente de Stories | chat/formulário "O que você quer c..." | visto só de relance |
| S18d | Roteiros (32) | /circulo-dos-100 (cartão) | 32 roteiros prontos para gravar | | não aberto |
| S19 | Meu plano | /meu-plano | plano, créditos, custo por criação, extrato | cota, tabela de custos, extrato (cobrado, devolvido, usado), Quero mais créditos, Gerenciar assinatura | trial |
| S20 | Menu da conta | popover do avatar | nome, e-mail, Ver o meu perfil, Trial/créditos, Meu plano, Sair | | |
| S21 | Modal de post | modal em S01 | preview do post com "Abrir no Instagram" | embed do post | |

Não explorado (pedir ao dono, sem gastar crédito): Ver o meu perfil (S20), LazaStory e Roteiros do Círculo em detalhe, Perfil Pronto (página externa), abrir Roteiro, resultado de Varredura, tela de Persona com as perguntas, fluxo de pagamento (Hotmart-like, não clonar).

## Métricas: fórmulas (verificadas contra os números da tela)

Dados (por post, vida inteira): views, reach, likes, comments, saves, shares, type, published_at, caption, permalink. Conta: followers, following, media_count, snapshot diário de followers e de reach.

- Seguidores, Seguindo, Publicações: última coleta (não mudam com o período). Data/hora da última sincronização exibida.
- Visualizações (orgânico): soma das views de todas as publicações, vida inteira, desde 02/06/2021 (tooltip). Não inclui anúncio. Com Anúncios Meta conectado, o cartão passa a mostrar total com partes de publicação e de anúncio.
- Crescimento de seguidores: variação de followers entre início e fim do período; sparkline de snapshots diários; texto "+N seguidores, últimos D dias". Hoje/Ontem/7 dias usam janela mínima de 7 dias na sparkline (observado: 20/11 a 26/11 e 19/11 a 26/11); 30 dias usa o histórico medido desde a conexão (observado: 10 dias medidos, a conta começou a ser medida em 17/11/26).
- Alcance diário: série diária de contas alcançadas; "todos os dias do período foram medidos" ou aviso de lacunas. Janela 30 dias = 29/10 a 26/11.
- Engajamento real = (likes+comments+saves+shares) / reach, somando todos os posts. Observado: 176,5 mil / 815,7 mil = 21,63%.
- Sobre seguidores = interações médias por post / followers. Observado: (176,5k / 2010 posts) / 10.993 = 0,80%.
- Alcance sobre seguidores = reach médio por post / followers. Observado: (815,7k / 2010) / 10.993 = 0,037, exibido 0,04.
- Alcance total = soma do reach dos posts. Interações totais = soma de likes+comments+saves+shares.
- Faixa saudável de engajamento real: 3% a 6%. Mensagem: abaixo, dentro ou "acima da faixa esperada".
- Autenticidade (0 a 100, "minha estimativa, não é nota do Instagram"): três sinais.
  - Alcance, até 44 pontos: reach médio por post / followers; saudável começa em 15%. Linear até o teto (observado 3,7% ⇒ ~10,8 pts).
  - Engajamento, até 30 pontos: (likes+comments) médios por post por 100 seguidores; saudável começa em 5,0. Observado 0,8 ⇒ ~4,8 pts.
  - Comentários por curtida, até 26 pontos (inferido: 100 − 44 − 30). Observado 5,5% ⇒ nota total 27 implica ~11 pts, compatível com teto em ~12,5% (HIPÓTESE, calibrar com mais contas).
  - Lista "Ações urgentes": só sinais abaixo do saudável, ordenados por quanto devolvem à nota; vazio se nenhum.
- Interações por tipo de conteúdo: agrupa por Imagem, Reels e vídeos, Carrossel; nº de posts, interações, e quebra em curtidas, comentários, salvamentos, compartilhamentos.
- Quem segue você: faixa etária (13-17, 18-24, 25-34, 35-44, 45-54, 55-64, 65+) e gênero (Feminino, Masculino, Não informado); total do "recorte" (< total de seguidores porque a Meta só classifica parte).
- De onde eles são: países e cidades (45 cada, top 30 exibidos), com contagem e % do recorte.
- Posts que mais deram certo: top 12 por métrica selecionável (Visualizações padrão, Alcance, Curtidas, Comentários, Salvamentos, Compartilhamentos), cartão com thumbnail, views, data relativa, legenda truncada, 5 métricas; clique abre modal com o post e "Abrir no Instagram". Observado: ao ordenar por outra métrica alguns cartões mostram "0 visualizações" (dado sem views), tratar no clone.
- Últimos posts: tabela com TODOS os posts (2000 carregados), colunas Post (legenda), Publicado, Tipo, Visualizações, Alcance, Curtidas, Comentários, Salvamentos, Compartilhamentos. Sem paginação visível; no clone, virtualizar.
- Texto fixo: "O período vale para Crescimento de seguidores e Alcance diário. O resto não muda."

## Créditos e plano

- Trial 30 dias com 30 créditos. Plano START R$ 97/mês, 100 créditos renovados por mês (valem após pagamento).
- Custos: Roteiro 1; Análise de um perfil 2; Carrossel 2; Isca 3; Persona 8; Série de 7 capítulos 9 (2 + 1 por capítulo); Varredura de 10 roteiros 14 (observado 8 na varredura de 5; "Sugestão de perfis" 12 com devolução de 6 quando rendeu menos). Foto enviada ao carrossel não gasta crédito. Imagem por IA: indisponível ("Em breve").
- Extrato: cobrado, devolvido (com motivo), usado, saldo.
- Regra de produto: cobrar na criação, devolver a diferença se o resultado for menor que o previsto.

## Flows

```
F01 Conectar e medir
    S02 Conexões -> (OAuth Meta, autorização 90 dias) -> S01 Métricas
    edge: autorização vencendo, trocar Página sem desconectar, medir só desde a conexão
F02 Configurar voz
    S03 Persona -> S04 Meu Negócio -> S05 Identidade Visual
    edge: persona criada pela equipe (Perfil Pronto) não muda ao editar respostas
F03 Descobrir o que funciona
    S06 Varredura (alvo, destino, tipo, quantidade) -> S09 Roteiro (lote)
    edge: sem tipo marcado bloqueia; resultado menor que previsto devolve crédito
F04 Criar conteúdo
    S09 Roteiro | S10 Carrossel (escrever, aprovar, desenhar) | S12 Série | S13 Isca (PDF)
F05 Planejar e publicar
    S08 Ideias -> S09 Roteiro -> S15 Planejador (agendar dia) -> publica como Reels
    edge: dia passado fica apagado; vídeo MP4/MOV até 100 MB e 3 min
F06 Comprar créditos
    S20 menu -> S19 Meu plano -> Quero mais créditos (checkout externo)
F07 Círculo dos 100
    S18 -> Sala de Análise (vídeo, resposta em até 3 dias) | Raio-X | LazaStory | Roteiros
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Sidebar com fases numeradas | ativa, "Em breve" | colapsado em dialog no mobile | todas |
| Chips de período | Hoje, Ontem, 7 dias, 30 dias | aria-pressed | S01 |
| KPI card | azul (seguidores), neutro | com tooltip (i) | S01 |
| Sparkline SVG com aria-label descritivo | seguidores, alcance | todos os dias medidos / lacunas | S01 |
| Tooltip "Como eu chego" | visualizações, autenticidade, ações urgentes | hover/click | S01 |
| Barra de faixa saudável | esperado 3 a 6% | abaixo, dentro, acima | S01 |
| Card de formato | imagem, reels, carrossel | | S01 |
| Barras percentuais | idade, gênero, países, cidades | | S01 |
| Card de post | tipo, views, data relativa, métricas | | S01 |
| Tabela de posts | 9 colunas | 2000 linhas | S01 |
| Progresso "Afinado N%" | | | S03, S04 |
| Stepper de 5 passos | | | S05 |
| Seletor segmentado | alvo, destino, tipo, origem | | S06, S13 |
| Kanban com drag | 4 colunas | vazio | S08 |
| Calendário mensal | | dia passado apagado | S15 |
| Upload de vídeo | | | S15, S18a |
| Modal de catálogo com filtros | 13 categorias | | S11 |
| Menu da conta | | trial | S20 |

## Inferred data model

```
User            id, name, email, plan (trial|start), trial_ends_at, credits_balance
IGConnection    user_id, ig_user_id, page_id, token (criptografado), authorized_until, measuring_since, status
AdsConnection   user_id, ad_account_id, token, status            (opcional, só leitura)
IGAccountSnap   user_id, date, followers, following, media_count, reach_day   evidence: sparklines, cartão de perfil, confidence: high
IGMedia         id, user_id, type (IMAGE|VIDEO|CAROUSEL_ALBUM), published_at, caption, permalink, thumbnail_url,
                views, reach, likes, comments, saves, shares, synced_at   evidence: tabela e top 12, confidence: high
IGAudience      user_id, snapshot_at, age_gender json, countries json, cities json, classified_total   confidence: high
Persona         user_id, answers json, document (texto longo), source (app|equipe), updated_at, tuned_pct
Business        user_id, name, brand, offer (principal, entrada, premium), differentiator, method, proof,
                channels (ig, tiktok, youtube, whatsapp, site), content_focus, voice (style, reference, never, always, cta), tuned_pct
BrandKit        user_id, name, colors, fonts, logo_url, applied
Sweep           id, user_id, target (profile|one|niche|content), dest (reel|ad), types[], theme, analyze_n, scripts_n, duration, status, cost, refund
Pattern         id, sweep_id, user_id, structure json
Script          id, user_id, source (sweep|series|manual), type (viral|emocional|tecnico), dest, seconds, title, body, series_id, recorded bool
Carousel        id, user_id, theme, pattern_id, template_id, language, slides json, brand_applied, image_mode, rendered_urls
Series          id, user_id, theme, chapters_n, status
LeadMagnet      id, user_id, keyword, title, source_script_id, body, pdf_url
Idea            id, user_id, column (bank|producing|ready|published), text, script_id
NewsTopic       id, user_id, text, active ; NewsItem (topic_id, title, url, article)
EditorialLine   user_id, viral_n, emocional_n, tecnico_n
ScheduledPost   id, user_id, date, script_id|video_id, status
Video           id, user_id, file_url, duration, size, w, h
CreditLedger    id, user_id, at, kind (charge|refund|grant), amount, label, note
VideoAnalysis   id, user_id, video_id, status, report (até 3 dias)
ProfileXray     id, user_id, report
```

## Feature matrix

Ver `replica/features.csv`.

## What cannot be cloned (skip)

- Dados e conta Instagram do dono (cada usuário conecta o seu via OAuth Meta, com app Meta próprio e revisão).
- Documento Perfil Pronto, os 32 roteiros e a LazaStory (conteúdo e equipe do Círculo dos 100).
- Pagamento/assinatura (Hotmart ou similar): usar Stripe/Mercado Pago próprio.
- Geração por IA de imagem (nem o original tem hoje).
- Conteúdo dos 100 modelos de carrossel (arte e textos do original): criar modelos próprios.
- Textos, logo, nome e cores do Sistema Viral.

## Size

17 telas + 4 subtelas do Círculo, 7 fluxos, ~22 entidades. Partes difíceis: (1) integração Instagram Graph API com insights de audiência, views e anúncios (app review da Meta); (2) pipeline de IA com custos em créditos, devolução e padrões da Varredura; (3) render de carrossel 1080x1440 e agendamento de Reels. Tamanho: L (um trimestre para paridade total); fatia de Métricas: M.

## Next

`/replica-architect`
