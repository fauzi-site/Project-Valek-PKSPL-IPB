<?php

// Fasad route untuk endpoint web yang merender halaman server-side.
use Illuminate\Support\Facades\Route;

// ============================================================
// BAB 8. ANTARMUKA WEB
// Menyediakan halaman aplikasi yang dirender melalui web.
// ============================================================

// ------------------------------------------------------------
// 8.1 HALAMAN PUBLIK
// ------------------------------------------------------------
// 8.1.1 Menampilkan halaman sambutan pada rute utama aplikasi.
Route::get('/', function () {
    return view('welcome');
});
