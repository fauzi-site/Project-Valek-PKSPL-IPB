<?php

namespace Tests\Feature\Api\V1;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class StatisticsApiTest extends TestCase
{
    use DatabaseTransactions;

    public function test_get_landing_statistics_returns_valid_aggregated_data(): void
    {
        $response = $this->getJson('/api/v1/statistics');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'total_projects',
                'total_researchers',
                'project_statuses',
                'monthly_projects',
                'ecosystem_distribution',
            ]);

        $data = $response->json();
        $this->assertIsInt($data['total_projects']);
        $this->assertIsInt($data['total_researchers']);
        $this->assertIsArray($data['monthly_projects']);
        $this->assertCount(12, $data['monthly_projects']);
    }
}
