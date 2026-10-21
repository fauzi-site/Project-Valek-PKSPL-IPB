<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;

    protected function setUp(): void
    {
        parent::setUp();

        // Safety Guard: Prevent test suite RefreshDatabase from ever touching active database 'pkspl'
        if (config('database.connections.pgsql.database') === 'pkspl' && config('database.default') === 'pgsql') {
            config(['database.default' => 'sqlite']);
            config(['database.connections.sqlite.database' => ':memory:']);
        }
    }
}
