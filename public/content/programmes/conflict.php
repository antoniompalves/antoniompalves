<?php
/**
 * Page copy for "Gestão de Conflitos e Negociação" (common 8-part structure, see templates/course.php).
 * Source: the programme page on the WordPress beta site. Its unsourced figures (e.g. "4 horas por semana",
 * "-40% escalação") are left out; 'facts' only holds figures with a source and a link.
 */
return [
    'chips' => [
        ['compass', ['pt' => 'Modelo de negociação de Harvard', 'en' => 'Harvard negotiation model']],
        ['layers',  ['pt' => '4 módulos', 'en' => '4 modules']],
        ['pin',     ['pt' => 'Em todo o país ou online', 'en' => 'Nationwide or online']],
    ],

    // 1. Programme overview
    'intro' => [
        'h' => ['pt' => 'O conflito não é o problema. A falta de ferramentas para o resolver é.', 'en' => 'Conflict isn’t the problem. Lacking the tools to resolve it is.'],
        'p' => [
            'pt' => [
                'Os conflitos são inevitáveis em qualquer organização. O que os torna destrutivos é a falta de competência emocional e de processos estruturados para os resolver. A maioria dos profissionais nunca teve formação nesta área e gere-os por tentativa e erro.',
                'Este programa combina a regulação emocional com o modelo de negociação de Harvard para dar às equipas ferramentas estruturadas: perceber o conflito, gerir as emoções e negociar soluções.',
            ],
            'en' => [
                'Conflict is inevitable in any organisation. What makes it destructive is the lack of emotional competence and of structured processes to resolve it. Most professionals have never been trained in this and handle it by trial and error.',
                'This programme combines emotion regulation with the Harvard negotiation model to give teams structured tools: understand the conflict, manage emotions and negotiate solutions.',
            ],
        ],
    ],
    'audience' => [
        'pt' => [
            ['users', 'Equipas de liderança', 'Que precisam de ter conversas difíceis'],
            ['heart', 'Recursos Humanos', 'Direção e gestão de pessoas'],
            ['target', 'Equipas de projeto', 'Com pessoas de vários departamentos'],
            ['compass', 'Negociação e vendas', 'Profissionais que negoceiam todos os dias'],
            ['loop', 'Organizações em mudança', 'Fusões, reestruturação, mudança cultural'],
            ['building', 'Setor público', 'Gestão de equipas e atendimento ao cidadão'],
        ],
        'en' => [
            ['users', 'Leadership teams', 'Who need to hold difficult conversations'],
            ['heart', 'Human Resources', 'HR directors and people management'],
            ['target', 'Project teams', 'With people from several departments'],
            ['compass', 'Negotiation and sales', 'Professionals who negotiate every day'],
            ['loop', 'Organisations in change', 'Mergers, restructuring, culture change'],
            ['building', 'Public sector', 'Team management and citizen services'],
        ],
    ],

    // 2. Organisational challenges → how the programme responds
    'challenges' => [
        'h' => ['pt' => 'Conflitos mal resolvidos custam tempo, energia e pessoas.', 'en' => 'Badly handled conflict costs time, energy and people.'],
        'p' => ['pt' => 'Situações que as organizações reconhecem, e o que o programa faz em relação a cada uma.', 'en' => 'Situations organisations recognise, and what the programme does about each one.'],
        'items' => [
            'pt' => [
                ['Conflitos interpessoais que escalam até se tornarem problemas estruturais.', 'Entender antes de reagir', 'A origem e os tipos de conflito, o que impede a resolução e as três histórias que cada parte conta a si própria.'],
                ['Reuniões onde ninguém diz o que realmente pensa, e os problemas acumulam-se.', 'Assertividade', 'Os cinco estilos de comunicação e como dizer o que é preciso sem atacar nem recuar.'],
                ['Líderes que evitam conversas difíceis até ser tarde demais.', 'Gerir a emoção primeiro', 'Regulação emocional antes, durante e depois do conflito, para conseguir ter a conversa a tempo.'],
                ['Personalidades difíceis que paralisam equipas inteiras.', '9 tipos de personalidade difícil', 'Estratégias específicas para cada tipo de personalidade difícil que surge no contexto profissional.'],
                ['Negociações que acabam em posições extremadas, sem acordo.', 'Modelo de Harvard', 'Separar a pessoa do problema, focar em interesses e não em posições, criar opções de ganho mútuo e critérios objetivos.'],
                ['Desgaste emocional que alimenta a saída de pessoas e ambientes tóxicos.', 'Equanimidade', 'Ferramentas da filosofia estoica para manter a serenidade em situações de grande pressão emocional.'],
            ],
            'en' => [
                ['Interpersonal conflicts that escalate into structural problems.', 'Understand before reacting', 'Where conflicts come from and their types, what blocks resolution, and the three stories each side tells itself.'],
                ['Meetings where nobody says what they really think, and problems pile up.', 'Assertiveness', 'The five communication styles and how to say what needs saying without attacking or backing down.'],
                ['Leaders who avoid difficult conversations until it’s too late.', 'Manage the emotion first', 'Emotion regulation before, during and after conflict, so the conversation happens in time.'],
                ['Difficult personalities that paralyse whole teams.', '9 types of difficult personality', 'Specific strategies for each type of difficult personality found at work.'],
                ['Negotiations that end in entrenched positions, with no deal.', 'Harvard model', 'Separate the people from the problem, focus on interests not positions, invent options for mutual gain and use objective criteria.'],
                ['Emotional wear that drives people out and feeds toxic workplaces.', 'Equanimity', 'Tools from Stoic philosophy to stay composed under heavy emotional pressure.'],
            ],
        ],
        'facts' => [
            ['n' => ['pt' => '44%', 'en' => '44%'],
             't' => ['pt' => 'dos trabalhadores na Grã-Bretanha tiveram conflitos no trabalho em 12 meses; 57% destes relatam stresse, ansiedade ou depressão.', 'en' => 'of workers in Great Britain had conflict at work in 12 months; 57% of them report stress, anxiety or depression.'],
             'src' => 'Acas, 2025', 'url' => 'https://www.acas.org.uk/research-and-commentary/workplace-conflict/prevalence-of-conflict-at-work-in-great-britain/report'],
            ['n' => ['pt' => '28%', 'en' => '28%'],
             't' => ['pt' => 'dos trabalhadores em Portugal apontam falta de comunicação ou de cooperação interna.', 'en' => 'of workers in Portugal point to poor internal communication or cooperation.'],
             'src' => 'EU-OSHA, 2025', 'url' => 'https://osha.europa.eu/sites/default/files/documents/OSH-pulse-2025-mental-health-digitalisation-work-PT_PT.pdf'],
        ],
        'end' => ['pt' => 'Equipas que sabem gerir conflitos não têm menos desentendimentos. Têm melhores soluções.', 'en' => 'Teams that know how to handle conflict don’t have fewer disagreements. They have better solutions.'],
    ],

    // 3. Objectives and skills
    'objectives' => [
        'pt' => [
            'Identificar a origem e o tipo de um conflito e o que está a impedir a sua resolução.',
            'Gerir as próprias emoções antes, durante e depois de um conflito.',
            'Escolher, entre as cinco estratégias de gestão de conflitos, a mais adequada a cada situação.',
            'Preparar e conduzir uma negociação com o modelo de Harvard.',
            'Lidar com personalidades difíceis com estratégias específicas para cada tipo.',
            'Comunicar de forma assertiva e manter a serenidade sob pressão.',
        ],
        'en' => [
            'Identify where a conflict comes from, its type and what is blocking resolution.',
            'Manage their own emotions before, during and after a conflict.',
            'Choose, among the five conflict-management strategies, the right one for each situation.',
            'Prepare and lead a negotiation using the Harvard model.',
            'Handle difficult personalities with specific strategies for each type.',
            'Communicate assertively and stay composed under pressure.',
        ],
    ],
    'skills' => [
        'pt' => ['Gestão de conflitos', 'Negociação', 'Assertividade', 'Regulação emocional', 'Escuta ativa', 'Conversas difíceis', 'Comunicação'],
        'en' => ['Conflict management', 'Negotiation', 'Assertiveness', 'Emotion regulation', 'Active listening', 'Difficult conversations', 'Communication'],
    ],

    // 4. Training content
    'modules' => [
        'h' => ['pt' => '4 módulos: da compreensão à resolução.', 'en' => '4 modules: from understanding to resolution.'],
        'p' => ['pt' => 'Um percurso que começa na compreensão do conflito, passa pela gestão emocional e termina em técnicas avançadas de negociação e de gestão de personalidades difíceis.', 'en' => 'A path that starts with understanding conflict, moves through emotion management and ends with advanced negotiation techniques and handling difficult personalities.'],
        'items' => [
            'pt' => [
                ['Entender os Conflitos', ['Origem e tipos de conflitos', 'Os fatores que impedem a resolução', 'Avaliar o investimento emocional de um conflito', 'As 3 histórias que impedem a resolução']],
                ['Gerir Emoções no Conflito', ['Gerir emoções antes, durante e depois de um conflito', 'Avaliação da estratégia emocional', 'As 5 estratégias para gerir um conflito e quando usar cada uma']],
                ['O Modelo de Harvard', ['Separar a pessoa do problema', 'Focar em interesses, não em posições', 'Inventar opções para ganhos mútuos', 'Criar critérios objetivos para decidir']],
                ['Personalidades Difíceis', ['Autodiagnóstico do estilo de gestão de conflitos', 'Estratégias para os 9 tipos de personalidade difícil', 'Os 5 estilos de comunicação e a assertividade', 'A filosofia estoica para situações difíceis']],
            ],
            'en' => [
                ['Understanding Conflict', ['Where conflicts come from and their types', 'What blocks resolution', 'Assessing the emotional investment in a conflict', 'The 3 stories that block resolution']],
                ['Managing Emotions in Conflict', ['Managing emotions before, during and after a conflict', 'Assessing your emotional strategy', 'The 5 strategies to handle a conflict and when to use each']],
                ['The Harvard Model', ['Separate the people from the problem', 'Focus on interests, not positions', 'Invent options for mutual gain', 'Use objective criteria to decide']],
                ['Difficult Personalities', ['Self-assessment of your conflict style', 'Strategies for the 9 types of difficult personality', 'The 5 communication styles and assertiveness', 'Stoic philosophy for difficult situations']],
            ],
        ],
    ],

    // 5. Learning methodology
    'method' => [
        'h' => ['pt' => 'Primeiro gerir a emoção. Depois gerir o conflito.', 'en' => 'Manage the emotion first. Then manage the conflict.'],
        'p' => ['pt' => 'Muitos programas de gestão de conflitos ignoram que é impossível negociar bem quando as emoções estão a dominar. Este começa por aí.', 'en' => 'Many conflict-management programmes ignore that you can’t negotiate well while emotions are in charge. This one starts there.'],
        'cards' => [
            'pt' => [
                ['heart', 'Regulação emocional antes da negociação', 'Gerir a emoção antes de gerir o conflito: é o que permite pensar com clareza e ouvir a outra parte.'],
                ['compass', 'Modelo de negociação de Harvard', 'O framework de negociação baseada em princípios mais usado no mundo: separar a pessoa do problema, focar em interesses e não em posições, criar opções de ganho mútuo.'],
                ['users', 'Os 9 tipos de personalidade difícil', 'Estratégias específicas para lidar com cada tipo de personalidade difícil que surge no contexto profissional.'],
                ['shield', 'Filosofia estoica aplicada', 'Ferramentas da filosofia estoica para manter a equanimidade em situações de grande pressão emocional.'],
            ],
            'en' => [
                ['heart', 'Emotion regulation before negotiation', 'Managing the emotion before managing the conflict: that is what lets people think clearly and listen to the other side.'],
                ['compass', 'Harvard negotiation model', 'The world’s most widely used framework for principled negotiation: separate the people from the problem, focus on interests not positions, invent options for mutual gain.'],
                ['users', 'The 9 types of difficult personality', 'Specific strategies for each type of difficult personality found at work.'],
                ['shield', 'Applied Stoic philosophy', 'Tools from Stoic philosophy to keep equanimity under heavy emotional pressure.'],
            ],
        ],
        'activities' => [
            'pt' => ['Autodiagnóstico do estilo de conflito', 'Simulações de negociação', 'Conversas difíceis em roleplay', 'Casos reais da equipa', 'Exercícios de assertividade'],
            'en' => ['Conflict-style self-assessment', 'Negotiation simulations', 'Difficult-conversation role-plays', 'The team’s real cases', 'Assertiveness exercises'],
        ],
    ],
    'testimonial' => [
        'quote' => [
            'pt' => 'Muito enriquecedor e uma experiência pessoal muito boa. Boa energia, confiança, sabedoria. Excelente a maneira como foi ministrada a formação.',
            'en' => 'Very enriching and a very good personal experience. Good energy, confidence, wisdom. The way the training was delivered was excellent.',
        ],
        'name' => 'João Silva',
        'role' => ['pt' => 'Nestlé — Estarreja', 'en' => 'Nestlé — Estarreja'],
    ],
];
