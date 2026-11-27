export const metadata = { title: "Privacidade · Radar Viral" };
export default function Page() {
  return (
    <main className="content" style={{ margin: "0 auto" }}>
      <h1>Privacidade</h1>
      <p>Esta instalação do Radar Viral é de uso pessoal. Quem a mantém é o próprio dono da conta.</p>
      <h2>O que é guardado</h2>
      <p>E-mail e senha (a senha só em forma embaralhada, que não pode ser revertida), as respostas sobre o seu negócio, os textos e vídeos criados ou enviados e, se você conectar, os números da sua conta do Instagram e a chave de acesso cifrada. Se você conectar o Google, ficam guardados a chave de acesso cifrada e as suas escolhas (site, propriedade e nome pesquisado); os números do Search Console e do Analytics são consultados na hora e não são guardados. O acesso é somente de leitura.</p>
      <h2>Onde fica</h2>
      <p>No computador onde o app está instalado, na pasta de dados, ou no banco que o dono configurar.</p>
      <h2>Com quem é compartilhado</h2>
      <p>Meta (Instagram), para ler os números e publicar o que você agendar. Google (Search Console e Analytics), só para ler os números, que não são repassados a terceiros nem enviados a IA. Google Notícias, que recebe os assuntos que você pedir para buscar. Se você configurar uma IA, o provedor dela recebe o seu negócio, a sua persona e o tema pedido, a descrição das imagens pedidas e os vídeos que você mandar analisar; no plano gratuito, o provedor pode usar esse texto para melhorar os modelos, portanto não inclua dados de pacientes ou de clientes.</p>
      <h2>Como apagar</h2>
      <p>Em Minha conta, Excluir a conta. Para revogar o acesso ao Instagram, remova também o app nas configurações da sua conta da Meta. No Google, use Desconectar na tela Conexões ou retire o acesso em myaccount.google.com/permissions.</p>
    </main>
  );
}
