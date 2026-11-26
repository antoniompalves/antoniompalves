<?php
/**
 * Consulting engagements (Paulo Moreira). Text fields are ['pt' => ..., 'en' => ...].
 * No client results are invented here — add real case figures to 'measure' once available.
 */
return [
    'services' => [
        [
            'id'   => 'coaching',
            'icon' => 'compass',
            'name' => ['pt' => 'Coaching executivo', 'en' => 'Executive coaching'],
            'one'  => ['pt' => 'Acompanhamento individual para líderes de topo e talentos de alto potencial.', 'en' => 'One-to-one support for senior leaders and high-potential talent.'],
            'when' => [
                'pt' => 'Quando um líder valioso começa a gerar fricção, está a assumir uma função mais exigente, ou o sucesso já não chega com a facilidade de antes.',
                'en' => 'When a valued leader starts creating friction, is stepping into a bigger role, or success no longer comes as easily as it used to.',
            ],
            'what' => [
                'pt' => 'Diagnóstico com instrumentos validados, conversas com quem trabalha com o líder e sessões focadas em 1 a 2 comportamentos com maior impacto no negócio.',
                'en' => 'Assessment with validated instruments, conversations with the people who work with the leader, and sessions focused on the 1–2 behaviours with the biggest business impact.',
            ],
            'diff' => [
                'pt' => ['Diagnóstico MSCEIT, EQ-i ou ESCI 360 antes da primeira sessão', 'Entrevistas confidenciais a stakeholders, não apenas questionários', 'Objetivos comportamentais acordados com a chefia', 'Mini-inquéritos de progresso ao longo do processo'],
                'en' => ['MSCEIT, EQ-i or ESCI 360 assessment before the first session', 'Confidential stakeholder interviews, not just questionnaires', 'Behavioural goals agreed with the line manager', 'Progress mini-surveys throughout the process'],
            ],
            'measure' => [
                'pt' => ['Perceção de eficácia pelos stakeholders', 'Evolução nas competências avaliadas', 'Clima na equipa direta'],
                'en' => ['Stakeholder-rated effectiveness', 'Change in assessed competencies', 'Climate in the direct team'],
            ],
            'cta' => ['pt' => 'Falar sobre coaching executivo', 'en' => 'Discuss executive coaching'],
        ],
        [
            'id'   => 'teams',
            'icon' => 'users',
            'name' => ['pt' => 'Aceleração de equipas de liderança', 'en' => 'Leadership team acceleration'],
            'one'  => ['pt' => 'Para comissões executivas e direções que precisam de confiança, alinhamento e clareza.', 'en' => 'For executive committees and boards that need trust, alignment and clarity.'],
            'when' => [
                'pt' => 'Quando a equipa de topo tem talento individual mas não funciona como equipa: decisões que se arrastam, conflitos evitados ou mal resolvidos, papéis pouco claros.',
                'en' => 'When the top team has individual talent but doesn’t work as a team: stalled decisions, conflict avoided or badly handled, unclear roles.',
            ],
            'what' => [
                'pt' => 'Avaliação da Inteligência Emocional da equipa e das suas normas de funcionamento, seguida de sessões facilitadas sobre confiança, responsabilização e gestão de tensão.',
                'en' => 'An assessment of the team’s Emotional Intelligence and working norms, followed by facilitated sessions on trust, accountability and handling tension.',
            ],
            'diff' => [
                'pt' => ['Trabalhamos as normas do grupo, não só os indivíduos', 'Sessões com casos reais da agenda da equipa', 'Sem dinâmicas artificiais nem «team building» genérico', 'Acordos de equipa escritos e revistos'],
                'en' => ['We work on group norms, not just individuals', 'Sessions built on real items from the team’s agenda', 'No artificial games or generic “team building”', 'Written team agreements, reviewed over time'],
            ],
            'measure' => [
                'pt' => ['Confiança e segurança psicológica', 'Velocidade e qualidade das decisões', 'Clareza de papéis'],
                'en' => ['Trust and psychological safety', 'Speed and quality of decisions', 'Role clarity'],
            ],
            'cta' => ['pt' => 'Acelerar a sua equipa', 'en' => 'Accelerate your team'],
        ],
        [
            'id'   => 'diagnosis',
            'icon' => 'target',
            'name' => ['pt' => 'Diagnóstico organizacional de Inteligência Emocional', 'en' => 'Organisational Emotional Intelligence assessment'],
            'one'  => ['pt' => 'Um mapa das competências emocionais da sua liderança, em escala.', 'en' => 'A map of your leadership’s emotional competencies, at scale.'],
            'when' => [
                'pt' => 'Quando precisa de dados antes de investir em formação, quer perceber a origem de problemas de clima ou turnover, ou prepara um plano de sucessão.',
                'en' => 'When you need data before investing in training, want to understand the root of climate or turnover issues, or are preparing a succession plan.',
            ],
            'what' => [
                'pt' => 'Aplicação de ESCI 360, EQ-i 2.0 ou MSCEIT a grupos de líderes, com devolução individual e um relatório agregado para a administração ou direção de RH.',
                'en' => 'ESCI 360, EQ-i 2.0 or MSCEIT administered to groups of leaders, with individual debriefs and an aggregated report for the board or HR.',
            ],
            'diff' => [
                'pt' => ['Os três instrumentos de referência, aplicados por um formador certificado nos três', 'Devoluções individuais confidenciais', 'Relatório agregado com prioridades de desenvolvimento', 'Linha de base para medir o impacto de futuras intervenções'],
                'en' => ['All three reference instruments, run by a trainer certified in all three', 'Confidential individual debriefs', 'Aggregated report with development priorities', 'A baseline to measure the impact of future interventions'],
            ],
            'measure' => [
                'pt' => ['Perfil de competências por nível hierárquico', 'Lacunas críticas para a estratégia', 'Comparação antes / depois'],
                'en' => ['Competency profile by level', 'Gaps critical to strategy', 'Before / after comparison'],
            ],
            'cta' => ['pt' => 'Pedir um diagnóstico', 'en' => 'Request an assessment'],
        ],
        [
            'id'   => 'programmes',
            'icon' => 'spark',
            'name' => ['pt' => 'Programas de liderança à medida', 'en' => 'Tailored leadership programmes'],
            'one'  => ['pt' => 'Desenhados a partir da sua estratégia e cultura — e transferíveis para a sua equipa interna.', 'en' => 'Designed around your strategy and culture — and transferable to your in-house team.'],
            'when' => [
                'pt' => 'Quando a formação «chave na mão» não está a mudar comportamentos e precisa de um programa que reflita os desafios reais da sua organização.',
                'en' => 'When off-the-shelf training isn’t changing behaviour and you need a programme that reflects your organisation’s real challenges.',
            ],
            'what' => [
                'pt' => 'Identificamos os comportamentos que distinguem os seus melhores líderes e construímos um programa à volta deles. Opcionalmente, certificamos facilitadores internos.',
                'en' => 'We identify the behaviours that set your best leaders apart and build a programme around them. Optionally, we certify in-house facilitators.',
            ],
            'diff' => [
                'pt' => ['Ponto de partida: os seus líderes de referência, não um manual genérico', 'Exercícios construídos com casos da organização', 'Formação de formadores internos para escalar', 'Indicadores de impacto definidos à partida'],
                'en' => ['Starting point: your own role-model leaders, not a generic manual', 'Exercises built from the organisation’s own cases', 'Train-the-trainer to scale internally', 'Impact indicators defined up front'],
            ],
            'measure' => [
                'pt' => ['Transferência para o posto de trabalho', 'Indicadores de engagement e retenção', 'Autonomia da equipa interna'],
                'en' => ['On-the-job transfer', 'Engagement and retention indicators', 'In-house team autonomy'],
            ],
            'cta' => ['pt' => 'Desenhar o seu programa', 'en' => 'Design your programme'],
        ],
    ],
    'keynotes' => [
        'topics' => [
            ['icon' => 'heart',   'name' => ['pt' => 'Inteligência Emocional na liderança', 'en' => 'Emotional Intelligence in leadership'], 'desc' => ['pt' => 'Porque é que a competência que falta à maioria dos líderes não é técnica.', 'en' => 'Why the skill most leaders lack isn’t technical.']],
            ['icon' => 'shield',  'name' => ['pt' => 'Stress, burnout e resiliência', 'en' => 'Stress, burnout and resilience'], 'desc' => ['pt' => 'Regulação emocional como competência treinável em contextos de pressão.', 'en' => 'Emotional regulation as a trainable skill under pressure.']],
            ['icon' => 'clock',   'name' => ['pt' => 'Vencer a procrastinação', 'en' => 'Beating procrastination'], 'desc' => ['pt' => 'Baseada no livro de Paulo Moreira: o lado emocional da produtividade.', 'en' => 'Based on Paulo Moreira’s book: the emotional side of productivity.']],
            ['icon' => 'compass', 'name' => ['pt' => 'Cérebro racional e cérebro emocional', 'en' => 'The rational and the emotional brain'], 'desc' => ['pt' => 'Como as emoções decidem por nós — e como decidir melhor.', 'en' => 'How emotions decide for us — and how to decide better.']],
            ['icon' => 'users',   'name' => ['pt' => 'Conflito, comunicação e confiança', 'en' => 'Conflict, communication and trust'], 'desc' => ['pt' => 'Transformar tensão em colaboração nas equipas.', 'en' => 'Turning tension into collaboration in teams.']],
            ['icon' => 'spark',   'name' => ['pt' => 'Tema à medida', 'en' => 'Custom topic'], 'desc' => ['pt' => 'Adaptado ao tema do seu evento, convenção ou kickoff.', 'en' => 'Tailored to your event, convention or kickoff theme.']],
        ],
        'formats' => [
            'pt' => ['Keynote de abertura ou encerramento (45–90 min)', 'Palestra interativa com exercícios (1h30–2h)', 'Palestra + workshop no mesmo dia', 'Presencial em todo o país ou online, em português ou inglês'],
            'en' => ['Opening or closing keynote (45–90 min)', 'Interactive talk with exercises (1.5–2h)', 'Keynote + workshop on the same day', 'On-site anywhere in Portugal or online, in Portuguese or English'],
        ],
    ],
    'process' => [
        ['name' => ['pt' => 'Escutar', 'en' => 'Listen'], 'desc' => ['pt' => 'Reunião inicial para perceber a estratégia, o contexto e o problema real — que nem sempre é o que foi pedido.', 'en' => 'A first meeting to understand strategy, context and the real problem — which isn’t always the one we were asked about.']],
        ['name' => ['pt' => 'Diagnosticar', 'en' => 'Assess'], 'desc' => ['pt' => 'Instrumentos validados, entrevistas e dados existentes para criar uma linha de base.', 'en' => 'Validated instruments, interviews and existing data to set a baseline.']],
        ['name' => ['pt' => 'Desenhar', 'en' => 'Design'], 'desc' => ['pt' => 'Uma intervenção à medida, com objetivos comportamentais e indicadores acordados.', 'en' => 'A tailored intervention with agreed behavioural goals and indicators.']],
        ['name' => ['pt' => 'Intervir', 'en' => 'Deliver'], 'desc' => ['pt' => 'Coaching, sessões de equipa ou programas — práticos e aplicados ao dia a dia.', 'en' => 'Coaching, team sessions or programmes — practical and applied to daily work.']],
        ['name' => ['pt' => 'Medir', 'en' => 'Measure'], 'desc' => ['pt' => 'Reavaliação e relatório de impacto para a administração.', 'en' => 'Re-assessment and an impact report for leadership.']],
    ],
];
