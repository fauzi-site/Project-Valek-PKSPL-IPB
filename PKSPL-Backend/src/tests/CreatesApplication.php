<?php

namespace Tests;

use Illuminate\Contracts\Console\Kernel;

trait CreatesApplication
{
    /**
     * Creates the application.
     *
     * @return \Illuminate\Foundation\Application
     */
    public function createApplication()
    {
        $app = require __DIR__ . '/../bootstrap/app.php';

        $app->make(Kernel::class)->bootstrap();

        putenv('APP_ENV=testing');
        $_ENV['APP_ENV'] = 'testing';
        $_SERVER['APP_ENV'] = 'testing';

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
            'database.connections.pgsql.host' => '127.0.0.1',
            'database.connections.pgsql.port' => 9999,
            'database.connections.pgsql.database' => 'pkspl_blocked_for_testing',
            'database.connections.pgsql.username' => 'blocked_in_tests',
            'database.connections.pgsql.password' => 'blocked_in_tests',
            'session.driver' => 'array',
            'cache.default' => 'array',
        ]);

        return $app;
    }
}
