<?php

namespace App\Support;

/**
 * Canonical order workflow statuses.
 *
 * Kept as string constants (not a backed enum with model casting) so that
 * persisted values and existing comparisons remain plain strings, while the
 * magic strings scattered across controllers get a single source of truth.
 */
final class OrderStatus
{
    public const PENDING = 'Pending';

    public const SUBMITTED = 'Submitted';

    public const VALIDATED = 'Validated';

    public const REJECTED = 'Rejected';

    /**
     * Statuses a sales rep is still allowed to mutate (edit / delete / submit).
     *
     * @var list<string>
     */
    public const EDITABLE = [self::PENDING, self::REJECTED];
}
