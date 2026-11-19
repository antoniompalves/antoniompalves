<?php
// Exemplo de configuração. O instalador (install.php) cria o config.php automaticamente.
return [
    'db' => ['driver' => 'mysql', 'host' => 'localhost', 'port' => '3306', 'name' => 'cpuser_detailpro', 'user' => 'cpuser_dp', 'pass' => '********'],
    // Para SQLite: 'db' => ['driver' => 'sqlite', 'file' => __DIR__ . '/data/app.sqlite'],
    'prefix' => 'dp_',            // várias empresas na mesma BD: cli1_, cli2_ ...
    'secret' => 'gerado-pelo-instalador',
    'app_name' => 'DetailPro',    // white-label: nome da aplicação
    'brand_color' => '#ef4444',   // cor por defeito (pode ser alterada em Definições)
    'debug' => false,
    'timezone' => 'Europe/Lisbon',
];
