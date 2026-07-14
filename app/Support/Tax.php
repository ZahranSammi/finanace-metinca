<?php

namespace App\Support;

/**
 * Single source of truth for the local VAT rate, previously hard-coded as the
 * literals 1.11 / 0.11 / 11 in several controllers.
 */
final class Tax
{
    public const PERCENT = 11;

    public const RATE = 0.11;

    /**
     * VAT amount for a given subtotal, rounded to 2 decimals.
     */
    public static function on(float|int $subtotal): float
    {
        return round($subtotal * self::RATE, 2);
    }
}
