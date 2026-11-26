<?php
/**
 * Course catalogue. Each text field is ['pt' => ..., 'en' => ...].
 * Set 'detail' => true once a course has a full page; otherwise it shows as "coming soon".
 */
return [
    [
        'id'     => 'ie',
        'detail' => true,
        'icon'   => 'heart',
        'slug'   => ['pt' => 'inteligencia-emocional', 'en' => 'emotional-intelligence'],
        'title'  => ['pt' => 'Inteligência Emocional para Equipas e Líderes', 'en' => 'Emotional Intelligence for Teams and Leaders'],
        'short'  => ['pt' => 'Inteligência Emocional', 'en' => 'Emotional Intelligence'],
        'tagline'=> [
            'pt' => 'O programa mais completo para desenvolver as competências emocionais que determinam a qualidade da liderança, da comunicação e das decisões na sua organização. Baseado no modelo ESCI de Daniel Goleman e nas três correntes científicas da Inteligência Emocional.',
            'en' => 'The most complete programme to develop the emotional skills that shape the quality of leadership, communication and decision-making in your organisation. Based on Daniel Goleman’s ESCI model and the three scientific schools of Emotional Intelligence.',
        ],
        'meta_desc' => [
            'pt' => 'Programa de Inteligência Emocional para equipas e líderes, baseado no ESCI de Goleman, com diagnóstico MSCEIT/EQ-i, treino prático e follow-up.',
            'en' => 'Emotional Intelligence programme for teams and leaders, based on Goleman’s ESCI, with MSCEIT/EQ-i assessment, hands-on training and follow-up.',
        ],
        'excerpt'=> [
            'pt' => 'Autoconsciência, autocontrolo, consciência social e gestão de relacionamentos — com diagnóstico científico e follow-up.',
            'en' => 'Self-awareness, self-management, social awareness and relationship management — with scientific assessment and follow-up.',
        ],
        'problem' => [
            'pt' => [
                'Líderes tecnicamente brilhantes que geram desmotivação e conflitos nas equipas.',
                'Decisões impulsivas sob pressão que custam tempo, dinheiro e reputação.',
                'Equipas que não comunicam com transparência nem resolvem tensões de forma construtiva.',
                'Falta de autoconsciência emocional que leva a padrões de comportamento destrutivos.',
                'Clima organizacional tóxico que alimenta o turnover e o presentismo.',
            ],
            'en' => [
                'Technically brilliant leaders who drain motivation and create conflict in their teams.',
                'Impulsive decisions under pressure that cost time, money and reputation.',
                'Teams that don’t communicate openly or resolve tension constructively.',
                'Low emotional self-awareness that leads to destructive behaviour patterns.',
                'A toxic organisational climate that feeds turnover and presenteeism.',
            ],
        ],
        // How the programme answers each problem above (same order). Shown in the interactive problem → solution switcher.
        'solve' => [
            'pt' => [
                ['Gestão de relacionamentos (ESCI)', 'Treino de feedback, influência e gestão de conflito com roleplays baseados em casos reais da equipa.'],
                ['Autocontrolo emocional', 'Técnicas de regulação sob pressão treinadas em simulações de decisão com tempo limitado.'],
                ['Consciência social', 'Leitura de expressões faciais e sinais não-verbais, escuta ativa e conversas difíceis estruturadas.'],
                ['Autoconsciência (MSCEIT / EQ-i)', 'Diagnóstico individual que mostra os padrões emocionais de cada líder — e um plano de desenvolvimento.'],
                ['Clima e follow-up', 'Micro-desafios semanais e reavaliação para que a mudança se mantenha na cultura, não só no dia da formação.'],
            ],
            'en' => [
                ['Relationship management (ESCI)', 'Feedback, influence and conflict training through role-plays built on the team’s real cases.'],
                ['Emotional self-control', 'Regulation techniques under pressure, practised in time-boxed decision simulations.'],
                ['Social awareness', 'Reading facial expressions and non-verbal cues, active listening and structured difficult conversations.'],
                ['Self-awareness (MSCEIT / EQ-i)', 'Individual assessment revealing each leader’s emotional patterns — plus a development plan.'],
                ['Climate and follow-up', 'Weekly micro-challenges and re-assessment so the change sticks in the culture, not just on training day.'],
            ],
        ],
        'audience' => [
            'pt' => [
                ['users', 'Equipas de liderança', 'C-Suite, direções e coordenações'],
                ['heart', 'Recursos Humanos', 'Diretores e técnicos de RH'],
                ['target', 'Equipas de projeto', 'Equipas multidisciplinares'],
                ['building', 'Administração Pública', 'Câmaras, Institutos, Ministérios'],
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
        'why' => [
            'pt' => [
                ['flask', 'O único baseado nas 3 correntes científicas', 'Paulo Moreira é o único formador em Portugal certificado simultaneamente no EQ-i (Bar-On), no MSCEIT (Yale/Mayer-Salovey-Caruso) e no ESCI (Goleman/Hay Group). Este programa integra o melhor das três abordagens.'],
                ['target', 'Diagnóstico antes da intervenção', 'Podemos iniciar com avaliação MSCEIT, EQ-i ou ESCI para identificar as competências a desenvolver. Sem diagnóstico, a formação é genérica. Com diagnóstico, é cirúrgica.'],
                ['bolt', 'Prática, não teoria', 'Simulações, roleplays, análise de expressões faciais e exercícios aplicáveis ao contexto real dos participantes. Sem PowerPoints intermináveis.'],
                ['loop', 'Follow-up estruturado', 'Micro-desafios semanais, sessões de acompanhamento e reavaliação para garantir transferência de competências para o quotidiano.'],
            ],
            'en' => [
                ['flask', 'The only one built on all 3 scientific schools', 'Paulo Moreira is the only trainer in Portugal certified in EQ-i (Bar-On), MSCEIT (Yale/Mayer-Salovey-Caruso) and ESCI (Goleman/Hay Group). This programme combines the best of all three.'],
                ['target', 'Assessment before intervention', 'We can start with an MSCEIT, EQ-i or ESCI assessment to identify which skills to develop. Without assessment, training is generic. With it, it’s surgical.'],
                ['bolt', 'Practice, not theory', 'Simulations, role-plays, facial-expression analysis and exercises applied to participants’ real context. No endless slide decks.'],
                ['loop', 'Structured follow-up', 'Weekly micro-challenges, follow-up sessions and re-assessment to ensure skills transfer to everyday work.'],
            ],
        ],
        'science' => [
            'pt' => [
                ['Modelo ESCI', 'Goleman & Boyatzis', 'O modelo que liga Inteligência Emocional a competências de liderança e performance. Base do programa no que toca a autoconsciência, autocontrolo, consciência social e gestão de relacionamentos.'],
                ['Modelo MSCEIT', 'Mayer, Salovey & Caruso — Yale', 'O único modelo baseado em aptidão: mede o que a pessoa consegue fazer, não o que acha que consegue. Utilizado no diagnóstico e na medição de evolução.'],
                ['Modelo EQ-i', 'Bar-On', 'Liga Inteligência Emocional ao bem-estar psicológico. Complementa a avaliação com a perspetiva de 360 graus (EQ 360).'],
                ['Método RULER', 'Yale Center for Emotional Intelligence', 'Framework prático para Reconhecer, Compreender, Rotular, Expressar e Regular emoções. Aplicado nos exercícios de treino.'],
            ],
            'en' => [
                ['ESCI model', 'Goleman & Boyatzis', 'The model linking Emotional Intelligence to leadership and performance competencies. The programme’s foundation for self-awareness, self-management, social awareness and relationship management.'],
                ['MSCEIT model', 'Mayer, Salovey & Caruso — Yale', 'The only ability-based model: it measures what a person can do, not what they think they can do. Used for assessment and measuring progress.'],
                ['EQ-i model', 'Bar-On', 'Links Emotional Intelligence to psychological wellbeing. Adds a 360-degree perspective (EQ 360) to the assessment.'],
                ['RULER method', 'Yale Center for Emotional Intelligence', 'A practical framework to Recognise, Understand, Label, Express and Regulate emotions. Applied in the training exercises.'],
            ],
        ],
        'testimonial' => [
            'quote' => [
                'pt' => 'Experiência marcante de autoconhecimento a nível pessoal. De certeza que vou conseguir ter e fazer uma leitura mais eficaz do mundo à minha volta.',
                'en' => 'A remarkable experience of personal self-discovery. I’m certain I’ll now be able to read the world around me far more effectively.',
            ],
            'name' => 'João Silva',
            'role' => ['pt' => 'Nestlé — Estarreja', 'en' => 'Nestlé — Estarreja'],
        ],
        'formats' => true,
    ],
    [
        'id' => 'stress', 'detail' => false, 'icon' => 'shield',
        'slug'  => ['pt' => 'gestao-de-stress-e-burnout', 'en' => 'stress-and-burnout'],
        'title' => ['pt' => 'Gestão de Stress e Prevenção de Burnout', 'en' => 'Stress Management and Burnout Prevention'],
        'short' => ['pt' => 'Gestão de Stress', 'en' => 'Stress Management'],
        'excerpt' => ['pt' => 'Regulação emocional e hábitos sustentáveis para equipas sob pressão contínua.', 'en' => 'Emotional regulation and sustainable habits for teams under constant pressure.'],
    ],
    [
        'id' => 'conflict', 'detail' => false, 'icon' => 'compass',
        'slug'  => ['pt' => 'gestao-de-conflitos-e-negociacao', 'en' => 'conflict-and-negotiation'],
        'title' => ['pt' => 'Gestão de Conflitos e Negociação', 'en' => 'Conflict Management and Negotiation'],
        'short' => ['pt' => 'Conflitos e Negociação', 'en' => 'Conflict & Negotiation'],
        'excerpt' => ['pt' => 'Transformar tensão em acordo: escuta, leitura emocional e negociação colaborativa.', 'en' => 'Turning tension into agreement: listening, emotional reading and collaborative negotiation.'],
    ],
    [
        'id' => 'behaviour', 'detail' => false, 'icon' => 'users',
        'slug'  => ['pt' => 'inteligencia-comportamental', 'en' => 'behavioural-intelligence'],
        'title' => ['pt' => 'Inteligência Comportamental', 'en' => 'Behavioural Intelligence'],
        'short' => ['pt' => 'Inteligência Comportamental', 'en' => 'Behavioural Intelligence'],
        'excerpt' => ['pt' => 'Ler comportamentos, expressões e sinais não-verbais para comunicar com mais eficácia.', 'en' => 'Reading behaviour, expressions and non-verbal cues to communicate more effectively.'],
    ],
    [
        'id' => 'decision', 'detail' => false, 'icon' => 'spark',
        'slug'  => ['pt' => 'motivacao-e-tomada-de-decisao', 'en' => 'motivation-and-decision-making'],
        'title' => ['pt' => 'Motivação e Tomada de Decisão', 'en' => 'Motivation and Decision-Making'],
        'short' => ['pt' => 'Motivação e Decisão', 'en' => 'Motivation & Decisions'],
        'excerpt' => ['pt' => 'O papel das emoções nas escolhas e como manter equipas motivadas em contextos exigentes.', 'en' => 'The role of emotions in choices and how to keep teams motivated in demanding contexts.'],
    ],
];
