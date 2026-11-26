<?php
/**
 * Privacy policy (RGPD / GDPR). TEMPLATE — have it reviewed and complete the
 * [placeholders] (legal entity name and tax number) before launch.
 */
$mail = e(cfg('email_to'));
return [
    'updated' => '2026-11-26',
    'pt' => <<<HTML
<p>A EQ Training respeita a sua privacidade. Esta política explica que dados pessoais recolhemos neste site, para que fins, durante quanto tempo e quais são os seus direitos, nos termos do Regulamento Geral sobre a Proteção de Dados (RGPD).</p>
<h2>1. Responsável pelo tratamento</h2>
<p>[Denominação legal da entidade], NIF [número], marca EQ Training. Contacto para questões de privacidade: <a href="mailto:{$mail}">{$mail}</a>.</p>
<h2>2. Que dados recolhemos</h2>
<ul>
<li><strong>Formulário de contacto:</strong> nome, email, telefone, organização, tipo de organização, programa de interesse e a sua mensagem.</li>
<li><strong>Pergunta à Damiana:</strong> a sua pergunta e o seu email.</li>
<li><strong>Dados técnicos:</strong> endereço IP e data do pedido, registados para segurança e prevenção de abuso.</li>
</ul>
<h2>3. Para que usamos os dados</h2>
<p>Exclusivamente para responder ao seu pedido e, se for o caso, preparar uma proposta. Não enviamos newsletters nem comunicações comerciais sem o seu consentimento expresso, e não vendemos dados a terceiros.</p>
<h2>4. Fundamento legal</h2>
<p>O seu consentimento, dado ao submeter o formulário, e as diligências pré-contratuais que nos pede (artigo 6.º, n.º 1, alíneas a) e b) do RGPD).</p>
<h2>5. Durante quanto tempo</h2>
<p>Conservamos os pedidos de contacto durante um máximo de 24 meses, ou durante o período da relação contratual e os prazos legais aplicáveis, se vier a ser nosso cliente.</p>
<h2>6. Quem tem acesso</h2>
<p>A EQ Training e o fornecedor de alojamento do site e do email, que atua como subcontratante, no Espaço Económico Europeu.</p>
<h2>7. Cookies e serviços externos</h2>
<p>Este site não usa cookies de publicidade nem de análise. Usa apenas um cookie técnico de sessão, necessário para proteger o formulário. Os vídeos do YouTube só são carregados quando clica para os ver, através do modo de privacidade reforçada (youtube-nocookie.com). Os tipos de letra são servidos a partir deste próprio site.</p>
<h2>8. Os seus direitos</h2>
<p>Pode pedir o acesso, a retificação, o apagamento, a limitação ou a portabilidade dos seus dados, opor-se ao tratamento e retirar o consentimento a qualquer momento, escrevendo para <a href="mailto:{$mail}">{$mail}</a>. Tem ainda o direito de apresentar reclamação à Comissão Nacional de Proteção de Dados (<a href="https://www.cnpd.pt" target="_blank" rel="noopener">cnpd.pt</a>).</p>
HTML,
    'en' => <<<HTML
<p>EQ Training respects your privacy. This policy explains what personal data we collect on this website, why, for how long, and what your rights are under the General Data Protection Regulation (GDPR).</p>
<h2>1. Data controller</h2>
<p>[Legal entity name], tax number [number], trading as EQ Training. Privacy contact: <a href="mailto:{$mail}">{$mail}</a>.</p>
<h2>2. What we collect</h2>
<ul>
<li><strong>Contact form:</strong> name, email, phone, organisation, organisation type, programme of interest and your message.</li>
<li><strong>Questions to Damiana:</strong> your question and your email.</li>
<li><strong>Technical data:</strong> IP address and time of the request, logged for security and abuse prevention.</li>
</ul>
<h2>3. How we use it</h2>
<p>Only to reply to your request and, where relevant, to prepare a proposal. We do not send newsletters or marketing without your explicit consent, and we never sell data to third parties.</p>
<h2>4. Legal basis</h2>
<p>Your consent, given when you submit the form, and the pre-contractual steps you ask us to take (Article 6(1)(a) and (b) GDPR).</p>
<h2>5. How long we keep it</h2>
<p>Contact requests are kept for up to 24 months, or for the duration of the contract and applicable legal periods if you become a client.</p>
<h2>6. Who has access</h2>
<p>EQ Training and the website and email hosting provider, acting as processor, within the European Economic Area.</p>
<h2>7. Cookies and external services</h2>
<p>This website uses no advertising or analytics cookies. It only uses a technical session cookie needed to protect the form. YouTube videos load only when you click to play them, using privacy-enhanced mode (youtube-nocookie.com). Fonts are served from this website itself.</p>
<h2>8. Your rights</h2>
<p>You may request access to, correction, erasure, restriction or portability of your data, object to processing and withdraw consent at any time by writing to <a href="mailto:{$mail}">{$mail}</a>. You also have the right to lodge a complaint with the Portuguese data protection authority (<a href="https://www.cnpd.pt" target="_blank" rel="noopener">cnpd.pt</a>).</p>
HTML,
];
