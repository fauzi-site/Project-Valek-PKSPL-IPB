<?php

declare(strict_types=1);

namespace Tests\Unit\Review;

use App\Services\Review\AttachmentService;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class AttachmentServiceTest extends TestCase
{
    protected AttachmentService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(AttachmentService::class);
    }

    public function test_valid_file_passes_validation(): void
    {
        $file = UploadedFile::fake()->create('document.pdf', 1000, 'application/pdf');
        $this->service->validateFile($file);
        $this->assertTrue(true); // Should not throw exception
    }

    public function test_file_too_large_fails_validation(): void
    {
        $this->expectException(ValidationException::class);
        $file = UploadedFile::fake()->create('large.pdf', 25000, 'application/pdf');
        $this->service->validateFile($file);
    }

    public function test_invalid_extension_fails_validation(): void
    {
        $this->expectException(ValidationException::class);
        $file = UploadedFile::fake()->create('script.exe', 1000, 'application/x-msdownload');
        $this->service->validateFile($file);
    }

    public function test_valid_extensions_pass(): void
    {
        $extensionMimes = [
            'pdf' => 'application/pdf',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'csv' => 'text/csv',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'zip' => 'application/zip',
        ];
        foreach ($extensionMimes as $ext => $mime) {
            $file = UploadedFile::fake()->create("file.{$ext}", 100, $mime);
            $this->service->validateFile($file);
        }
        $this->assertTrue(true);
    }
}
