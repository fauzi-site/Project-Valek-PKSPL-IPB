<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;

    protected function setUp(): void
    {
        parent::setUp();

        // Reinforce test isolation in config
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
    }
}
