# Busca no Google pelo nome: desenho curto

Data: 27/11/2026. Estado: aprovado pelo dono em 27/11/2026.

## Intenção
Ver no Radar Viral o caminho: busca pelo nome no Google → clique → chegada ao site www.dredsonbarroso.com.br.

## Objetivos
- Botão "Conectar Google" (somente leitura) na tela Conexões, com "Desconectar".
- Bloco "Google" na tela Métricas, com períodos de 7, 28 e 90 dias:
  1. vezes que o site apareceu em buscas com o nome (Search Console);
  2. cliques nessas buscas, taxa de clique e posição média (Search Console);
  3. visitas ao site vindas da busca orgânica do Google (Analytics);
  4. cliques no WhatsApp nessas visitas (evento `generate_lead`, Analytics) — proposta do agente.
- Lista dos termos buscados que contêm o nome.
- Termo do nome editável (proposta inicial: "edson barroso").

## Não objetivos
Google Meu Negócio (cota zero), Google Ads, alterar o site, gravar qualquer coisa na conta Google, outros clientes além do dono.

## O que seria um fracasso
- Mostrar zero quando o dado não foi coletado. Sem conexão, erro ou falta de permissão aparecem como aviso e `--`.
- Apresentar os passos 3 e 4 como se fossem só de buscas pelo nome. O Analytics não informa a palavra buscada: eles contam **todas** as visitas da busca orgânica do Google. A tela diz isso.
- Ler a propriedade errada. Nada de "a primeira da lista": o site e a propriedade são escolhidos pelo dono e mostrados na tela.

## Restrições
- Custo zero. Repositório público: sem chave, token ou dado pessoal no código.
- Projeto no Google Cloud novo, separado do dashboard pessoal.
- Escopos: `webmasters.readonly` e `analytics.readonly`. Habilitar antes as APIs Search Console, Analytics Data e Analytics Admin.
- Tela de autorização publicada ("Em produção"); em modo de teste a conexão cai a cada 7 dias. Aviso de app não verificado é esperado; confirmar no painel ao configurar.
- O site precisa estar verificado no Search Console (a tag atual do site tem texto de exemplo; conferir outro método na conta).
- Dados da busca atrasam alguns dias e termos raros ficam ocultos; a tela informa.

## Abordagens
1. Conta-robô (service account): sem tela de autorização, porém mais passos no painel e um arquivo de chave para guardar. Era a recomendada pelo agente.
2. **Botão "Conectar Google" (escolhida pelo dono):** uso diário simples; exige configurar e publicar a tela de autorização.

## Como (decisões do agente, para o dono corrigir)
- Seguir o padrão da Meta: ID e segredo do cliente OAuth gravados pelo dono na tela Conexões, segredo cifrado (como em `lib/metaApp.ts`).
- Retorno: `https://cloneviralapp.vercel.app/api/google/callback`, com proteção `state`.
- Token de atualização cifrado; só o dono conecta e vê.

## Fica a cargo de quem construir
Layout do bloco, cache das consultas, nomes de arquivos e testes (Google simulado nos testes; prova real depois da conexão).

## Mudança aprovada em 27/11/2026
O site não está verificado no Search Console e o dono escolheu não verificar agora. O site passa a ser opcional: sem ele, o bloco mostra só os passos 3 e 4 e explica a falta dos outros dois (nunca zero).
