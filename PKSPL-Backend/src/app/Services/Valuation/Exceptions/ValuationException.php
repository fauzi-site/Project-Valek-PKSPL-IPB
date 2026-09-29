<?php

namespace App\Services\Valuation\Exceptions;

use RuntimeException;

/**
 * Thrown for invalid economic-valuation input (negative price, inconsistent
 * variables, etc.) or a mathematically undefined/theoretically contradictory
 * regression result (e.g. dividing by a zero coefficient).
 */
class ValuationException extends RuntimeException {}
