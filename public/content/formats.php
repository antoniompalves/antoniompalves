<?php
/** Delivery formats (shared across programmes). depth = 1..4 */
return [
    [
        'name'     => ['pt' => 'Palestra Executiva', 'en' => 'Executive Keynote'],
        'duration' => ['pt' => '1h30 – 2h', 'en' => '1.5 – 2 hours'],
        'ideal'    => ['pt' => 'Kickoffs, convenções e eventos internos', 'en' => 'Kickoffs, conventions and internal events'],
        'desc'     => ['pt' => 'Impacto rápido e inspirador.', 'en' => 'Fast, inspiring impact.'],
        'depth'    => 1,
    ],
    [
        'name'     => ['pt' => 'Workshop Intensivo', 'en' => 'Intensive Workshop'],
        'duration' => ['pt' => '4h – 8h', 'en' => '4 – 8 hours'],
        'ideal'    => ['pt' => 'Equipas que precisam de ferramentas já', 'en' => 'Teams that need tools now'],
        'desc'     => ['pt' => 'Formato prático com simulações, exercícios e ferramentas aplicáveis. O mais popular.', 'en' => 'Hands-on format with simulations, exercises and practical tools. The most popular.'],
        'depth'    => 2,
        'popular'  => true,
    ],
    [
        'name'     => ['pt' => 'Programa Avançado', 'en' => 'Advanced Programme'],
        'duration' => ['pt' => '2 – 5 dias', 'en' => '2 – 5 days'],
        'ideal'    => ['pt' => 'Equipas de liderança e direções', 'en' => 'Leadership teams and boards'],
        'desc'     => ['pt' => 'Transformação profunda com diagnóstico, treino intensivo e follow-up.', 'en' => 'Deep transformation with assessment, intensive training and follow-up.'],
        'depth'    => 3,
    ],
    [
        'name'     => ['pt' => 'Programa Contínuo', 'en' => 'Ongoing Programme'],
        'duration' => ['pt' => '3 – 6 meses', 'en' => '3 – 6 months'],
        'ideal'    => ['pt' => 'Mudança cultural sustentada', 'en' => 'Sustained culture change'],
        'desc'     => ['pt' => 'Acompanhamento prolongado com sessões periódicas, micro-desafios e medição de impacto.', 'en' => 'Long-term support with regular sessions, micro-challenges and impact measurement.'],
        'depth'    => 4,
    ],
];
