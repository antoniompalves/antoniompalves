<?php
/**
 * EQTraining.pt — site configuration.
 * Edit these values before going live.
 */
return [
    'site_name'      => 'EQ Training',
    'base_url'       => '',                       // '' if site is at domain root; e.g. '/beta' if in a subfolder
    'default_lang'   => 'pt',
    'langs'          => ['pt', 'en'],

    // Contact details
    'email_to'       => 'geral@eqtraining.pt',    // where contact/lead forms are delivered
    'email_from'     => 'no-reply@eqtraining.pt', // must be a mailbox on the cPanel domain
    'phone'          => '+351 964 188 017',
    'phone_raw'      => '+351964188017',
    'whatsapp'       => '351964188017',
    'address'        => 'Porto, Portugal',
    'linkedin'       => 'https://www.linkedin.com/',

    // Damiana — business manager / chat widget
    'agent_name'     => 'Damiana',
    'agent_fullname' => 'Damiana Fernandes',
    'agent_video'    => 'assets/video/damiana.mp4',   // upload your video here (mp4, H.264, ~10–20s, < 8MB)
    'agent_poster'   => 'assets/img/damiana-poster.jpg', // still frame shown before the video loads
    'booking_url'    => '',  // e.g. Calendly / Microsoft Bookings link. Empty = opens the contact form.
];
