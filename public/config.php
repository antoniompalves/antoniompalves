<?php
/**
 * EQTraining.pt — site configuration.
 * Edit these values before going live.
 */
return [
    'site_name'      => 'EQ Training',
    'site_url'       => 'https://eqtraining.pt', // canonical domain used in canonical/hreflang/sitemap/social tags
    'base_url'       => '',                       // '' if site is at domain root; e.g. '/beta' if in a subfolder
    'default_lang'   => 'pt',
    'langs'          => ['pt', 'en'],

    // Contact details
    'email_to'       => 'geral@eqtraining.pt',    // where contact/lead forms are delivered
    'email_from'     => 'no-reply@eqtraining.pt', // must be a mailbox on the cPanel domain
    'phone'          => '+351 964 188 017',
    'phone_raw'      => '+351964188017',
    'whatsapp'       => '351964188017',

    // Paulo Moreira's social profiles (taken from treinointeligenciaemocional.com).
    // [icon, label, url]. Remove a line to hide it; order = display order.
    'social' => [
        ['linkedin',  'LinkedIn',       'https://www.linkedin.com/in/paulo-moreira-45b5371b/'],
        ['instagram', 'Instagram',      'https://www.instagram.com/paulo.jmoreira/'],
        ['facebook',  'Facebook',       'https://www.facebook.com/paulomoreirainteligenciaemocional'],
        ['youtube',   'YouTube',        'https://www.youtube.com/channel/UC0d9nCbO3Gw3JQuNvcRmetA'],
        ['spotify',   'Spotify',        'https://open.spotify.com/show/4uYnKPBldfjO5wrCbm88nL'],
        ['podcast',   'Apple Podcasts', 'https://podcasts.apple.com/pt/podcast/intelig%C3%AAncia-emocional-o-podcast/id1552673577'],
    ],

    // Sister brand for individuals (B2C)
    'b2c_name'       => 'Treino Inteligência Emocional',
    'b2c_url'        => 'https://treinointeligenciaemocional.com/',
    'b2c_agenda_url' => 'https://treinointeligenciaemocional.com/agenda-2/', // update when the new B2C site goes live

    // Sister brand for children, families and schools
    'kids_name'      => 'Emoty Games',
    'kids_url'       => 'https://emotygames.com',

    // Damiana — business manager / chat widget
    'agent_name'     => 'Damiana',
    'agent_fullname' => 'Damiana Fernandes',
    'agent_video'    => 'assets/video/damiana.mp4',   // upload your video here (mp4, H.264, ~10–20s, < 8MB)
    'agent_poster'   => 'assets/img/damiana-poster.jpg', // still frame shown before the video loads
    'booking_url'    => '',  // e.g. Calendly / Microsoft Bookings link. Empty = opens the contact form.
];
