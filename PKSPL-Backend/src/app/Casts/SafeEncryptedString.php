<?php

declare(strict_types=1);

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;
use Throwable;

class SafeEncryptedString implements CastsAttributes
{
    /**
     * Cast the given value from database storage.
     *
     * If the value is a valid encrypted payload, it will be decrypted.
     * If the value is legacy plaintext (from before encryption was applied)
     * or if decryption fails, it safely falls back to returning the raw string
     * to ensure 100% zero-downtime backward compatibility.
     *
     * @param  Model  $model
     * @param  string  $key
     * @param  mixed  $value
     * @param  array<string, mixed>  $attributes
     * @return string|null
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null || $value === '') {
            return $value;
        }

        try {
            return Crypt::decryptString((string) $value);
        } catch (DecryptException) {
            // Gracefully return legacy plaintext without throwing an exception
            return (string) $value;
        } catch (Throwable) {
            return (string) $value;
        }
    }

    /**
     * Prepare the given value for storage in the database.
     *
     * Always encrypts the string using Laravel's Crypt service (AES-256-CBC with HMAC).
     *
     * @param  Model  $model
     * @param  string  $key
     * @param  mixed  $value
     * @param  array<string, mixed>  $attributes
     * @return string|null
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null || $value === '') {
            return $value;
        }

        return Crypt::encryptString((string) $value);
    }
}
