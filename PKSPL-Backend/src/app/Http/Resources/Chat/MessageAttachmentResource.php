<?php

declare(strict_types=1);

namespace App\Http\Resources\Chat;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MessageAttachmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Format human readable file size
        $bytes = (int) $this->file_size;
        if ($bytes >= 1048576) {
            $formattedSize = number_format($bytes / 1048576, 1) . ' MB';
        } elseif ($bytes >= 1024) {
            $formattedSize = number_format($bytes / 1024, 0) . ' KB';
        } else {
            $formattedSize = $bytes . ' B';
        }

        $convId = $request->route('conversation')?->id_conversation ?? $this->message?->id_conversation;
        $downloadUrl = ($convId && $this->id_message && $this->id_attachment)
            ? url("/api/v1/conversations/{$convId}/messages/{$this->id_message}/attachments/{$this->id_attachment}/download")
            : null;

        return [
            'id' => (string) $this->id_attachment,
            'id_attachment' => $this->id_attachment,
            'fileName' => $this->file_name,
            'file_name' => $this->file_name,
            'fileSize' => $formattedSize,
            'file_size' => $this->file_size,
            'fileType' => $this->file_type,
            'file_type' => $this->file_type,
            'mimeType' => $this->mime_type,
            'mime_type' => $this->mime_type,
            'url' => $this->url,
            'downloadUrl' => $downloadUrl,
            'download_url' => $downloadUrl,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}