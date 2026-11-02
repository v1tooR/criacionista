/**
 * Gera politica-de-privacidade.html a partir do esqueleto de contato.html.
 *
 * A casca (head, barra de prévia, chave de modo, cabeçalho, rodapé, scripts) é
 * copiada em vez de reescrita: é a mesma de todas as páginas e copiar garante
 * que ela não divirja. Só o miolo é desta página.
 *
 * O TEXTO é a fusão de dois documentos:
 *   - a minuta do cliente ("Politica de Privacidade-LGPD(Clube Criacionista).docx",
 *     recebida em 20/10/2026), que dá a espinha e a numeração;
 *   - a nossa, que entra com o que faltava — sobretudo a seção de crianças.
 *
 * O mapa de o-que-veio-de-onde está em wix-handoff/privacidade-revisao.md.
 * É esse arquivo que o jurídico do cliente deve ler junto com a página.
 *
 * Rodar de novo é seguro — o arquivo é reescrito do zero.
 *
 * Uso:  node scripts/gera-privacidade.js
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const MOLDE = path.join(RAIZ, 'contato.html');
const SAIDA = path.join(RAIZ, 'politica-de-privacidade.html');

const molde = fs.readFileSync(MOLDE, 'utf8');

/* a casca vai até o fim do <header>, e volta a partir do <footer> */
const corteTopo = molde.indexOf('</header>') + '</header>'.length;
const corteBase = molde.indexOf('<footer class="ftr">');
if (corteTopo < 20 || corteBase < 0) {
  console.error('Não achei <header>/<footer> em contato.html — o molde mudou de forma.');
  process.exit(1);
}

let topo = molde.slice(0, corteTopo);
const base = molde.slice(corteBase);

/* --- ajustes da casca para esta página ------------------------------------ */
const trocas = [
  ['<title>Contato | Clube Criacionista de Ciências</title>',
   '<title>Política de Privacidade | Clube Criacionista de Ciências</title>'],
  ['Fale com o Clube Criacionista de Ciências. Dúvidas de pais, professores, parceiros e imprensa.',
   'Como o Clube Criacionista de Ciências coleta, usa e protege os dados de quem visita o site, doa ou inscreve uma criança.'],
  ['<span><b>PRÉVIA</b> · Página Contato</span>',
   '<span><b>PRÉVIA</b> · Política de Privacidade</span>'],
  ['/contato.html', '/politica-de-privacidade.html'],
];
for (const [de, para] of trocas) {
  if (!topo.includes(de)) {
    console.error('Trecho esperado não encontrado no molde: ' + de.slice(0, 60));
    process.exit(1);
  }
  topo = topo.split(de).join(para);
}

/* --- miolo ---------------------------------------------------------------- */
const DEF = '<span class="pill">A DEFINIR</span>';
const DPO = 'contato@clubecriacionista.org';

const miolo = `

<!-- ============ TOPO ============ -->
<section class="phero" id="top">
  <div class="orb orb--1"></div>
  <div class="orb orb--2"></div>
  <div class="phero__in">
    <p class="crumb"><a href="home.html">Home</a> <span>&rsaquo;</span> Política de Privacidade</p>
    <h1>Política de Privacidade</h1>
    <p class="lead">O que o clube coleta, por que coleta, com quem divide e o que você pode pedir a qualquer momento. Escrito para ser lido por quem não é advogado.</p>
  </div>
</section>

<!-- ============ TEXTO ============ -->
<section class="section">
  <div class="wrap wrap--txt">

    <div class="note" data-previa>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 8h.01M11 12h1v4h1"/></svg>
      <div><b>Minuta para revisão jurídica.</b> Este texto junta a minuta enviada pelo clube com as seções que faltavam para cobrir a LGPD num site frequentado por crianças. Precisa ser conferido por quem responde juridicamente pelo clube, e os campos marcados como <b>A DEFINIR</b> precisam ser preenchidos. Esta tarja sai do ar junto com eles.</div>
    </div>

    <div class="post__corpo" style="margin-top:28px">

      <p><b>Última atualização:</b> 26 de outubro de 2026</p>

      <h2>1. Introdução</h2>

      <p>Esta Política de Privacidade descreve como o Clube Criacionista de Ciências coleta, usa, armazena e protege dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>

      <p>O clube é frequentado por crianças de 9 a 13 anos. Por isso esta política tem uma seção inteira dedicada a elas — a <a href="#criancas">seção 4</a> —, e é ela que vale sempre que houver qualquer conflito com o resto do texto.</p>

      <p>Onde esta política diz que o tratamento depende do seu consentimento, ele só acontece depois de você marcar a opção correspondente. Navegar pelo site não é consentimento.</p>

      <h2>2. Quem responde pelos seus dados</h2>

      <p>O responsável pelo tratamento dos dados — o <i>controlador</i>, no termo da lei — é:</p>

      <ul>
        <li><b>Razão social:</b> Clube Criacionista de Ciências <span class="pill">REGISTRO EM ANDAMENTO</span></li>
        <li><b>CNPJ:</b> <span class="pill">REGISTRO EM ANDAMENTO</span></li>
        <li><b>Endereço:</b> <span class="pill">EM DEFINIÇÃO, JUNTO COM O REGISTRO</span></li>
        <li><b>Encarregado de Proteção de Dados (DPO):</b> Eliézer Costa Militão</li>
        <li><b>Contato para assuntos de privacidade:</b> <a href="mailto:${DPO}">${DPO}</a></li>
      </ul>

      <h2>3. Dados que coletamos</h2>

      <h3>3.1 Quando você só navega pelo site</h3>

      <p>Coletamos dados técnicos que todo site recebe: endereço IP, tipo de navegador e aparelho, páginas visitadas e tempo de permanência. Servem para manter o site de pé e entender quais conteúdos são úteis. Não usamos isso para montar perfil de ninguém nem para publicidade.</p>

      <h3>3.2 Quando você escreve para o clube</h3>

      <p>No formulário de contato pedimos <b>nome</b>, <b>e-mail</b>, <b>assunto</b> e a <b>mensagem</b>. Usamos só para responder você.</p>

      <h3>3.3 Quando você se inscreve para receber materiais</h3>

      <p>Pedimos <b>nome</b>, <b>e-mail</b>, <b>tipo de inscrição</b> (pai, mãe, professor, coordenador) e <b>gênero</b>, que você pode deixar como “prefiro não informar”. Todo e-mail que enviamos traz um link para cancelar, e o cancelamento é imediato.</p>

      <h3>3.4 Quando você doa ou compra</h3>

      <p>Pedimos <b>nome completo</b>, <b>e-mail</b>, o <b>valor</b> e a <b>forma de pagamento</b>; para compras com entrega, também o <b>endereço</b>. Se escolher doar anonimamente, seu nome não aparece em nenhuma lista pública de apoiadores — mas continua no registro interno, porque doação precisa de rastro contábil.</p>

      <p><b>Dados de cartão não passam por nós.</b> Eles vão direto para o meio de pagamento, que é quem processa a cobrança. O clube não vê e não armazena número de cartão em momento algum.</p>

      <h3>3.5 Quando um responsável inscreve uma criança</h3>

      <p>Coletamos os dados do responsável e o mínimo sobre a criança. O <b>CPF é sempre o do responsável</b> — nunca pedimos CPF de criança. O detalhamento está na seção seguinte.</p>

      <h3>3.6 Quando um responsável resgata um prêmio</h3>

      <p>Os prêmios trocados por pontos são enviados pelos Correios. Para isso pedimos ao responsável o <b>nome de quem vai receber</b>, o <b>CEP</b> e o <b>endereço</b>. Usamos só para o envio, e a equipe que faz a postagem é a única que vê.</p>

      <h2 id="criancas">4. Dados de crianças e adolescentes</h2>

      <p>A LGPD trata dado de criança com regra própria (artigo 14): o tratamento precisa ser feito <b>no melhor interesse da criança</b> e depende de <b>consentimento específico e em destaque, dado por pelo menos um dos pais ou pelo responsável legal</b>. O clube foi montado em cima dessa regra, e não ao redor dela.</p>

      <p>Na prática:</p>

      <ul>
        <li><b>Quem cria a conta é sempre o responsável.</b> A criança não faz cadastro sozinha, não informa os próprios dados e não aceita termo nenhum.</li>
        <li><b>O CPF é sempre o do responsável.</b> Nunca pedimos CPF de criança.</li>
        <li><b>Não pedimos RG, certidão nem qualquer documento oficial da criança.</b></li>
        <li><b>Coletamos o mínimo:</b> primeiro nome, ano de nascimento, um apelido e um avatar ilustrado, e o vínculo com o responsável. É o suficiente para separar as atividades por faixa etária e dar crédito aos envios.</li>
        <li><b>Apelido:</b> a criança escolhe um nome da lista do clube (cientistas e personalidades ligadas ao tema das origens). Se quiser um nome fora da lista, o responsável envia uma pesquisa sobre a pessoa; a equipe lê, e, se aprovar, o nome entra na lista do clube. A pesquisa fica guardada junto com a sugestão.</li>
        <li><b>Pontos por desempenho escolar:</b> se o responsável quiser, informa a média do bimestre ou do ano e envia um print ou PDF do boletim. O arquivo fica privado, só a equipe vê, e ele é <b>apagado assim que a equipe confere</b>. Depois disso guardamos só a média e o período, para o extrato de pontos.</li>
        <li><b>Fotos, vídeos e textos das descobertas:</b> ficam em área privada, vistos só pela equipe na conferência. Foto e vídeo só podem ser enviados com a autorização de imagem do responsável, que permite ao clube usar e divulgar esse material. Cabe ao responsável borrar o rosto da criança, se não quiser que ele apareça. Envio recusado é apagado.</li>
        <li><b>A autorização de imagem pode ser retirada</b> a qualquer momento, pelo painel. Daí em diante, nada novo é divulgado, e o responsável pode pedir a retirada do que já foi publicado.</li>
        <li><b>Não repassamos dado de criança a ninguém</b> com finalidade comercial, publicitária ou de perfilamento. Em nenhuma hipótese.</li>
        <li><b>O responsável vê e apaga.</b> A qualquer momento ele pode consultar tudo que temos sobre a criança dele e pedir a exclusão, sem precisar justificar. Esses pedidos entram na frente da fila.</li>
      </ul>

      <p>Quando a criança envia uma descoberta, um experimento ou uma participação em concurso, o material fica vinculado ao cadastro do responsável. Publicar esse material no site ou nas redes do clube só acontece com autorização do responsável, pedida à parte — marcar o cadastro não autoriza publicação.</p>

      <h2>5. Para que usamos cada dado</h2>

      <p>A lei exige que cada uso tenha finalidade declarada e base legal. As nossas:</p>

      <div class="tbl">
        <table>
          <thead>
            <tr><th>Para quê</th><th>Quais dados</th><th>Base legal</th></tr>
          </thead>
          <tbody>
            <tr><td>Responder sua mensagem</td><td>Nome, e-mail, mensagem</td><td>Consentimento</td></tr>
            <tr><td>Enviar os materiais que você pediu</td><td>Nome, e-mail, tipo de inscrição, gênero</td><td>Consentimento</td></tr>
            <tr><td>Processar e comprovar uma doação ou compra</td><td>Nome, e-mail, valor, forma de pagamento, endereço de entrega</td><td>Execução de contrato e obrigação legal (guarda contábil e fiscal)</td></tr>
            <tr><td>Manter a conta do responsável e a participação da criança</td><td>Dados do responsável e os dados mínimos da criança</td><td>Consentimento específico do responsável (art. 14)</td></tr>
            <tr><td>Publicar um trabalho enviado pela criança</td><td>Primeiro nome, idade, o material enviado</td><td>Consentimento específico e destacado, pedido à parte</td></tr>
            <tr><td>Cumprir obrigações legais e regulatórias</td><td>O que a norma exigir</td><td>Obrigação legal</td></tr>
            <tr><td>Manter o site funcionando e seguro</td><td>Dados técnicos de acesso</td><td>Legítimo interesse</td></tr>
          </tbody>
        </table>
      </div>

      <h2>6. Compartilhamento de dados</h2>

      <p><b>Seus dados pessoais não serão vendidos.</b> Eles podem ser compartilhados apenas com:</p>

      <ul>
        <li><b>Wix</b> — hospeda o site e guarda os cadastros, atuando como operador, sob as nossas instruções.</li>
        <li><b>Meio de pagamento</b> — quando as doações e compras pelo site forem ativadas, a empresa que processa o pagamento recebe os dados da transação. Esta política será atualizada com o nome dela antes disso.</li>
        <li><b>Google reCAPTCHA</b> — no login e no cadastro, confere que quem usa o formulário é uma pessoa e não um robô. Para isso o Google recebe dados técnicos do acesso, como o endereço IP e informações do navegador, sob a <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">política de privacidade do Google</a>.</li>
        <li><b>Ferramenta de envio de e-mail</b> — para as comunicações que você autorizou.</li>
        <li><b>Órgãos públicos e autoridades judiciais</b> — apenas quando houver exigência legal ou ordem judicial.</li>
      </ul>

      <p><b>Transferência internacional.</b> Alguns desses serviços operam servidores fora do Brasil. Quando isso acontece, a transferência segue o que a LGPD exige para transferência internacional de dados.</p>

      <h2>7. Armazenamento, segurança e prazo de guarda</h2>

      <p>Adotamos medidas técnicas e administrativas de segurança — como criptografia SSL e controle de acesso — para proteger suas informações contra acessos não autorizados.</p>

      <p>Guardamos cada dado pelo tempo necessário à finalidade que o justificou:</p>

      <ul>
        <li><b>Mensagens de contato:</b> 60 meses (5 anos) após a resposta.</li>
        <li><b>Inscrição para receber materiais:</b> até você cancelar.</li>
        <li><b>Registros de doação e compra:</b> pelo prazo que a legislação fiscal e contábil exigir.</li>
        <li><b>Endereço de entrega de prêmios:</b> 12 meses depois da entrega, para o caso de extravio ou troca.</li>
        <li><b>Boletim enviado para os pontos:</b> até a equipe conferir. Aprovado ou recusado, o arquivo é apagado.</li>
        <li><b>Fotos, vídeos e textos das descobertas:</b> enquanto a criança estiver no clube, ou até o responsável pedir a exclusão. Envio recusado é apagado na hora.</li>
        <li><b>Cadastro de responsável e criança:</b> enquanto a conta existir. Pedindo a exclusão, apagamos — guardando apenas o que a lei obrigue a manter.</li>
      </ul>

      <p>Nenhum sistema é perfeito. Se ocorrer um incidente que possa trazer risco a você, comunicamos você e a Autoridade Nacional de Proteção de Dados dentro do prazo que a lei determina.</p>

      <h2>8. Cookies</h2>

      <p>Usamos cookies para lembrar suas preferências e manter você conectado entre as páginas. Os essenciais não podem ser desligados — sem eles o site não funciona. Você pode apagar ou bloquear cookies pelo seu navegador, sabendo que algumas partes do site podem deixar de funcionar direito.</p>

      <p>Os cookies que o site usa hoje:</p>

      <ul>
        <li><b>Sessão de login</b> (essencial) — mantém você conectado depois de entrar na conta. Some quando você sai.</li>
        <li><b>Funcionamento do site</b> (essenciais) — colocados pelo Wix, que hospeda o site, para segurança e para o site responder.</li>
        <li><b>Google reCAPTCHA</b> (essencial no login e no cadastro) — para conferir que quem usa o formulário é uma pessoa.</li>
      </ul>

      <p>Não usamos cookies de publicidade nem de rastreamento para anúncios.</p>

      <h2>9. Direitos do titular (art. 18 da LGPD)</h2>

      <p>Você pode solicitar a qualquer momento, sobre os seus dados e sobre os da criança que você representa:</p>

      <ul>
        <li>confirmação de que tratamos algum dado seu;</li>
        <li>acesso aos seus dados;</li>
        <li>correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos;</li>
        <li>portabilidade dos dados;</li>
        <li>eliminação dos dados tratados com base em consentimento;</li>
        <li>informação sobre com quem compartilhamos;</li>
        <li>revogação do consentimento, a qualquer momento e sem justificativa;</li>
        <li>oposição a tratamento que você considere indevido.</li>
      </ul>

      <p>Para exercer qualquer um deles, escreva para <a href="mailto:${DPO}">${DPO}</a>. Respondemos em até 15 dias. Pedido sobre dado de criança tem prioridade na fila.</p>

      <p>Você também pode reclamar diretamente à <b>Autoridade Nacional de Proteção de Dados (ANPD)</b>.</p>

      <h2>10. Alterações nesta política</h2>

      <p>Esta política pode ser atualizada periodicamente; a data no topo sempre indica a versão vigente. Se a mudança for relevante — por exemplo, uma finalidade nova para dados já coletados — avisamos pelo site e por e-mail e, quando a lei exigir, pedimos seu consentimento novamente.</p>

      <h2>11. Como falar com a gente</h2>

      <p>Dúvida sobre privacidade, pedido sobre seus dados ou sobre os dados do seu filho: <a href="mailto:${DPO}">${DPO}</a>, ou pelo <a href="contato.html">formulário de contato</a>, escolhendo o assunto correspondente.</p>

    </div>
  </div>
</section>

`;

fs.writeFileSync(SAIDA, topo + miolo + base);
console.log('politica-de-privacidade.html gerada (' + Math.round((topo + miolo + base).length / 1024) + ' KB)');
console.log('seções: ' + (miolo.match(/<h2/g) || []).length);
console.log('pendências marcadas como A DEFINIR: ' + (miolo.match(/A DEFINIR/g) || []).length);
