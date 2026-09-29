<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$result = \App\Support\BoundaryGeometryStore::get(1, '51');
echo $result === null ? "NULL\n" : "NOT NULL\n";
