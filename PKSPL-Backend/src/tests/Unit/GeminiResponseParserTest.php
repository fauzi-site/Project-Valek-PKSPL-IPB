<?php

namespace Tests\Unit;

use App\Services\AI\AIResponseData;
use App\Services\AI\GeminiResponseParser;
use PHPUnit\Framework\TestCase;

class GeminiResponseParserTest extends TestCase
{
    private GeminiResponseParser $parser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->parser = new GeminiResponseParser();
    }

    public function test_parse_json_object_returns_fields(): void
    {
        $rawContent = json_encode([
            'summary' => 'Ringkasan',
            'answer' => 'Isi lengkap',
            'limitations' => 'Tidak ada',
            'references' => [[
                'title' => 'Judul',
                'url' => 'https://example.com',
                'type' => 'website',
                'publisher' => 'Contoh',
                'year' => 2024,
            ]],
        ]);

        $raw = AIResponseData::success('gemini', 'gemini-3.5-flash', '', $rawContent, [], '', null);
        $parsed = $this->parser->parse($raw);

        $this->assertSame('Ringkasan', $parsed->summary);
        $this->assertSame('Isi lengkap', $parsed->answer);
        $this->assertSame('Tidak ada', $parsed->limitations);
        $this->assertCount(1, $parsed->references);
        $this->assertSame('Judul', $parsed->references[0]['title']);
        $this->assertSame('https://example.com', $parsed->references[0]['url']);
        $this->assertSame('website', $parsed->references[0]['type']);
        $this->assertSame('Contoh', $parsed->references[0]['publisher']);
        $this->assertSame(2024, $parsed->references[0]['year']);
    }

    public function test_parse_json_in_markdown_fence(): void
    {
        $rawJson = json_encode([
            'summary' => 'Ringkasan markdown',
            'answer' => 'Isi markdown',
            'references' => [],
        ]);

        $rawContent = "```json\n{$rawJson}\n```";
        $raw = AIResponseData::success('gemini', 'gemini-3.5-flash', '', $rawContent, [], '', null);
        $parsed = $this->parser->parse($raw);

        $this->assertSame('Ringkasan markdown', $parsed->summary);
        $this->assertSame('Isi markdown', $parsed->answer);
    }

    public function test_parse_nested_json_in_answer_field(): void
    {
        $rawContent = json_encode([
            'summary' => 'Ringkasan utama',
            'answer' => json_encode([
                'summary' => 'Ringkasan nested',
                'answer' => 'Jawaban nested',
                'limitations' => 'Keterbatasan nested',
            ]),
            'references' => [],
        ]);

        $raw = AIResponseData::success('gemini', 'gemini-3.5-flash', '', $rawContent, [], '', null);
        $parsed = $this->parser->parse($raw);

        $this->assertSame('Ringkasan nested', $parsed->summary);
        $this->assertSame('Jawaban nested', $parsed->answer);
        $this->assertSame('Keterbatasan nested', $parsed->limitations);
    }

    public function test_parse_escaped_json_string_returns_fields(): void
    {
        $inner = json_encode([
            'summary' => 'Ringkasan ganda',
            'answer' => 'Isi ganda',
            'references' => [],
        ]);

        $rawContent = json_encode([
            'summary' => 'Ringkasan',
            'answer' => $inner,
        ]);

        $raw = AIResponseData::success('gemini', 'gemini-3.5-flash', '', $rawContent, [], '', null);
        $parsed = $this->parser->parse($raw);

        $this->assertSame('Ringkasan ganda', $parsed->summary);
        $this->assertSame('Isi ganda', $parsed->answer);
    }

    public function test_parse_plain_text_returns_original_response(): void
    {
        $raw = AIResponseData::success('gemini', 'gemini-3.5-flash', '', 'Halo, ini jawaban biasa.', [], '', null);

        $parsed = $this->parser->parse($raw);

        $this->assertSame('Halo, ini jawaban biasa.', $parsed->answer);
        $this->assertSame('', $parsed->summary);
        $this->assertSame([], $parsed->references);
        $this->assertSame('', $parsed->limitations);
    }

    public function test_parse_invalid_json_returns_original_response(): void
    {
        $raw = AIResponseData::success('gemini', 'gemini-3.5-flash', '', '{invalid json}', [], '', null);

        $parsed = $this->parser->parse($raw);

        $this->assertSame('{invalid json}', $parsed->answer);
        $this->assertSame('', $parsed->summary);
        $this->assertSame([], $parsed->references);
    }

    public function test_parse_json_with_empty_references_returns_empty_array(): void
    {
        $rawContent = json_encode([
            'summary' => 'Ringkasan',
            'answer' => 'Isi',
            'references' => [],
        ]);

        $raw = AIResponseData::success('gemini', 'gemini-3.5-flash', '', $rawContent, [], '', null);
        $parsed = $this->parser->parse($raw);

        $this->assertSame([], $parsed->references);
    }

    public function test_parse_json_with_references_returns_normalized_references(): void
    {
        $rawContent = json_encode([
            'summary' => 'Ringkasan',
            'answer' => 'Isi',
            'references' => [[
                'title' => 'Judul',
                'url' => 'https://example.com',
            ]],
        ]);

        $raw = AIResponseData::success('gemini', 'gemini-3.5-flash', '', $rawContent, [], '', null);
        $parsed = $this->parser->parse($raw);

        $this->assertSame('Judul', $parsed->references[0]['title']);
        $this->assertSame('https://example.com', $parsed->references[0]['url']);
        $this->assertSame('website', $parsed->references[0]['type']);
        $this->assertSame('', $parsed->references[0]['publisher']);
        $this->assertNull($parsed->references[0]['year']);
    }

    public function test_parse_json_with_empty_summary_keeps_summary_empty(): void
    {
        $rawContent = json_encode([
            'summary' => '',
            'answer' => 'Isi',
            'references' => [],
        ]);

        $raw = AIResponseData::success('gemini', 'gemini-3.5-flash', '', $rawContent, [], '', null);
        $parsed = $this->parser->parse($raw);

        $this->assertSame('', $parsed->summary);
        $this->assertSame('Isi', $parsed->answer);
    }

    public function test_parse_json_with_empty_answer_keeps_answer_empty(): void
    {
        $rawContent = json_encode([
            'summary' => 'Ringkasan',
            'answer' => '',
            'references' => [],
        ]);

        $raw = AIResponseData::success('gemini', 'gemini-3.5-flash', '', $rawContent, [], '', null);
        $parsed = $this->parser->parse($raw);

        $this->assertSame('', $parsed->answer);
        $this->assertSame('Ringkasan', $parsed->summary);
    }
}
