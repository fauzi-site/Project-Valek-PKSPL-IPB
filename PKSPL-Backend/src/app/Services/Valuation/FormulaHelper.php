<?php

namespace App\Services\Valuation;

use Illuminate\Support\Collection;

class FormulaHelper
{
    public static function normalizeNumber(mixed $value): string
    {
        if ($value === null || $value === '') {
            return '0';
        }

        if (is_int($value) || is_float($value) || is_numeric($value)) {
            return (string) $value;
        }

        if (is_string($value)) {
            $trimmed = trim($value);

            return $trimmed !== '' && is_numeric($trimmed) ? $trimmed : '0';
        }

        return '0';
    }

    public static function safeMultiply(mixed ...$values): string
    {
        $result = '1';

        foreach ($values as $value) {
            $result = self::multiply($result, self::normalizeNumber($value));
        }

        return $result;
    }

    public static function add(string $left, string $right): string
    {
        if (extension_loaded('bcmath')) {
            return self::trimTrailingZeros(bcadd($left, $right, 20));
        }

        return self::trimTrailingZeros(self::manualAdd($left, $right));
    }

    public static function multiply(string $left, string $right): string
    {
        if (extension_loaded('bcmath')) {
            return self::trimTrailingZeros(bcmul($left, $right, 20));
        }

        return self::trimTrailingZeros(self::manualMultiply($left, $right));
    }

    public static function sumCollection(Collection $values): string
    {
        return $values->reduce(function (string $carry, mixed $value): string {
            return self::add($carry, self::normalizeNumber($value));
        }, '0');
    }

    private static function manualAdd(string $left, string $right): string
    {
        [$leftInt, $leftDec] = self::splitDecimal($left);
        [$rightInt, $rightDec] = self::splitDecimal($right);
        $scale = max(strlen($leftDec), strlen($rightDec));
        $leftNormalized = self::normalizeScale($leftInt, $leftDec, $scale);
        $rightNormalized = self::normalizeScale($rightInt, $rightDec, $scale);
        $sum = self::addIntegers($leftNormalized, $rightNormalized);

        return self::formatDecimal($sum, $scale);
    }

    private static function manualMultiply(string $left, string $right): string
    {
        $leftDigits = str_replace(['.', '-'], '', $left);
        $rightDigits = str_replace(['.', '-'], '', $right);
        $negative = (str_contains($left, '-') xor str_contains($right, '-'));

        [$leftInt, $leftDec] = self::splitDecimal($left);
        [$rightInt, $rightDec] = self::splitDecimal($right);
        $scale = strlen($leftDec) + strlen($rightDec);
        $product = self::multiplyIntegers($leftDigits, $rightDigits);

        return self::formatDecimal($negative ? '-'.$product : $product, $scale);
    }

    private static function splitDecimal(string $value): array
    {
        $isNegative = str_starts_with($value, '-');
        $normalized = $isNegative ? substr($value, 1) : $value;
        $parts = explode('.', $normalized, 2);
        $int = $parts[0] !== '' ? $parts[0] : '0';
        $dec = $parts[1] ?? '';

        return [$isNegative ? '-'.$int : $int, $dec];
    }

    private static function normalizeScale(string $int, string $dec, int $scale): string
    {
        $padding = str_repeat('0', $scale - strlen($dec));

        return $int.$dec.$padding;
    }

    private static function addIntegers(string $left, string $right): string
    {
        $left = ltrim($left, '0');
        $right = ltrim($right, '0');
        $left = $left === '' ? '0' : $left;
        $right = $right === '' ? '0' : $right;
        $length = max(strlen($left), strlen($right));
        $left = str_pad($left, $length, '0', STR_PAD_LEFT);
        $right = str_pad($right, $length, '0', STR_PAD_LEFT);
        $carry = 0;
        $result = '';

        for ($i = $length - 1; $i >= 0; $i--) {
            $sum = (int) $left[$i] + (int) $right[$i] + $carry;
            $result = ($sum % 10).$result;
            $carry = intdiv($sum, 10);
        }

        if ($carry > 0) {
            $result = $carry.$result;
        }

        return ltrim($result, '0') === '' ? '0' : ltrim($result, '0');
    }

    private static function multiplyIntegers(string $left, string $right): string
    {
        $left = ltrim($left, '0');
        $right = ltrim($right, '0');
        $left = $left === '' ? '0' : $left;
        $right = $right === '' ? '0' : $right;
        $result = '0';

        for ($i = strlen($right) - 1; $i >= 0; $i--) {
            $digit = (int) $right[$i];
            $partial = self::multiplySingleDigit($left, $digit);
            $shift = strlen($right) - 1 - $i;
            $partial = str_pad($partial, strlen($partial) + $shift, '0');
            $result = self::addIntegers($result, $partial);
        }

        return $result;
    }

    private static function multiplySingleDigit(string $left, int $digit): string
    {
        $carry = 0;
        $result = '';

        for ($i = strlen($left) - 1; $i >= 0; $i--) {
            $product = ((int) $left[$i]) * $digit + $carry;
            $result = ($product % 10).$result;
            $carry = intdiv($product, 10);
        }

        if ($carry > 0) {
            $result = $carry.$result;
        }

        return $result;
    }

    private static function formatDecimal(string $value, int $scale): string
    {
        if ($scale === 0) {
            return $value;
        }

        $value = ltrim($value, '0');
        $value = $value === '' ? '0' : $value;
        $length = strlen($value);

        if ($length <= $scale) {
            return '0.'.str_repeat('0', $scale - $length).$value;
        }

        return substr($value, 0, $length - $scale).'.'.substr($value, $length - $scale);
    }

    private static function trimTrailingZeros(string $value): string
    {
        if (!str_contains($value, '.')) {
            return $value;
        }

        $value = rtrim($value, '0');

        if (str_ends_with($value, '.')) {
            return substr($value, 0, -1);
        }

        return $value;
    }
}
