# Ligar o Instagram e a IA sem gastar

Os dois passos são feitos por você, porque exigem a sua conta e a sua senha. Os nomes dos botões nos sites podem ter mudado.

## 1. Instagram (gratuito)

Antes: a conta do Instagram precisa ser **profissional** (Comercial ou Criador) e estar ligada a uma **Página do Facebook** que você administra.

1. Entre em developers.facebook.com com o seu Facebook e crie um app.
2. Adicione o produto **Login do Facebook para Empresas**; a publicação de Reels por envio direto exige esse produto. Dentro dele, crie uma **configuração** com as permissões listadas abaixo e copie o **ID da configuração** para `META_CONFIG_ID` (passo 5). Se o seu app só oferecer o Login do Facebook comum, deixe `META_CONFIG_ID` em branco.
3. Deixe o app em **modo de desenvolvimento**. Para a sua própria conta não é preciso enviar para análise; nesse modo a Meta aceita o retorno para `localhost`. Se pedir o endereço de retorno, use `http://localhost:3000/api/ig/callback`.
4. Em configurações básicas, copie o **ID do app** e a **chave secreta**.
5. Abra o arquivo `.env.local` na pasta do app com o Bloco de Notas e acrescente, sem apagar a linha `RV_SECRET`:

```
META_APP_ID=cole-aqui
META_APP_SECRET=cole-aqui
META_CONFIG_ID=cole-aqui
```

6. Feche e abra o app. Vá em **Conexões** e clique em **Conectar Instagram**.

Permissões usadas: `instagram_basic`, `instagram_manage_insights`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`, `business_management`.

Não cole a chave secreta em conversas nem a envie para o GitHub.

Conexão e coleta provadas com uma conta real em 27/11/2026. Se aparecer erro, copie a mensagem (sem chaves) e me mande.

### No site publicado (em vez do computador)

- Endereço de retorno na Meta: `https://cloneviral-iota.vercel.app/api/ig/callback`.
- Entre como dono, abra **Conexões** e grave o ID do app, a chave secreta e, se houver, o ID da configuração no quadro **Seu app da Meta**. Não precisa mexer na Vercel.
- Para os anúncios, depois de conectar o Instagram use **Autorizar leitura de anúncios** (permissão `ads_read`; com o Login para Empresas, inclua-a na configuração) e então **Conectar anúncios**.

## 2. IA (texto, vídeo e imagem)

No app, abra **IA e integrações**. Em cada quadro escolha o provedor, cole a chave, toque em **Salvar** e depois em **Testar**. Sem IA o app continua funcionando com os modelos próprios.

| para | sem custo | pegar a chave |
| --- | --- | --- |
| texto | Gemini, plano gratuito (`gemini-3.6-flash`) | https://aistudio.google.com/apikey |
| vídeo | Gemini, plano gratuito (`gemini-3.5-flash-lite`), a mesma chave | https://aistudio.google.com/apikey |
| imagem | Cloudflare Workers AI (FLUX): ID da conta e token | https://dash.cloudflare.com/profile/api-tokens |
| texto, reserva | Groq, plano gratuito | https://console.groq.com/keys |

Pagas, só se você marcar a autorização de cobrança (valem só para a conta do dono): Claude (`claude-opus-5-5` ou `claude-sonnet-5-5`), OpenAI (`gpt-6.2-sol`; imagem `gpt-image-2.5-sunburst`), Gemini 4 (`gemini-4-carbon`, preço dobra em 01/12/2026) e Nano Banana 2.1 para imagem.

- Modelos e formatos conferidos nas páginas oficiais em 27/11/2026. Com chave real, só o Gemini gratuito foi testado (texto e vídeo curto); os demais, não. Use o botão **Testar**.
- Gemini: crie a chave em um projeto **sem faturamento ativado**, ou o uso passa a ser cobrado.
- No plano gratuito o provedor pode usar o que for enviado. **Não envie dados nem vídeos de pacientes ou clientes.**

## 3. Publicar Reels sozinho

Com a conta real conectada: **Planejador editorial**, envie o vídeo, escolha o dia, selecione o vídeo e marque **Publicar sozinho no Instagram neste horário**.

- O app precisa estar aberto e o computador ligado no horário.
- Com mais de 6 horas de atraso ele não publica e marca como atrasado.
- Se falhar, ele não tenta de novo sozinho, para nunca publicar em dobro.
- Faça o primeiro teste com um vídeo que não tenha problema se for ao ar.
