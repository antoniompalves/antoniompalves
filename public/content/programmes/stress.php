<?php
/**
 * Page copy for "Gestão de Stress e Prevenção de Burnout" (common 8-part structure, see templates/course.php).
 * Source: the programme page on the WordPress beta site. Its unsourced figures (e.g. "88% …", "-35% absentismo")
 * are left out; 'facts' only holds figures with a source and a link.
 */
return [
    'chips' => [
        ['flask',  ['pt' => 'Neurociência e regulação emocional', 'en' => 'Neuroscience and emotion regulation']],
        ['layers', ['pt' => '4 módulos', 'en' => '4 modules']],
        ['pin',    ['pt' => 'Em todo o país ou online', 'en' => 'Nationwide or online']],
    ],

    // 1. Programme overview
    'intro' => [
        'h' => ['pt' => 'O stress faz parte da vida profissional. O problema é não ter como o regular.', 'en' => 'Stress is part of working life. The problem is having no way to regulate it.'],
        'p' => [
            'pt' => [
                'O problema surge quando as pessoas não têm competências para regular o stress e quando as organizações não criam condições para uma recuperação saudável. É aí que o stress se transforma em esgotamento, absentismo e perda de produtividade.',
                'Este programa, baseado em neurociência e regulação emocional, ensina as equipas a identificar, compreender e gerir o stress antes de isso acontecer.',
                'Para a organização é também prevenção de riscos psicossociais: a Lei 102/2009 obriga o empregador a assegurar que os fatores de risco psicossociais não constituem risco para quem trabalha.',
            ],
            'en' => [
                'Trouble starts when people lack the skills to regulate stress and organisations don’t create the conditions for healthy recovery. That is when stress turns into burnout, absenteeism and lost productivity.',
                'Built on neuroscience and emotion regulation, this programme teaches teams to identify, understand and manage stress before that happens.',
                'For the organisation it is also psychosocial risk prevention: Portuguese law (Lei 102/2009) requires employers to ensure psychosocial risk factors do not put workers at risk.',
            ],
        ],
        'src' => ['Lei 102/2009', 'https://diariodarepublica.pt/dr/detalhe/lei/102-2009-490009'],
    ],
    'audience' => [
        'pt' => [
            ['building', 'Administração Pública', 'Câmaras, institutos públicos, atendimento ao cidadão'],
            ['heart', 'Profissionais de saúde', 'Hospitais, centros de saúde, INEM'],
            ['target', 'Lideranças sob pressão', 'Pressão constante de resultados'],
            ['users', 'Contacto com o público', 'Call centers, serviços sociais, justiça'],
            ['loop', 'Organizações em mudança', 'Reestruturação, crise ou transformação'],
        ],
        'en' => [
            ['building', 'Public sector', 'Municipalities, public institutes, citizen services'],
            ['heart', 'Health professionals', 'Hospitals, health centres, emergency services'],
            ['target', 'Leaders under pressure', 'Constant pressure for results'],
            ['users', 'Public-facing teams', 'Call centres, social services, justice'],
            ['loop', 'Organisations in change', 'Restructuring, crisis or transformation'],
        ],
    ],

    // 2. Organisational challenges → how the programme responds
    'challenges' => [
        'h' => ['pt' => 'O custo do stress está nas baixas, no presentismo e na rotação.', 'en' => 'The cost of stress shows in sick leave, presenteeism and turnover.'],
        'p' => ['pt' => 'Sinais que as organizações reconhecem, e o que o programa faz em relação a cada um.', 'en' => 'Signs organisations recognise, and what the programme does about each one.'],
        'items' => [
            'pt' => [
                ['Absentismo por causas psicológicas, no setor público e no privado.', 'Prevenção, não só apoio', 'Treino para reconhecer os sinais precoces de esgotamento e aplicar estratégias de regulação antes de a situação chegar à baixa.'],
                ['Presentismo: pessoas presentes fisicamente e ausentes emocionalmente.', 'Interromper a espiral', 'Estratégias imediatas de regulação, respiração e ancoragem para interromper espirais de stress no momento e recuperar o foco.'],
                ['Líderes que não regulam o próprio stress e o passam à equipa.', 'Regular primeiro quem lidera', 'O processo de regulação emocional (modelo de Gross), aplicado às situações de pressão que as chefias vivem.'],
                ['Equipas que «aguentam» até não aguentarem.', 'Mindset do stress', 'Recalibrar a forma como o stress é percecionado, com base na investigação de Alia Crum (Stanford), e o Método ARSENAL para a pressão.'],
                ['Pressão crónica sem suporte, que faz disparar a saída de talento.', 'Condições na organização', 'Recomendações para a organização criar condições estruturais de recuperação e prevenção do burnout.'],
            ],
            'en' => [
                ['Absenteeism for psychological reasons, in both the public and private sector.', 'Prevention, not just support', 'Training to spot the early signs of burnout and apply regulation strategies before it ends in sick leave.'],
                ['Presenteeism: people physically present and emotionally absent.', 'Breaking the spiral', 'Immediate regulation, breathing and grounding strategies to break stress spirals in the moment and regain focus.'],
                ['Leaders who don’t regulate their own stress and pass it on to the team.', 'Regulate those who lead first', 'The emotion-regulation process (Gross’s model), applied to the pressure situations managers face.'],
                ['Teams that “cope” until they can’t.', 'Stress mindset', 'Recalibrating how stress is perceived, based on Alia Crum’s research (Stanford), and the ARSENAL Method for pressure.'],
                ['Chronic pressure without support, which drives talent out.', 'Conditions in the organisation', 'Recommendations for the organisation to put in place structural conditions for recovery and burnout prevention.'],
            ],
        ],
        'facts' => [
            ['n' => ['pt' => '13,3 mil M€', 'en' => '€13.3bn'],
             't' => ['pt' => 'por ano: o custo estimado do stresse e dos problemas de saúde psicológica para as empresas portuguesas.', 'en' => 'a year: the estimated cost of stress and psychological health problems to Portuguese companies.'],
             'src' => 'OPP, 2026', 'url' => 'https://www.ordemdospsicologos.pt/ficheiros/documentos/opp_relatorio_prosperidadeesustentabilidadedasorganizacoes_2026.pdf'],
            ['n' => ['pt' => '47%', 'en' => '47%'],
             't' => ['pt' => 'dos trabalhadores em Portugal sentiram muito stresse no dia anterior (média europeia: 39%).', 'en' => 'of workers in Portugal felt a lot of stress the previous day (European average: 39%).'],
             'src' => 'Gallup, 2026', 'url' => 'https://www.gallup.com/workplace/706826/state-global-workplace-portugal-country-level-data.aspx'],
        ],
        'end' => ['pt' => 'Prevenir o burnout não é uma questão de «resiliência individual». É uma competência organizacional que se treina.', 'en' => 'Preventing burnout isn’t a matter of “individual resilience”. It’s an organisational skill that can be trained.'],
    ],

    // 3. Objectives and skills
    'objectives' => [
        'pt' => [
            'Perceber o que acontece no cérebro e no corpo perante o stress e distinguir stress agudo de crónico.',
            'Reconhecer os sinais precoces de esgotamento, em si e na equipa.',
            'Aplicar estratégias imediatas de regulação: respiração, ancoragem e reestruturação cognitiva.',
            'Mudar a forma como interpretam o stress e aumentar a resistência psicológica.',
            'Escolher a estratégia de regulação emocional mais adequada a cada momento.',
            'Identificar, com a organização, condições que favorecem a recuperação e previnem o burnout.',
        ],
        'en' => [
            'Understand what happens in the brain and body under stress, and tell acute from chronic stress.',
            'Recognise the early signs of burnout, in themselves and in the team.',
            'Apply immediate regulation strategies: breathing, grounding and cognitive reframing.',
            'Change how they interpret stress and build psychological resilience.',
            'Choose the most suitable emotion-regulation strategy for each moment.',
            'Identify, with the organisation, conditions that support recovery and prevent burnout.',
        ],
    ],
    'skills' => [
        'pt' => ['Regulação emocional', 'Gestão do stress', 'Resistência psicológica', 'Autoconsciência', 'Reestruturação cognitiva', 'Prevenção do burnout'],
        'en' => ['Emotion regulation', 'Stress management', 'Psychological resilience', 'Self-awareness', 'Cognitive reframing', 'Burnout prevention'],
    ],

    // 4. Training content
    'modules' => [
        'h' => ['pt' => '4 módulos: da compreensão à prevenção.', 'en' => '4 modules: from understanding to prevention.'],
        'p' => ['pt' => 'Primeiro compreender o que é o stress a nível cerebral. Depois aprender a geri-lo. Por fim, construir resistência psicológica duradoura.', 'en' => 'First, understand what stress is at brain level. Then learn to manage it. Finally, build lasting psychological resilience.'],
        'items' => [
            'pt' => [
                ['Compreender o Stress', ['A origem do stress', 'Como o cérebro processa o stress: amígdala, córtex pré-frontal, eixo HPA', 'Stress agudo e stress crónico', 'Sinais precoces de esgotamento']],
                ['Lidar com o Stress', ['Estratégias imediatas de regulação', 'Técnicas de respiração e ancoragem', 'Reestruturação cognitiva', 'Como interromper espirais de stress no momento']],
                ['O Mindset do Stress', ['Modificar o mindset do stress', 'A investigação de Alia Crum (Stanford)', 'Aumentar a resistência psicológica', 'O Método ARSENAL para a gestão emocional sob pressão']],
                ['Regulação Emocional', ['O processo modal da regulação emocional (Gross)', 'Os 5 momentos para gerir uma emoção', 'Escolher e aplicar a melhor estratégia', 'Técnicas avançadas de gestão emocional']],
            ],
            'en' => [
                ['Understanding Stress', ['Where stress comes from', 'How the brain processes stress: amygdala, prefrontal cortex, HPA axis', 'Acute and chronic stress', 'Early signs of burnout']],
                ['Dealing with Stress', ['Immediate regulation strategies', 'Breathing and grounding techniques', 'Cognitive reframing', 'How to break stress spirals in the moment']],
                ['The Stress Mindset', ['Changing your stress mindset', 'Alia Crum’s research (Stanford)', 'Building psychological resilience', 'The ARSENAL Method for managing emotions under pressure']],
                ['Emotion Regulation', ['The modal model of emotion regulation (Gross)', 'The 5 moments to manage an emotion', 'Choosing and applying the best strategy', 'Advanced emotion-management techniques']],
            ],
        ],
    ],

    // 5. Learning methodology
    'method' => [
        'h' => ['pt' => 'Não ensinamos a «aguentar». Ensinamos a regular.', 'en' => 'We don’t teach people to “cope”. We teach them to regulate.'],
        'p' => ['pt' => 'Muitos programas de gestão de stress ficam por técnicas de relaxamento. Este trabalha o processo completo: da compreensão neurocientífica do stress à aplicação de estratégias de regulação emocional validadas.', 'en' => 'Many stress-management programmes stop at relaxation techniques. This one covers the whole process: from a neuroscience understanding of stress to applying validated emotion-regulation strategies.'],
        'cards' => [
            'pt' => [
                ['flask', 'Neurociência explicada de forma simples', 'Perceber o que acontece no cérebro e no corpo ajuda cada pessoa a reconhecer o próprio stress e a perceber porque é que as técnicas funcionam.'],
                ['shield', 'O Método ARSENAL', 'Um framework próprio que combina as melhores práticas da investigação em regulação emocional com ferramentas aplicáveis no momento de pressão.'],
                ['spark', 'Mindset do stress', 'A investigação mostra que a forma como percecionamos o stress muda o seu impacto no corpo. Trabalhamos a recalibração cognitiva.'],
                ['building', 'Impacto organizacional, não só individual', 'Incluímos recomendações para a organização criar condições estruturais de recuperação e prevenção do burnout.'],
            ],
            'en' => [
                ['flask', 'Neuroscience made simple', 'Understanding what happens in the brain and body helps people recognise their own stress and see why the techniques work.'],
                ['shield', 'The ARSENAL Method', 'A proprietary framework combining best practice from emotion-regulation research with tools you can use in the moment of pressure.'],
                ['spark', 'Stress mindset', 'Research shows that how we perceive stress changes its impact on the body. We work on cognitive recalibration.'],
                ['building', 'Organisational impact, not just individual', 'We include recommendations for the organisation to create structural conditions for recovery and burnout prevention.'],
            ],
        ],
        'activities' => [
            'pt' => ['Exercícios de respiração e ancoragem', 'Reestruturação cognitiva', 'Sinais precoces de esgotamento', 'Situações reais da equipa', 'Ferramentas para o momento de pressão'],
            'en' => ['Breathing and grounding exercises', 'Cognitive reframing', 'Early signs of burnout', 'The team’s real situations', 'Tools for the moment of pressure'],
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

    // 7. Customisation and follow-up (adds to the common steps)
    'follow' => [
        ['building', ['pt' => 'Recomendações para a organização', 'en' => 'Recommendations for the organisation'],
         ['pt' => 'Propostas concretas para criar condições estruturais de recuperação e prevenção do burnout.', 'en' => 'Concrete proposals to create structural conditions for recovery and burnout prevention.']],
    ],
];
