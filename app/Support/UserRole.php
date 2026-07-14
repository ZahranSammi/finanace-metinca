<?php

namespace App\Support;

/**
 * Application roles. New users start as PENDING and must be promoted by an
 * administrator — self-registration must never grant a privileged role.
 */
final class UserRole
{
    public const PENDING = 'pending';

    public const SALES = 'staff_sales';

    public const ACCOUNTING = 'staff_accounting';

    public const MANAGER = 'manager';
}
