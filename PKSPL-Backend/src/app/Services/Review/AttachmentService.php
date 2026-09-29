<?php declare(strict_types=1);

namespace App\Services\Review;

use App\Models\CommentAttachment;
use Illuminate\Contracts\Filesystem\Factory as FilesystemFactory;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Validator;

class AttachmentService
{
    private const ALLOWED_MIMES = 'pdf,doc,docx,xlsx,csv,png,jpg,jpeg,zip,geojson,gpkg,shp';
    private const MAX_SIZE_KB = 20480; // 20MB

    public function __construct(
        private FilesystemFactory $filesystem
    ) {}

    public function store(UploadedFile $file, int $commentId): CommentAttachment
    {
        $this->validateFile($file);

        $extension = $file->getClientOriginalExtension();
        $path = 'review-attachments/' . date('Y/m') . '/' . Str::uuid() . '.' . $extension;
        
        $this->filesystem->disk('local')->putFileAs('', $file, $path);

        return CommentAttachment::create([
            'id_comment' => $commentId,
            'original_name' => $file->getClientOriginalName(),
            'stored_path' => $path,
            'mime_type' => $file->getClientMimeType(),
            'size_bytes' => $file->getSize(),
        ]);
    }

    public function destroy(CommentAttachment $attachment): void
    {
        if ($this->filesystem->disk('local')->exists($attachment->stored_path)) {
            $this->filesystem->disk('local')->delete($attachment->stored_path);
        }

        $attachment->delete();
    }

    public function validateFile(UploadedFile $file): void
    {
        $validator = Validator::make(
            ['file' => $file],
            ['file' => 'required|file|mimes:' . self::ALLOWED_MIMES . '|max:' . self::MAX_SIZE_KB]
        );

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }
    }
}
