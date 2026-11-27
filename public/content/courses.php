<?php
/**
 * Programme catalogue (cards, titles, slugs). Each text field is ['pt' => ..., 'en' => ...].
 * 'detail' => true: the programme has its own page, in the common 8-part structure:
 *   templates/course.php with the copy in content/programmes/{id}.php,
 *   or 'template' => 'programme' (the app programme, copy in content/app-programme.php).
 * Without 'detail', the card links to the contact form with the programme preselected.
 * The first programme is featured on the home page (uses 'tagline' and 'testimonial').
 */
return [
    [
        'id'     => 'ie',
        'detail' => true,
        'cover'  => 'programmes/inteligencia-emocional',
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
        'testimonial' => [
            'quote' => [
                'pt' => 'Experiência marcante de autoconhecimento a nível pessoal. De certeza que vou conseguir ter e fazer uma leitura mais eficaz do mundo à minha volta.',
                'en' => 'A remarkable experience of personal self-discovery. I’m certain I’ll now be able to read the world around me far more effectively.',
            ],
            'name' => 'João Silva',
            'role' => ['pt' => 'Nestlé — Estarreja', 'en' => 'Nestlé — Estarreja'],
        ],
    ],
    [
        // Programme with the practice app: its own page (templates/programme.php, copy in content/app-programme.php)
        'id' => 'app', 'detail' => true, 'template' => 'programme', 'icon' => 'device', 'variant' => 'app',
        'slug'  => ['pt' => 'formacao-com-app', 'en' => 'training-with-app'],
        'title' => ['pt' => 'Formação com App: trabalhar e medir competências emocionais', 'en' => 'Training with App: build and measure emotional skills'],
        'short' => ['pt' => 'Formação com App', 'en' => 'Training with App'],
        'excerpt' => ['pt' => '8 sessões e um desafio por dia numa app. Sete competências e quatro dimensões de Inteligência Emocional medidas no início e no fim, com relatório para a direção.', 'en' => '8 sessions and one challenge a day in an app. Seven skills and four Emotional Intelligence dimensions measured at the start and the end, with a report for management.'],
        'badge' => ['pt' => 'Com medição', 'en' => 'Measured'],
    ],
    [
        'id' => 'stress', 'detail' => true, 'icon' => 'shield', 'cover' => 'programmes/stress',
        'slug'  => ['pt' => 'gestao-de-stress-e-burnout', 'en' => 'stress-and-burnout'],
        'title' => ['pt' => 'Gestão de Stress e Prevenção de Burnout', 'en' => 'Stress Management and Burnout Prevention'],
        'short' => ['pt' => 'Gestão de Stress', 'en' => 'Stress Management'],
        'excerpt' => ['pt' => 'Regulação emocional e hábitos sustentáveis para equipas sob pressão contínua.', 'en' => 'Emotional regulation and sustainable habits for teams under constant pressure.'],
        'tagline' => ['pt' => 'Um programa baseado em neurociência e regulação emocional que ensina as equipas a identificar, compreender e gerir o stress antes que se transforme em esgotamento, absentismo e perda de produtividade.', 'en' => 'A programme grounded in neuroscience and emotion regulation that teaches teams to identify, understand and manage stress before it turns into burnout, absenteeism and lost productivity.'],
        'meta_desc' => ['pt' => 'Programa de gestão de stress e prevenção de burnout para empresas e Administração Pública: neurociência, regulação emocional e o Método ARSENAL.', 'en' => 'Stress management and burnout prevention programme for companies and the public sector: neuroscience, emotion regulation and the ARSENAL Method.'],
    ],
    [
        'id' => 'conflict', 'detail' => true, 'icon' => 'compass', 'cover' => 'programmes/conflitos',
        'slug'  => ['pt' => 'gestao-de-conflitos-e-negociacao', 'en' => 'conflict-and-negotiation'],
        'title' => ['pt' => 'Gestão de Conflitos e Negociação', 'en' => 'Conflict Management and Negotiation'],
        'short' => ['pt' => 'Conflitos e Negociação', 'en' => 'Conflict & Negotiation'],
        'excerpt' => ['pt' => 'Transformar tensão em acordo: escuta, leitura emocional e negociação colaborativa.', 'en' => 'Turning tension into agreement: listening, emotional reading and collaborative negotiation.'],
        'tagline' => ['pt' => 'Um programa que combina regulação emocional com o modelo de negociação de Harvard para dar às equipas ferramentas estruturadas de resolução de conflitos, em vez de os gerir por tentativa e erro.', 'en' => 'A programme combining emotion regulation with the Harvard negotiation model to give teams structured conflict-resolution tools, instead of handling conflict by trial and error.'],
        'meta_desc' => ['pt' => 'Programa de gestão de conflitos e negociação para equipas e líderes: regulação emocional, modelo de Harvard e personalidades difíceis.', 'en' => 'Conflict management and negotiation programme for teams and leaders: emotion regulation, the Harvard model and difficult personalities.'],
    ],
    [
        'id' => 'behaviour', 'detail' => true, 'icon' => 'users', 'cover' => 'programmes/comportamental',
        'slug'  => ['pt' => 'inteligencia-comportamental', 'en' => 'behavioural-intelligence'],
        'title' => ['pt' => 'Inteligência Comportamental', 'en' => 'Behavioural Intelligence'],
        'short' => ['pt' => 'Inteligência Comportamental', 'en' => 'Behavioural Intelligence'],
        'excerpt' => ['pt' => 'Ler comportamentos, expressões e sinais não-verbais para comunicar com mais eficácia.', 'en' => 'Reading behaviour, expressions and non-verbal cues to communicate more effectively.'],
        'tagline' => ['pt' => 'Um programa prático para ler emoções e comportamentos no rosto, na voz e no corpo, e ajustar a comunicação a cada pessoa e a cada situação: em reuniões, negociações, atendimento e liderança.', 'en' => 'A hands-on programme to read emotions and behaviour in the face, voice and body, and adjust communication to each person and situation: in meetings, negotiations, customer service and leadership.'],
        'meta_desc' => ['pt' => 'Programa de Inteligência Comportamental para empresas: leitura de expressões faciais e sinais não-verbais, perceção e comunicação adaptada.', 'en' => 'Behavioural Intelligence programme for companies: reading facial expressions and non-verbal cues, perception and adapted communication.'],
    ],
    [
        'id' => 'decision', 'detail' => true, 'icon' => 'spark', 'cover' => 'photos/stage-keynote',
        'slug'  => ['pt' => 'motivacao-e-tomada-de-decisao', 'en' => 'motivation-and-decision-making'],
        'title' => ['pt' => 'Motivação e Tomada de Decisão', 'en' => 'Motivation and Decision-Making'],
        'short' => ['pt' => 'Motivação e Decisão', 'en' => 'Motivation & Decisions'],
        'excerpt' => ['pt' => 'O papel das emoções nas escolhas e como manter equipas motivadas em contextos exigentes.', 'en' => 'The role of emotions in choices and how to keep teams motivated in demanding contexts.'],
        'tagline' => ['pt' => 'Um programa sobre o papel das emoções nas escolhas: como decidimos, onde nos enganamos e como manter as pessoas motivadas quando o contexto é exigente.', 'en' => 'A programme on the role of emotions in our choices: how we decide, where we go wrong and how to keep people motivated when the going gets tough.'],
        'meta_desc' => ['pt' => 'Programa de motivação e tomada de decisão para equipas e líderes: emoções e decisão, enviesamentos, motivação e procrastinação.', 'en' => 'Motivation and decision-making programme for teams and leaders: emotions and decisions, biases, motivation and procrastination.'],
    ],
];
