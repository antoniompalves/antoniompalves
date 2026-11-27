<?php
/**
 * Page copy for "Inteligência Emocional para Equipas e Líderes", in the common 8-part programme structure
 * (see templates/course.php). Catalogue fields (title, slug, card) live in content/courses.php.
 * Source: the programme page on the WordPress beta site. Figures only with a source and a link.
 */
return [
    'chips' => [
        ['flask',  ['pt' => 'ESCI · MSCEIT · EQ-i', 'en' => 'ESCI · MSCEIT · EQ-i']],
        ['layers', ['pt' => '4 módulos', 'en' => '4 modules']],
        ['pin',    ['pt' => 'Em todo o país ou online', 'en' => 'Nationwide or online']],
    ],

    // 1. Programme overview
    'intro' => [
        'h' => ['pt' => 'A competência que falta à maioria dos líderes não é técnica.', 'en' => 'The skill most leaders lack isn’t a technical one.'],
        'p' => [
            'pt' => [
                'No relatório Future of Jobs 2025, o Fórum Económico Mundial coloca a resiliência, a liderança e a motivação e autoconsciência entre as competências mais importantes para as empresas, logo a seguir ao pensamento analítico.',
                'Mesmo assim, muitas organizações promovem líderes pelas competências técnicas e deixam a competência emocional ao acaso, apesar do peso que tem na qualidade da liderança, da comunicação e das decisões.',
                'Este programa trabalha-a de forma estruturada, com base no modelo ESCI de Daniel Goleman e nas três correntes científicas da Inteligência Emocional.',
            ],
            'en' => [
                'In its Future of Jobs Report 2025, the World Economic Forum ranks resilience, leadership, and motivation and self-awareness among the most important skills for employers, right after analytical thinking.',
                'Even so, many organisations promote leaders for their technical skills and leave emotional competence to chance, despite its weight in the quality of leadership, communication and decisions.',
                'This programme develops it in a structured way, based on Daniel Goleman’s ESCI model and the three scientific schools of Emotional Intelligence.',
            ],
        ],
        'src' => ['WEF, 2025', 'https://www.weforum.org/publications/the-future-of-jobs-report-2025/in-full/3-skills-outlook/'],
    ],
    'audience' => [
        'pt' => [
            ['users', 'Equipas de liderança', 'C-Suite, direções e coordenações'],
            ['heart', 'Recursos Humanos', 'Diretores e técnicos de RH'],
            ['target', 'Equipas de projeto', 'Equipas multidisciplinares'],
            ['building', 'Administração Pública', 'Câmaras, institutos, ministérios'],
            ['shield', 'Saúde, educação e serviço social', 'Profissionais na linha da frente'],
        ],
        'en' => [
            ['users', 'Leadership teams', 'C-suite, directors and managers'],
            ['heart', 'Human Resources', 'HR directors and specialists'],
            ['target', 'Project teams', 'Cross-functional teams'],
            ['building', 'Public sector', 'Municipalities, institutes, ministries'],
            ['shield', 'Health, education and social care', 'Front-line professionals'],
        ],
    ],

    // 2. Organisational challenges → how the programme responds
    'challenges' => [
        'h' => ['pt' => 'Quando falta competência emocional, são as equipas que pagam.', 'en' => 'When emotional competence is missing, teams pay the price.'],
        'p' => ['pt' => 'Situações que as organizações reconhecem, e o que o programa faz em relação a cada uma.', 'en' => 'Situations organisations recognise, and what the programme does about each one.'],
        'items' => [
            'pt' => [
                ['Líderes tecnicamente brilhantes que geram desmotivação e conflitos nas equipas.', 'Gestão de relacionamentos', 'Treino de feedback, influência e gestão de conflito, com roleplays baseados em casos reais da equipa.'],
                ['Decisões impulsivas sob pressão que custam tempo, dinheiro e reputação.', 'Autocontrolo emocional', 'Técnicas de regulação sob pressão, treinadas em simulações de decisão com tempo limitado.'],
                ['Equipas que não comunicam com transparência nem resolvem tensões de forma construtiva.', 'Consciência social', 'Leitura de expressões faciais e sinais não-verbais, escuta ativa e conversas difíceis estruturadas.'],
                ['Falta de autoconsciência emocional que leva a padrões de comportamento destrutivos.', 'Autoconsciência', 'Diagnóstico individual (MSCEIT, EQ-i ou ESCI) que mostra os padrões emocionais de cada líder, e um plano de desenvolvimento.'],
                ['Clima organizacional tóxico que alimenta a rotação e o presentismo.', 'Clima e acompanhamento', 'Micro-desafios semanais e reavaliação, para que a mudança se mantenha na cultura e não só no dia da formação.'],
            ],
            'en' => [
                ['Technically brilliant leaders who drain motivation and create conflict in their teams.', 'Relationship management', 'Feedback, influence and conflict training, through role-plays built on the team’s real cases.'],
                ['Impulsive decisions under pressure that cost time, money and reputation.', 'Emotional self-control', 'Regulation techniques under pressure, practised in time-boxed decision simulations.'],
                ['Teams that don’t communicate openly or resolve tension constructively.', 'Social awareness', 'Reading facial expressions and non-verbal cues, active listening and structured difficult conversations.'],
                ['Low emotional self-awareness that leads to destructive behaviour patterns.', 'Self-awareness', 'An individual assessment (MSCEIT, EQ-i or ESCI) showing each leader’s emotional patterns, plus a development plan.'],
                ['A toxic organisational climate that feeds turnover and presenteeism.', 'Climate and follow-up', 'Weekly micro-challenges and re-assessment, so the change sticks in the culture and not just on training day.'],
            ],
        ],
        'facts' => [
            ['n' => ['pt' => '9 h', 'en' => '9 hrs'],
             't' => ['pt' => 'por semana é o tempo que os gestores dizem gastar com questões pessoais e emocionais das equipas.', 'en' => 'a week is what managers say they spend on their teams’ personal and emotional issues.'],
             'src' => 'Gartner, 2026', 'url' => 'https://www.gartner.com/en/newsroom/press-releases/2026-04-29-gartner-hr-survey-finds-47-percent-of-managers-say-they-are-working-harder-than-1-year-ago'],
            ['n' => ['pt' => '36%', 'en' => '36%'],
             't' => ['pt' => 'dos gestores sentem-se pouco preparados para gerir pessoas.', 'en' => 'of managers feel unprepared to manage people.'],
             'src' => 'Deloitte, 2025', 'url' => 'https://www.deloitte.com/us/en/about/press-room/deloitte-report-aims-to-help-leaders-navigate-complex-workplace-tensions.html'],
        ],
        'end' => ['pt' => 'A Inteligência Emocional não é um «toque suave». É a competência que determina se um líder inspira ou esgota a sua equipa.', 'en' => 'Emotional Intelligence isn’t a “soft touch”. It’s the skill that decides whether a leader inspires or drains their team.'],
    ],

    // 3. Objectives and skills
    'objectives' => [
        'pt' => [
            'Reconhecer e nomear as próprias emoções e perceber como influenciam o comportamento e as decisões.',
            'Regular as reações sob pressão e recuperar mais depressa depois de momentos difíceis.',
            'Ler as emoções dos outros na expressão facial, no tom de voz e na linguagem corporal.',
            'Dar feedback, conduzir conversas difíceis e gerir conflitos de forma construtiva.',
            'Usar as emoções para motivar, influenciar e decidir com mais clareza.',
            'Quando há diagnóstico, conhecer o próprio perfil emocional e ter um plano de desenvolvimento.',
        ],
        'en' => [
            'Recognise and name their own emotions and understand how they shape behaviour and decisions.',
            'Regulate their reactions under pressure and recover faster after difficult moments.',
            'Read other people’s emotions in facial expression, tone of voice and body language.',
            'Give feedback, lead difficult conversations and handle conflict constructively.',
            'Use emotions to motivate, influence and decide with more clarity.',
            'When an assessment is done, know their own emotional profile and have a development plan.',
        ],
    ],
    'skills' => [
        'pt' => ['Autoconsciência emocional', 'Autocontrolo emocional', 'Adaptabilidade', 'Empatia', 'Influência', 'Gestão de conflitos', 'Trabalho em equipa', 'Liderança inspiradora'],
        'en' => ['Emotional self-awareness', 'Emotional self-control', 'Adaptability', 'Empathy', 'Influence', 'Conflict management', 'Teamwork', 'Inspirational leadership'],
    ],

    // 4. Training content
    'modules' => [
        'h' => ['pt' => '4 módulos, um por domínio do modelo ESCI.', 'en' => '4 modules, one for each domain of the ESCI model.'],
        'p' => ['pt' => 'Os quatro domínios da Inteligência Emocional, do conhecimento de si à relação com os outros.', 'en' => 'The four domains of Emotional Intelligence, from knowing yourself to relating to others.'],
        'items' => [
            'pt' => [
                ['Autoconsciência', ['O que é a Inteligência Emocional e as três correntes científicas', 'Reconhecer, compreender e nomear emoções (método RULER)', 'Os próprios padrões emocionais e o seu impacto nas decisões']],
                ['Autogestão', ['Autocontrolo emocional sob pressão', 'Técnicas de regulação no momento', 'Adaptabilidade e otimismo realista perante a mudança']],
                ['Consciência social', ['Empatia e escuta ativa', 'Leitura de expressões faciais, tom de voz e sinais não-verbais', 'Ler o clima e as dinâmicas da equipa']],
                ['Gestão de relacionamentos', ['Feedback construtivo', 'Conversas difíceis estruturadas', 'Gestão de conflitos e influência', 'Liderar e inspirar a equipa']],
            ],
            'en' => [
                ['Self-awareness', ['What Emotional Intelligence is, and its three scientific schools', 'Recognising, understanding and labelling emotions (RULER method)', 'Your own emotional patterns and their impact on decisions']],
                ['Self-management', ['Emotional self-control under pressure', 'In-the-moment regulation techniques', 'Adaptability and realistic optimism in the face of change']],
                ['Social awareness', ['Empathy and active listening', 'Reading facial expressions, tone of voice and non-verbal cues', 'Reading the team’s climate and dynamics']],
                ['Relationship management', ['Constructive feedback', 'Structured difficult conversations', 'Conflict management and influence', 'Leading and inspiring the team']],
            ],
        ],
    ],

    // 5. Learning methodology
    'method' => [
        'h' => ['pt' => 'Prática, não teoria.', 'en' => 'Practice, not theory.'],
        'p' => ['pt' => 'Cada sessão alterna uma explicação breve com treino. O objetivo é que as competências passem para o trabalho logo na semana seguinte.', 'en' => 'Every session pairs a short explanation with practice. The aim is for the skills to reach day-to-day work the very next week.'],
        'cards' => [
            'pt' => [
                ['flask', 'O único baseado nas 3 correntes científicas', 'Paulo Moreira é o único formador em Portugal certificado simultaneamente no EQ-i (Bar-On), no MSCEIT (Yale/Mayer-Salovey-Caruso) e no ESCI (Goleman/Hay Group). Este programa integra o melhor das três abordagens.'],
                ['target', 'Diagnóstico antes da intervenção', 'Podemos iniciar com avaliação MSCEIT, EQ-i ou ESCI para identificar as competências a desenvolver. Sem diagnóstico, a formação é genérica. Com diagnóstico, é cirúrgica.'],
                ['bolt', 'Exercícios aplicados ao contexto real', 'Simulações, roleplays, análise de expressões faciais e exercícios aplicáveis ao dia a dia dos participantes. Sem apresentações intermináveis.'],
                ['loop', 'Follow-up estruturado', 'Micro-desafios semanais, sessões de acompanhamento e reavaliação para garantir a transferência das competências para o dia a dia.'],
            ],
            'en' => [
                ['flask', 'The only one built on all 3 scientific schools', 'Paulo Moreira is the only trainer in Portugal certified in EQ-i (Bar-On), MSCEIT (Yale/Mayer-Salovey-Caruso) and ESCI (Goleman/Hay Group). This programme combines the best of all three.'],
                ['target', 'Assessment before intervention', 'We can start with an MSCEIT, EQ-i or ESCI assessment to identify which skills to develop. Without assessment, training is generic. With it, it’s surgical.'],
                ['bolt', 'Exercises built on real work', 'Simulations, role-plays, facial-expression analysis and exercises applied to participants’ daily work. No endless slide decks.'],
                ['loop', 'Structured follow-up', 'Weekly micro-challenges, follow-up sessions and re-assessment to ensure skills transfer to everyday work.'],
            ],
        ],
        'activities' => [
            'pt' => ['Simulações', 'Roleplays com casos reais da equipa', 'Análise de expressões faciais', 'Diagnóstico e plano de desenvolvimento'],
            'en' => ['Simulations', 'Role-plays on the team’s real cases', 'Facial-expression analysis', 'Assessment and development plan'],
        ],
    ],
    'science' => [
        'pt' => [
            ['Modelo ESCI', 'Goleman & Boyatzis', 'O modelo que liga a Inteligência Emocional a competências de liderança e desempenho. Base do programa para a autoconsciência, a autogestão, a consciência social e a gestão de relacionamentos.'],
            ['Modelo MSCEIT', 'Mayer, Salovey & Caruso, Yale', 'O único modelo baseado em aptidão: mede o que a pessoa consegue fazer, não o que acha que consegue. Usado no diagnóstico e na medição da evolução.'],
            ['Modelo EQ-i', 'Bar-On', 'Liga a Inteligência Emocional ao bem-estar psicológico. Complementa a avaliação com a perspetiva de 360 graus (EQ 360).'],
            ['Método RULER', 'Yale Center for Emotional Intelligence', 'Framework prático para Reconhecer, Compreender, Rotular, Expressar e Regular emoções. Aplicado nos exercícios de treino.'],
        ],
        'en' => [
            ['ESCI model', 'Goleman & Boyatzis', 'The model linking Emotional Intelligence to leadership and performance competencies. The programme’s basis for self-awareness, self-management, social awareness and relationship management.'],
            ['MSCEIT model', 'Mayer, Salovey & Caruso, Yale', 'The only ability-based model: it measures what a person can do, not what they think they can do. Used for assessment and measuring progress.'],
            ['EQ-i model', 'Bar-On', 'Links Emotional Intelligence to psychological wellbeing. Adds a 360-degree perspective (EQ 360) to the assessment.'],
            ['RULER method', 'Yale Center for Emotional Intelligence', 'A practical framework to Recognise, Understand, Label, Express and Regulate emotions. Applied in the training exercises.'],
        ],
    ],

    // 7. Customisation and follow-up (adds to the common steps in content/programme-common.php)
    'diagnosis' => [
        'pt' => 'Avaliação inicial com MSCEIT, EQ-i ou ESCI, individual ou de grupo, para focar o programa nas competências que mais precisam de ser desenvolvidas.',
        'en' => 'An initial MSCEIT, EQ-i or ESCI assessment, individual or for the group, to focus the programme on the skills that most need developing.',
    ],
    'follow' => [
        ['target', ['pt' => 'Reavaliação', 'en' => 'Re-assessment'],
         ['pt' => 'Repetição do diagnóstico no fim do programa, para comparar com o ponto de partida.', 'en' => 'The assessment is repeated at the end of the programme, to compare with the starting point.']],
    ],
];
