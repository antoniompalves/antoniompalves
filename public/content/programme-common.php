<?php
/**
 * Shared parts of the programme pages (common 8-part structure).
 * Labels of the 8 parts are in lang/*.php ('prog.c1'… long, 'prog.n1'… short for the in-page menu).
 */
return [
    // Anchors of the 8 parts, per language (in-page menu and links like #contacto)
    'ids' => [
        'pt' => ['apresentacao', 'desafios', 'objetivos', 'conteudos', 'metodologia', 'formato', 'acompanhamento', 'contacto'],
        'en' => ['overview', 'challenges', 'objectives', 'content', 'method', 'format', 'follow-up', 'contact'],
    ],

    // 6. Format and organisation: facts shown above the formats table ([label, value]); the module count is added per programme
    'struct' => [
        [['pt' => 'Duração', 'en' => 'Length'], ['pt' => 'De 1h30 a 6 meses', 'en' => 'From 1.5 hours to 6 months']],
        [['pt' => 'Modalidade', 'en' => 'Delivery'], ['pt' => 'Presencial ou online', 'en' => 'In person or online']],
        [['pt' => 'Idioma', 'en' => 'Language'], ['pt' => 'Português ou inglês', 'en' => 'Portuguese or English']],
    ],

    // 7. Customisation: steps before the programme ([title, text]). Step 2 is replaced by the programme's 'diagnosis' when it has one.
    'personal' => [
        [['pt' => 'Reunião de apresentação', 'en' => 'Introductory meeting'],
         ['pt' => 'Uma conversa com a nossa Business Manager para perceber o contexto, os objetivos e quem vai participar. Sem compromisso.', 'en' => 'A conversation with our Business Manager to understand the context, the goals and who will take part. No commitment.']],
        [['pt' => 'Diagnóstico das necessidades', 'en' => 'Needs assessment'],
         ['pt' => 'Quando se justifica, uma avaliação inicial do grupo para focar o programa onde é mais preciso.', 'en' => 'Where it makes sense, an initial assessment of the group to focus the programme where it’s needed most.']],
        [['pt' => 'Conteúdos adaptados', 'en' => 'Tailored content'],
         ['pt' => 'Casos, exemplos e exercícios ajustados ao setor, à função e aos desafios reais da equipa.', 'en' => 'Cases, examples and exercises adjusted to the sector, the role and the team’s real challenges.']],
        [['pt' => 'Formato e calendário', 'en' => 'Format and schedule'],
         ['pt' => 'Presencial em todo o país ou online, em português ou inglês, ao ritmo da organização.', 'en' => 'In person anywhere in Portugal or online, in Portuguese or English, at the organisation’s pace.']],
    ],

    // 7. Follow-up mechanisms ([icon, title, text]); a programme can add its own in 'follow'
    'follow' => [
        ['loop', ['pt' => 'Micro-desafios entre sessões', 'en' => 'Micro-challenges between sessions'],
         ['pt' => 'Pequenas tarefas para aplicar no trabalho o que foi treinado. Nos programas avançado e contínuo.', 'en' => 'Small tasks to apply at work what was practised. In the advanced and ongoing programmes.']],
        ['calendar', ['pt' => 'Sessões de acompanhamento', 'en' => 'Follow-up sessions'],
         ['pt' => 'Sessões periódicas para rever a aplicação, esclarecer dúvidas e consolidar. No programa contínuo.', 'en' => 'Regular sessions to review how it’s being applied, answer questions and consolidate. In the ongoing programme.']],
        ['chart', ['pt' => 'Medição de impacto', 'en' => 'Impact measurement'],
         ['pt' => 'Avaliação no início e no fim, para perceber o que mudou. No programa contínuo.', 'en' => 'Assessment at the start and the end, to see what changed. In the ongoing programme.']],
    ],
];
