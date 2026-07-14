<?php

namespace App\Support;

use App\Models\Order;
use Illuminate\Support\Facades\DB;

/**
 * Monthly validated-sales trend, driver-aware for PostgreSQL (production) and
 * SQLite (testing). Extracted from SalesPortalController and ManagerController,
 * which previously duplicated this branching logic verbatim.
 */
final class SalesTrend
{
    /** @var array<string, string> */
    private const MONTHS = [
        '01' => 'Jan', '02' => 'Feb', '03' => 'Mar', '04' => 'Apr',
        '05' => 'May', '06' => 'Jun', '07' => 'Jul', '08' => 'Aug',
        '09' => 'Sep', '10' => 'Oct', '11' => 'Nov', '12' => 'Dec',
    ];

    /**
     * @param  int|null  $userId  Restrict the trend to a single rep (used for the sales dashboard).
     * @return array<int, array{month: string, sales: float}>
     */
    public static function monthlyValidated(?int $userId = null): array
    {
        $isPostgres = DB::connection()->getDriverName() === 'pgsql';

        $query = $isPostgres
            ? Order::select(
                DB::raw("TO_CHAR(date_raised, 'Mon') as month"),
                DB::raw('EXTRACT(MONTH FROM date_raised) as month_num'),
                DB::raw('SUM(total_amount) as sales'),
            )->groupBy(DB::raw("TO_CHAR(date_raised, 'Mon'), EXTRACT(MONTH FROM date_raised)"))
            : Order::select(
                DB::raw("strftime('%m', date_raised) as month_num"),
                DB::raw('SUM(total_amount) as sales'),
            )->groupBy('month_num');

        $query->where('status', OrderStatus::VALIDATED)->orderBy('month_num');

        if ($userId !== null) {
            $query->where('user_id', $userId);
        }

        return $query->get()->map(fn ($item) => [
            'month' => $isPostgres
                ? $item->month
                : (self::MONTHS[sprintf('%02d', $item->month_num)] ?? (string) $item->month_num),
            'sales' => (float) $item->sales,
        ])->all();
    }

    /**
     * Placeholder series so charts still render before any sales exist.
     *
     * @return array<int, array{month: string, sales: int}>
     */
    public static function emptySeries(): array
    {
        return [
            ['month' => 'Jan', 'sales' => 0],
            ['month' => 'Feb', 'sales' => 0],
            ['month' => 'Mar', 'sales' => 0],
            ['month' => 'Apr', 'sales' => 0],
            ['month' => 'May', 'sales' => 0],
            ['month' => 'Jun', 'sales' => 0],
        ];
    }
}
