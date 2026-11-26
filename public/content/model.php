<?php
/** Goleman & Boyatzis Emotional & Social Competency model (ESCI): 4 domains, 12 competencies. */
return [
    'domains' => [
        [
            'axis'  => ['pt' => 'Eu · Reconhecer', 'en' => 'Self · Recognise'],
            'name'  => ['pt' => 'Autoconsciência', 'en' => 'Self-Awareness'],
            'desc'  => ['pt' => 'Perceber as próprias emoções e o seu impacto.', 'en' => 'Understanding your own emotions and their impact.'],
            'comps' => ['pt' => ['Autoconsciência emocional'], 'en' => ['Emotional self-awareness']],
        ],
        [
            'axis'  => ['pt' => 'Eu · Gerir', 'en' => 'Self · Manage'],
            'name'  => ['pt' => 'Autogestão', 'en' => 'Self-Management'],
            'desc'  => ['pt' => 'Regular emoções e manter o foco sob pressão.', 'en' => 'Regulating emotions and staying focused under pressure.'],
            'comps' => [
                'pt' => ['Autocontrolo emocional', 'Adaptabilidade', 'Orientação para resultados', 'Atitude positiva'],
                'en' => ['Emotional self-control', 'Adaptability', 'Achievement orientation', 'Positive outlook'],
            ],
        ],
        [
            'axis'  => ['pt' => 'Outros · Reconhecer', 'en' => 'Others · Recognise'],
            'name'  => ['pt' => 'Consciência social', 'en' => 'Social Awareness'],
            'desc'  => ['pt' => 'Ler as emoções dos outros e as dinâmicas da organização.', 'en' => 'Reading others’ emotions and the organisation’s dynamics.'],
            'comps' => ['pt' => ['Empatia', 'Consciência organizacional'], 'en' => ['Empathy', 'Organisational awareness']],
        ],
        [
            'axis'  => ['pt' => 'Outros · Gerir', 'en' => 'Others · Manage'],
            'name'  => ['pt' => 'Gestão de relacionamentos', 'en' => 'Relationship Management'],
            'desc'  => ['pt' => 'Influenciar, desenvolver e mobilizar pessoas.', 'en' => 'Influencing, developing and mobilising people.'],
            'comps' => [
                'pt' => ['Influência', 'Coaching e mentoria', 'Gestão de conflitos', 'Trabalho em equipa', 'Liderança inspiradora'],
                'en' => ['Influence', 'Coach and mentor', 'Conflict management', 'Teamwork', 'Inspirational leadership'],
            ],
        ],
    ],
];
