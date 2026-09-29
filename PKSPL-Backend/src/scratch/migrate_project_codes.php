<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Proyek;

$proyeks = Proyek::all();
foreach ($proyeks as $p) {
    if (empty($p->kode_proyek) || str_starts_with($p->kode_proyek, 'PROJ-')) {
        $old = $p->kode_proyek;
        $new = 'PRJ-' . str_pad((string) $p->id_proyek, 3, '0', STR_PAD_LEFT);
        $p->kode_proyek = $new;
        $p->save();
        echo "Updated ID {$p->id_proyek} ('{$p->nama_proyek}') from '{$old}' to '{$new}'\n";
    }
}

echo "Migration finished.\n";
