<?php
/**
 * Page copy for "Inteligência Comportamental" (common 8-part structure, see templates/course.php).
 * DRAFT FOR REVIEW: the WordPress page for this programme was still an empty template, so this copy was
 * written from the programme's short description and Paulo Moreira's published work. Check it before launch.
 */
return [
    'chips' => [
        ['eye',    ['pt' => 'Comunicação verbal e não-verbal', 'en' => 'Verbal and non-verbal communication']],
        ['layers', ['pt' => '4 módulos', 'en' => '4 modules']],
        ['pin',    ['pt' => 'Em todo o país ou online', 'en' => 'Nationwide or online']],
    ],

    // 1. Programme overview
    'intro' => [
        'h' => ['pt' => 'Comunicar bem começa por ler bem.', 'en' => 'Communicating well starts with reading well.'],
        'p' => [
            'pt' => [
                'Numa reunião, numa negociação ou num atendimento, as pessoas mostram o que sentem no rosto, no tom de voz e na postura, muitas vezes antes de o dizerem. Quem sabe ler estes sinais percebe mais cedo uma objeção, uma tensão ou um desacordo, e consegue ajustar a forma como comunica.',
                'Este programa treina essa leitura com base na investigação sobre a expressão das emoções e transforma-a em comunicação mais clara e adaptada a cada pessoa.',
                'Não se trata de «detetar mentiras» nem de rotular pessoas. Trata-se de observar melhor, confirmar o que se observa e responder com mais precisão.',
            ],
            'en' => [
                'In a meeting, a negotiation or a customer conversation, people show what they feel in their face, tone of voice and posture, often before they say it. Those who can read these cues spot an objection, a tension or a disagreement earlier, and can adjust how they communicate.',
                'This programme trains that reading, based on research into how emotions are expressed, and turns it into clearer communication adapted to each person.',
                'It isn’t about “detecting lies” or labelling people. It’s about observing better, checking what you observe and responding more precisely.',
            ],
        ],
    ],
    'audience' => [
        'pt' => [
            ['users', 'Líderes e chefias', 'Reuniões, feedback e gestão de equipas'],
            ['compass', 'Comerciais e negociadores', 'Clientes, propostas e negociações'],
            ['building', 'Atendimento ao público', 'Serviços, saúde, Administração Pública'],
            ['heart', 'Recursos Humanos', 'Entrevistas e conversas de desempenho'],
            ['target', 'Equipas de projeto', 'Comunicação entre áreas e parceiros'],
        ],
        'en' => [
            ['users', 'Leaders and managers', 'Meetings, feedback and team management'],
            ['compass', 'Sales and negotiators', 'Clients, proposals and negotiations'],
            ['building', 'Public-facing services', 'Services, health, public sector'],
            ['heart', 'Human Resources', 'Interviews and performance conversations'],
            ['target', 'Project teams', 'Communication across areas and partners'],
        ],
    ],

    // 2. Organisational challenges → how the programme responds
    'challenges' => [
        'h' => ['pt' => 'Muitos problemas de comunicação começam num sinal que ninguém leu.', 'en' => 'Many communication problems start with a cue nobody read.'],
        'p' => ['pt' => 'Situações que as organizações reconhecem, e o que o programa faz em relação a cada uma.', 'en' => 'Situations organisations recognise, and what the programme does about each one.'],
        'items' => [
            'pt' => [
                ['Reuniões onde se diz «sim» e se pensa «não».', 'Ler o desacordo silencioso', 'Treino da leitura de expressões faciais e sinais de desconforto, para perceber quando é preciso abrir a conversa.'],
                ['Clientes e cidadãos que saem insatisfeitos sem o dizer.', 'Atendimento mais atento', 'Reconhecer emoções no rosto e na voz e adaptar a resposta antes de a situação escalar.'],
                ['Mensagens que chegam distorcidas porque a forma não acompanhou o conteúdo.', 'Coerência entre palavras e postura', 'Consciência dos próprios sinais não-verbais e do tom de voz, para que a mensagem chegue como se pretende.'],
                ['Chefias que comunicam da mesma forma com pessoas muito diferentes.', 'Comunicação adaptada', 'Estilos de comunicação e como ajustar a abordagem a cada interlocutor.'],
                ['Decisões sobre pessoas tomadas pela primeira impressão.', 'Observar antes de concluir', 'Enviesamentos de perceção e como separar o que se observa do que se interpreta.'],
            ],
            'en' => [
                ['Meetings where people say “yes” and think “no”.', 'Reading silent disagreement', 'Training in reading facial expressions and signs of discomfort, to know when the conversation needs opening up.'],
                ['Customers and citizens who leave unhappy without saying so.', 'More attentive service', 'Recognising emotions in face and voice and adapting the response before things escalate.'],
                ['Messages that land wrong because the delivery didn’t match the content.', 'Words and posture in line', 'Awareness of your own non-verbal cues and tone of voice, so the message lands as intended.'],
                ['Managers who communicate the same way with very different people.', 'Adapted communication', 'Communication styles and how to adjust the approach to each person.'],
                ['Decisions about people made on first impressions.', 'Observe before concluding', 'Perception biases and how to separate what you observe from what you interpret.'],
            ],
        ],
        'facts' => [
            ['n' => ['pt' => '28%', 'en' => '28%'],
             't' => ['pt' => 'dos trabalhadores em Portugal apontam falta de comunicação ou de cooperação interna.', 'en' => 'of workers in Portugal point to poor internal communication or cooperation.'],
             'src' => 'EU-OSHA, 2025', 'url' => 'https://osha.europa.eu/sites/default/files/documents/OSH-pulse-2025-mental-health-digitalisation-work-PT_PT.pdf'],
            ['n' => ['pt' => '39%', 'en' => '39%'],
             't' => ['pt' => 'dos colaboradores dizem que a chefia lhes dá feedback claro.', 'en' => 'of employees say their manager gives them clear feedback.'],
             'src' => 'Gartner, 2026', 'url' => 'https://www.gartner.com/en/newsroom/press-releases/2026-04-29-gartner-hr-survey-finds-47-percent-of-managers-say-they-are-working-harder-than-1-year-ago'],
        ],
        'end' => ['pt' => 'Ler melhor as pessoas não serve para as rotular. Serve para comunicar com elas de forma mais eficaz.', 'en' => 'Reading people better isn’t about labelling them. It’s about communicating with them more effectively.'],
    ],

    // 3. Objectives and skills
    'objectives' => [
        'pt' => [
            'Reconhecer as expressões faciais das emoções básicas, incluindo as mais subtis.',
            'Interpretar sinais de linguagem corporal e de voz no seu contexto, sem conclusões precipitadas.',
            'Ter consciência dos próprios sinais não-verbais e da imagem que transmitem.',
            'Identificar estilos de comunicação e adaptar a abordagem a cada interlocutor.',
            'Separar observação de interpretação e confirmar hipóteses com perguntas.',
            'Aplicar estas competências em reuniões, negociações, atendimento e conversas de feedback.',
        ],
        'en' => [
            'Recognise the facial expressions of the basic emotions, including the subtle ones.',
            'Interpret body-language and voice cues in context, without jumping to conclusions.',
            'Be aware of their own non-verbal cues and the image they project.',
            'Identify communication styles and adapt their approach to each person.',
            'Separate observation from interpretation and test hypotheses with questions.',
            'Apply these skills in meetings, negotiations, customer service and feedback conversations.',
        ],
    ],
    'skills' => [
        'pt' => ['Leitura de expressões faciais', 'Linguagem corporal', 'Comunicação não-verbal', 'Escuta ativa', 'Empatia', 'Comunicação assertiva', 'Influência'],
        'en' => ['Reading facial expressions', 'Body language', 'Non-verbal communication', 'Active listening', 'Empathy', 'Assertive communication', 'Influence'],
    ],

    // 4. Training content
    'modules' => [
        'h' => ['pt' => '4 módulos: da observação à comunicação.', 'en' => '4 modules: from observation to communication.'],
        'p' => ['pt' => 'Primeiro aprender a ver o que o rosto, a voz e o corpo mostram. Depois interpretar com rigor. Por fim, usar essa informação para comunicar melhor.', 'en' => 'First learn to see what the face, voice and body show. Then interpret with care. Finally, use that information to communicate better.'],
        'items' => [
            'pt' => [
                ['As emoções no rosto', ['As emoções básicas e a sua expressão facial', 'A investigação de Paul Ekman', 'Microexpressões e expressões subtis', 'Exercícios práticos de reconhecimento']],
                ['Corpo e voz', ['Linguagem corporal e postura', 'Tom, ritmo e volume da voz', 'Sinais de conforto e de desconforto', 'Ler os sinais em conjunto e no contexto']],
                ['Perceção e interpretação', ['Primeiras impressões e enviesamentos de perceção', 'Separar observação de interpretação', 'Confirmar hipóteses com perguntas abertas', 'Escuta ativa']],
                ['Comunicar com impacto', ['Estilos de comunicação e assertividade', 'Adaptar a mensagem ao interlocutor', 'Coerência entre palavras, voz e corpo', 'Reuniões, negociação, atendimento e feedback']],
            ],
            'en' => [
                ['Emotions in the face', ['The basic emotions and how the face expresses them', 'Paul Ekman’s research', 'Micro-expressions and subtle expressions', 'Hands-on recognition exercises']],
                ['Body and voice', ['Body language and posture', 'Tone, pace and volume of voice', 'Signs of comfort and discomfort', 'Reading cues together and in context']],
                ['Perception and interpretation', ['First impressions and perception biases', 'Separating observation from interpretation', 'Testing hypotheses with open questions', 'Active listening']],
                ['Communicating with impact', ['Communication styles and assertiveness', 'Adapting the message to the listener', 'Words, voice and body in line', 'Meetings, negotiation, service and feedback']],
            ],
        ],
    ],

    // 5. Learning methodology
    'method' => [
        'h' => ['pt' => 'Observar, praticar e aplicar.', 'en' => 'Observe, practise, apply.'],
        'p' => ['pt' => 'Pouca teoria e muito treino: exercícios de observação, análise de situações e simulações com casos do dia a dia da equipa.', 'en' => 'Little theory and a lot of practice: observation exercises, situation analysis and simulations built on the team’s daily cases.'],
        'cards' => [
            'pt' => [
                ['flask', 'Base científica', 'Investigação sobre a expressão e o reconhecimento das emoções, aplicada ao contexto profissional.'],
                ['eye', 'Treino de observação', 'Exercícios práticos para reconhecer expressões faciais e sinais não-verbais com mais rapidez e precisão.'],
                ['users', 'Simulações com casos reais', 'Reuniões, negociações e atendimentos simulados a partir de situações da própria organização.'],
                ['shield', 'Uso responsável', 'Ler sinais não é adivinhar pensamentos. O programa ensina a confirmar o que se observa antes de agir.'],
            ],
            'en' => [
                ['flask', 'Scientific basis', 'Research on how emotions are expressed and recognised, applied to the workplace.'],
                ['eye', 'Observation training', 'Hands-on exercises to recognise facial expressions and non-verbal cues faster and more accurately.'],
                ['users', 'Simulations with real cases', 'Meetings, negotiations and service situations simulated from the organisation’s own cases.'],
                ['shield', 'Responsible use', 'Reading cues isn’t mind-reading. The programme teaches people to check what they observe before acting.'],
            ],
        ],
        'activities' => [
            'pt' => ['Exercícios de reconhecimento de expressões', 'Análise de situações', 'Roleplays', 'Feedback entre participantes', 'Casos reais da equipa'],
            'en' => ['Expression-recognition exercises', 'Situation analysis', 'Role-plays', 'Peer feedback', 'The team’s real cases'],
        ],
    ],
];
