<?php

// Kelas sumber kutipan untuk perintah Artisan bawaan.
use Illuminate\Foundation\Inspiring;

// Fasad Artisan untuk mendefinisikan perintah konsol aplikasi.
use Illuminate\Support\Facades\Artisan;

// ============================================================
// BAB 9. PERINTAH KONSOL
// Menyediakan perintah CLI bawaan aplikasi.
// ============================================================

// ------------------------------------------------------------
// 9.1 KUTIPAN INSPIRATIF
// ------------------------------------------------------------
// 9.1.1 Menulis satu kutipan inspiratif ke output terminal.
Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
