<?php

namespace App\Services\AI;

use JsonSerializable;

final class AIResponseData implements JsonSerializable
{
    public function __construct(
        public bool $success,
        public string $provider,
        public string $model,
        public string $summary = '',
        public string $answer = '',
        public array $references = [],
        public string $limitations = '',
        public ?int $confidence = null,
        public ?string $message = null,
    ) {
    }

    public static function success(
        string $provider,
        string $model,
        string $summary,
        string $answer,
        array $references = [],
        string $limitations = '',
        ?int $confidence = null,
    ): self {
        return new self(
            true,
            $provider,
            $model,
            trim($summary),
            trim($answer),
            array_values($references),
            trim($limitations),
            $confidence,
            null,
        );
    }

    public static function error(string $provider, string $model, string $message): self
    {
        return new self(false, $provider, $model, '', '', [], '', null, $message);
    }

    public function withConfidence(int $confidence): self
    {
        $clone = clone $this;
        $clone->confidence = $confidence;

        return $clone;
    }

    public function toArray(): array
    {
        $response = [
            'success' => $this->success,
            'provider' => $this->provider,
            'model' => $this->model,
            'confidence' => $this->confidence ?? 0,
            'summary' => $this->summary,
            'answer' => $this->answer,
            'references' => $this->references,
            'limitations' => $this->limitations,
        ];

        if ($this->message !== null) {
            $response['message'] = $this->message;
        }

        return $response;
    }

    public function jsonSerialize(): array
    {
        return $this->toArray();
    }
}
