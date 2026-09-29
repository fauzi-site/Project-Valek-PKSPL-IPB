<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MasterWilayahControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_master_wilayah_routes_are_available(): void
    {
        $this->getJson('/api/v1/provinsi')
            ->assertOk()
            ->assertJsonStructure(['data']);

        $this->getJson('/api/v1/kabupaten-kota')
            ->assertOk()
            ->assertJsonStructure(['data']);

        $this->getJson('/api/v1/kecamatan')
            ->assertOk()
            ->assertJsonStructure(['data']);
    }
}
