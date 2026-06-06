<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ManagerController extends Controller
{
    public function analytics(Request $request)
    {
        $startDate = $request->input('start_date') ? Carbon::parse($request->input('start_date'))->startOfDay() : Carbon::now()->subMonths(6)->startOfDay();
        $endDate = $request->input('end_date') ? Carbon::parse($request->input('end_date'))->endOfDay() : Carbon::now()->endOfDay();

        $ordersQuery = Order::whereBetween('date_raised', [$startDate, $endDate]);

        $totalSales = (double) Order::where('status', 'Validated')->whereBetween('date_raised', [$startDate, $endDate])->sum('total_amount');
        $totalOrdersCount = Order::whereBetween('date_raised', [$startDate, $endDate])->count();
        $pendingCount = Order::where('status', 'Submitted')->count(); // counting those waiting validation
        $validatedCount = Order::where('status', 'Validated')->count();

        // Rep performance
        $repPerformance = Order::select('sales_rep', DB::raw('SUM(total_amount) as sales'), DB::raw('COUNT(*) as deals'))
            ->where('status', 'Validated')
            ->whereBetween('date_raised', [$startDate, $endDate])
            ->groupBy('sales_rep')
            ->orderBy('sales', 'desc')
            ->get()
            ->map(fn($r) => [
                'name' => $r->sales_rep,
                'sales' => (double) $r->sales,
                'deals' => (int) $r->deals,
            ]);

        // Product popularity
        $productPopularity = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->select('products.name', DB::raw('SUM(order_items.quantity) as quantity'), DB::raw('SUM(order_items.price * order_items.quantity) as revenue'))
            ->where('orders.status', 'Validated')
            ->whereBetween('orders.date_raised', [$startDate, $endDate])
            ->groupBy('products.name')
            ->orderBy('revenue', 'desc')
            ->get()
            ->map(fn($p) => [
                'name' => $p->name,
                'quantity' => (int) $p->quantity,
                'revenue' => (double) $p->revenue,
            ]);

        // Monthly trends
        // Determine DB driver to support both SQLite (testing) and PostgreSQL (production)
        $isPostgres = DB::connection()->getDriverName() === 'pgsql';
        if ($isPostgres) {
            $monthlyTrendsQuery = Order::select(
                DB::raw("TO_CHAR(date_raised, 'Mon') as month"),
                DB::raw("EXTRACT(MONTH FROM date_raised) as month_num"),
                DB::raw("SUM(total_amount) as sales")
            )
            ->where('status', 'Validated')
            ->groupBy(DB::raw("TO_CHAR(date_raised, 'Mon'), EXTRACT(MONTH FROM date_raised)"))
            ->orderBy('month_num');
        } else {
            $monthlyTrendsQuery = Order::select(
                DB::raw("strftime('%m', date_raised) as month_num"),
                DB::raw("strftime('%M', date_raised) as month"), // Note: SQLite strftime '%m' is month number. We'll map it.
                DB::raw("SUM(total_amount) as sales")
            )
            ->where('status', 'Validated')
            ->groupBy('month_num')
            ->orderBy('month_num');
        }

        $monthNames = [
            '01' => 'Jan', '02' => 'Feb', '03' => 'Mar', '04' => 'Apr',
            '05' => 'May', '06' => 'Jun', '07' => 'Jul', '08' => 'Aug',
            '09' => 'Sep', '10' => 'Oct', '11' => 'Nov', '12' => 'Dec'
        ];

        $monthlyTrends = $monthlyTrendsQuery->get()->map(fn($item) => [
            'month' => $isPostgres ? $item->month : ($monthNames[sprintf('%02d', $item->month_num)] ?? $item->month_num),
            'sales' => (double) $item->sales,
        ]);

        return Inertia::render('portal/analytics', [
            'rep_performance' => $repPerformance,
            'product_popularity' => $productPopularity,
            'chart_data' => $monthlyTrends,
            'filters' => [
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d'),
            ],
            'metrics' => [
                'total_sales' => $totalSales,
                'total_orders' => $totalOrdersCount,
                'pending_orders' => $pendingCount,
                'validated_orders' => $validatedCount,
            ]
        ]);
    }

    public function exportCsv(Request $request)
    {
        $startDate = $request->input('start_date') ? Carbon::parse($request->input('start_date'))->startOfDay() : Carbon::now()->subMonths(12)->startOfDay();
        $endDate = $request->input('end_date') ? Carbon::parse($request->input('end_date'))->endOfDay() : Carbon::now()->endOfDay();

        $orders = Order::with('customer')
            ->whereBetween('date_raised', [$startDate, $endDate])
            ->where('status', 'Validated')
            ->orderBy('date_raised', 'desc')
            ->get();

        $callback = function() use ($orders) {
            $file = fopen('php://output', 'w');
            // Add UTF-8 BOM for Excel compatibility
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));
            fputcsv($file, ['Order ID', 'Date Raised', 'Customer Name', 'Sales Rep', 'Total Amount', 'Status']);

            foreach ($orders as $order) {
                fputcsv($file, [
                    $order->id,
                    Carbon::parse($order->date_raised)->format('Y-m-d H:i:s'),
                    $order->customer->name,
                    $order->sales_rep,
                    $order->total_amount,
                    $order->status,
                ]);
            }

            fclose($file);
        };

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="laporan_penjualan_' . Carbon::now()->format('Y-m-d') . '.csv"',
        ];

        return response()->stream($callback, 200, $headers);
    }
}
