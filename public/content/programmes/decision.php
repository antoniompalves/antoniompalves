<?php
/**
 * Page copy for "Motivação e Tomada de Decisão" (common 8-part structure, see templates/course.php).
 * DRAFT FOR REVIEW: the WordPress page for this programme was still an empty template, so this copy was
 * written from the programme's short description and Paulo Moreira's published articles and books. Check it before launch.
 */
return [
    'chips' => [
        ['spark',  ['pt' => 'Emoção, decisão e motivação', 'en' => 'Emotion, decisions and motivation']],
        ['layers', ['pt' => '4 módulos', 'en' => '4 modules']],
        ['pin',    ['pt' => 'Em todo o país ou online', 'en' => 'Nationwide or online']],
    ],

    // 1. Programme overview
    'intro' => [
        'h' => ['pt' => 'As emoções não atrapalham as decisões. Fazem parte delas.', 'en' => 'Emotions don’t get in the way of decisions. They’re part of them.'],
        'p' => [
            'pt' => [
                'Durante décadas acreditou-se que a emoção perturbava o raciocínio. O trabalho do neurocientista António Damásio mostrou o contrário: pessoas com lesões nas áreas cerebrais ligadas à emoção raciocinavam bem, mas tinham enorme dificuldade em decidir.',
                'Nas organizações, isto tem duas consequências práticas. Decide melhor quem percebe como as emoções e os atalhos mentais influenciam as suas escolhas. E motiva melhor quem sabe o que faz as pessoas quererem dar o seu melhor, sobretudo em períodos de mudança e pressão.',
            ],
            'en' => [
                'For decades, emotion was thought to disturb reasoning. Neuroscientist António Damásio’s work showed the opposite: people with damage to the brain areas linked to emotion could reason well, but found it extremely hard to decide.',
                'In organisations, this has two practical consequences. People who understand how emotions and mental shortcuts shape their choices decide better. And people who know what makes others want to give their best motivate better, especially in times of change and pressure.',
            ],
        ],
    ],
    'audience' => [
        'pt' => [
            ['users', 'Equipas de liderança', 'Decisões estratégicas e sob pressão'],
            ['target', 'Chefias intermédias', 'Motivar equipas no dia a dia'],
            ['layers', 'Equipas de projeto', 'Prioridades e decisões partilhadas'],
            ['heart', 'Recursos Humanos', 'Envolvimento e retenção'],
            ['building', 'Administração Pública', 'Decisões em estruturas complexas'],
        ],
        'en' => [
            ['users', 'Leadership teams', 'Strategic decisions and decisions under pressure'],
            ['target', 'Middle managers', 'Motivating teams day to day'],
            ['layers', 'Project teams', 'Shared priorities and decisions'],
            ['heart', 'Human Resources', 'Engagement and retention'],
            ['building', 'Public sector', 'Decisions in complex structures'],
        ],
    ],

    // 2. Organisational challenges → how the programme responds
    'challenges' => [
        'h' => ['pt' => 'Decisões apressadas e equipas desligadas têm um custo que raramente se mede.', 'en' => 'Rushed decisions and disengaged teams carry a cost that is rarely measured.'],
        'p' => ['pt' => 'Situações que as organizações reconhecem, e o que o programa faz em relação a cada uma.', 'en' => 'Situations organisations recognise, and what the programme does about each one.'],
        'items' => [
            'pt' => [
                ['Decisões importantes tomadas em piloto automático ou sob pressão.', 'Intuição e deliberação', 'Perceber quando confiar na intuição e quando parar para deliberar, e como o stress e o cansaço alteram essa escolha.'],
                ['Os mesmos erros de julgamento a repetir-se: excesso de confiança, ilusão de controlo, primeiras impressões.', 'Armadilhas mentais', 'Identificar as heurísticas e os enviesamentos mais comuns e usar rotinas simples para os reduzir.'],
                ['Pessoas presentes mas desligadas do trabalho.', 'Motivação que se sustenta', 'O que mantém a motivação a longo prazo (autonomia, competência e ligação aos outros) e como a chefia pode criar essas condições.'],
                ['Objetivos que se definem e não se cumprem.', 'Da intenção à ação', 'Estratégias de ciência comportamental para quebrar o ciclo da procrastinação e transformar objetivos em hábitos.'],
                ['Mudança constante que desgasta o envolvimento.', 'Dar sentido ao esforço', 'Ligar as tarefas difíceis ao que é importante para cada pessoa e para a equipa.'],
            ],
            'en' => [
                ['Important decisions made on autopilot or under pressure.', 'Intuition and deliberation', 'Knowing when to trust intuition and when to stop and deliberate, and how stress and fatigue change that choice.'],
                ['The same errors of judgement repeating: overconfidence, illusion of control, first impressions.', 'Mental traps', 'Spotting the most common heuristics and biases and using simple routines to reduce them.'],
                ['People who are present but disengaged.', 'Motivation that lasts', 'What sustains motivation in the long run (autonomy, competence and connection to others) and how managers can create those conditions.'],
                ['Goals that are set and never met.', 'From intention to action', 'Behavioural-science strategies to break the procrastination cycle and turn goals into habits.'],
                ['Constant change that wears down engagement.', 'Giving effort meaning', 'Connecting hard tasks to what matters to each person and to the team.'],
            ],
        ],
        'facts' => [
            ['n' => ['pt' => '68%', 'en' => '68%'],
             't' => ['pt' => 'dos trabalhadores em Portugal não estão envolvidos no trabalho, e 59% acham que é boa altura para mudar de emprego.', 'en' => 'of workers in Portugal are not engaged at work, and 59% think it’s a good time to change jobs.'],
             'src' => 'Gallup, 2026', 'url' => 'https://www.gallup.com/workplace/706826/state-global-workplace-portugal-country-level-data.aspx'],
            ['n' => ['pt' => '32%', 'en' => '32%'],
             't' => ['pt' => 'dos líderes dizem que a última mudança que conduziram teve uma adoção saudável pelos colaboradores.', 'en' => 'of leaders say the last change they led achieved healthy adoption by employees.'],
             'src' => 'Gartner, 2025', 'url' => 'https://www.gartner.com/en/newsroom/press-releases/2025-07-08-gartner-hr-research-finds-just-32-percent-of-business-leaders-report-achieving-healthy-change-adoption-by-employees'],
        ],
        'end' => ['pt' => 'Motivação e boas decisões não dependem só de força de vontade. Dependem de competências que se treinam.', 'en' => 'Motivation and good decisions don’t rely on willpower alone. They rely on skills that can be trained.'],
    ],

    // 3. Objectives and skills
    'objectives' => [
        'pt' => [
            'Explicar o papel das emoções na tomada de decisão.',
            'Distinguir as decisões que pedem intuição das que pedem deliberação.',
            'Reconhecer os enviesamentos mais comuns e aplicar técnicas para os reduzir.',
            'Identificar o que sustenta a motivação, em si e na equipa.',
            'Criar condições de autonomia, competência e ligação que aumentem o envolvimento.',
            'Transformar objetivos em ações e hábitos e reduzir a procrastinação.',
        ],
        'en' => [
            'Explain the role of emotions in decision-making.',
            'Tell decisions that call for intuition from those that call for deliberation.',
            'Recognise the most common biases and apply techniques to reduce them.',
            'Identify what sustains motivation, in themselves and in the team.',
            'Create conditions of autonomy, competence and connection that raise engagement.',
            'Turn goals into actions and habits and reduce procrastination.',
        ],
    ],
    'skills' => [
        'pt' => ['Tomada de decisão', 'Pensamento crítico', 'Motivação', 'Autoconsciência', 'Definição de objetivos', 'Gestão da procrastinação', 'Liderança'],
        'en' => ['Decision-making', 'Critical thinking', 'Motivation', 'Self-awareness', 'Goal setting', 'Managing procrastination', 'Leadership'],
    ],

    // 4. Training content
    'modules' => [
        'h' => ['pt' => '4 módulos: de como decidimos ao que nos move.', 'en' => '4 modules: from how we decide to what drives us.'],
        'p' => ['pt' => 'Dois módulos sobre decisão e dois sobre motivação, sempre ligados a situações reais de trabalho.', 'en' => 'Two modules on decisions and two on motivation, always tied to real work situations.'],
        'items' => [
            'pt' => [
                ['Como decidimos', ['O papel das emoções na decisão (António Damásio)', 'Intuição e deliberação: dois modos de pensar', 'Como o stress e o cansaço alteram as escolhas']],
                ['Armadilhas da decisão', ['Heurísticas e enviesamentos cognitivos', 'A ilusão de controlo e o excesso de confiança', 'Rotinas para decidir melhor com informação incompleta']],
                ['O que nos motiva', ['Motivação intrínseca e extrínseca', 'Autonomia, competência e ligação aos outros', 'O papel da chefia no envolvimento da equipa']],
                ['Da intenção à ação', ['Objetivos com significado', 'Os mecanismos da procrastinação e como a quebrar', 'Criar hábitos que se mantêm']],
            ],
            'en' => [
                ['How we decide', ['The role of emotions in decisions (António Damásio)', 'Intuition and deliberation: two modes of thinking', 'How stress and fatigue change our choices']],
                ['Decision traps', ['Heuristics and cognitive biases', 'The illusion of control and overconfidence', 'Routines for deciding better with incomplete information']],
                ['What motivates us', ['Intrinsic and extrinsic motivation', 'Autonomy, competence and connection to others', 'The manager’s role in team engagement']],
                ['From intention to action', ['Goals that mean something', 'How procrastination works and how to break it', 'Building habits that last']],
            ],
        ],
    ],

    // 5. Learning methodology
    'method' => [
        'h' => ['pt' => 'Decidir melhor treina-se. Motivar também.', 'en' => 'Better decisions can be trained. So can motivation.'],
        'p' => ['pt' => 'Sessões práticas com exercícios de decisão, casos reais e ferramentas que se aplicam no dia seguinte.', 'en' => 'Hands-on sessions with decision exercises, real cases and tools you can use the next day.'],
        'cards' => [
            'pt' => [
                ['flask', 'Base científica', 'Neurociência das emoções, psicologia da decisão e ciência comportamental, explicadas de forma simples e aplicada.'],
                ['target', 'Exercícios de decisão', 'Situações de decisão com tempo e informação limitados, para cada pessoa observar os próprios atalhos mentais e treinar alternativas.'],
                ['users', 'Casos da organização', 'Dilemas e decisões reais da equipa, trabalhados com ferramentas estruturadas.'],
                ['loop', 'Plano de ação', 'Cada participante sai com objetivos concretos e estratégias para os pôr em prática.'],
            ],
            'en' => [
                ['flask', 'Scientific basis', 'The neuroscience of emotion, the psychology of decision-making and behavioural science, explained simply and applied.'],
                ['target', 'Decision exercises', 'Decisions under limited time and information, so each person can observe their own mental shortcuts and practise alternatives.'],
                ['users', 'The organisation’s cases', 'The team’s real dilemmas and decisions, worked through with structured tools.'],
                ['loop', 'Action plan', 'Each participant leaves with concrete goals and strategies to put them into practice.'],
            ],
        ],
        'activities' => [
            'pt' => ['Simulações de decisão', 'Análise de casos', 'Exercícios em grupo', 'Reflexão individual', 'Plano de ação'],
            'en' => ['Decision simulations', 'Case analysis', 'Group exercises', 'Individual reflection', 'Action plan'],
        ],
    ],
];
