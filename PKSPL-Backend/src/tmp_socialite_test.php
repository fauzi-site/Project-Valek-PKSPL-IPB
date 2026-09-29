<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Http\Kernel::class);
Illuminate\Support\Facades\Facade::setFacadeApplication($app);
try {
    $driver = Laravel\Socialite\Facades\Socialite::driver('google');
    echo 'driver=' . get_class($driver) . PHP_EOL;
    echo 'stateless=' . (method_exists($driver, 'stateless') ? 'yes' : 'no') . PHP_EOL;
} catch (Throwable $e) {
    echo get_class($e) . ': ' . $e->getMessage() . PHP_EOL;
}
