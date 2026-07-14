<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Support\OrderStatus;
use App\Support\SalesTrend;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ManagerController extends Controller
{
    public function analytics(Request $request)
    {
        [$startDate, $endDate] = $this->dateRange($request, 6);

        $totalSales = (float) Order::where('status', OrderStatus::VALIDATED)
            ->whereBetween('date_raised', [$startDate, $endDate])
            ->sum('total_amount');
        $totalOrdersCount = Order::whereBetween('date_raised', [$startDate, $endDate])->count();
        $pendingCount = Order::where('status', OrderStatus::SUBMITTED)->count(); // waiting validation
        $validatedCount = Order::where('status', OrderStatus::VALIDATED)->count();

        $repPerformance = Order::select('sales_rep', DB::raw('SUM(total_amount) as sales'), DB::raw('COUNT(*) as deals'))
            ->where('status', OrderStatus::VALIDATED)
            ->whereBetween('date_raised', [$startDate, $endDate])
            ->groupBy('sales_rep')
            ->orderBy('sales', 'desc')
            ->get()
            ->map(fn ($r) => [
                'name' => $r->sales_rep,
                'sales' => (float) $r->sales,
                'deals' => (int) $r->deals,
            ]);

        $productPopularity = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->select('products.name', DB::raw('SUM(order_items.quantity) as quantity'), DB::raw('SUM(order_items.price * order_items.quantity) as revenue'))
            ->where('orders.status', OrderStatus::VALIDATED)
            ->whereBetween('orders.date_raised', [$startDate, $endDate])
            ->groupBy('products.name')
            ->orderBy('revenue', 'desc')
            ->get()
            ->map(fn ($p) => [
                'name' => $p->name,
                'quantity' => (int) $p->quantity,
                'revenue' => (float) $p->revenue,
            ]);

        return Inertia::render('portal/analytics', [
            'rep_performance' => $repPerformance,
            'product_popularity' => $productPopularity,
            'chart_data' => SalesTrend::monthlyValidated(),
            'filters' => [
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d'),
            ],
            'metrics' => [
                'total_sales' => $totalSales,
                'total_orders' => $totalOrdersCount,
                'pending_orders' => $pendingCount,
                'validated_orders' => $validatedCount,
            ],
        ]);
    }

    public function exportCsv(Request $request): StreamedResponse
    {
        [$startDate, $endDate] = $this->dateRange($request, 12);

        $orders = Order::with('customer')
            ->whereBetween('date_raised', [$startDate, $endDate])
            ->where('status', OrderStatus::VALIDATED)
            ->orderBy('date_raised', 'desc')
            ->get();

        $callback = function () use ($orders) {
            $file = fopen('php://output', 'w');
            // UTF-8 BOM for Excel compatibility.
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));
            fputcsv($file, ['Order ID', 'Date Raised', 'Customer Name', 'Sales Rep', 'Total Amount', 'Status']);

            $sanitize = fn (mixed $value): string => $this->sanitizeCsv($value);

            foreach ($orders as $order) {
                fputcsv($file, array_map($sanitize, [
                    $order->id,
                    Carbon::parse($order->date_raised)->format('Y-m-d H:i:s'),
                    $order->customer->name,
                    $order->sales_rep,
                    $order->total_amount,
                    $order->status,
                ]));
            }

            fclose($file);
        };

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="laporan_penjualan_'.Carbon::now()->format('Y-m-d').'.csv"',
        ];

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Resolve the request's date range, defaulting to the last N months.
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    private function dateRange(Request $request, int $defaultMonths): array
    {
        $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
        ]);

        $start = $request->input('start_date')
            ? Carbon::parse($request->input('start_date'))->startOfDay()
            : Carbon::now()->subMonths($defaultMonths)->startOfDay();

        $end = $request->input('end_date')
            ? Carbon::parse($request->input('end_date'))->endOfDay()
            : Carbon::now()->endOfDay();

        return [$start, $end];
    }

    /**
     * Neutralize CSV formula injection: cells beginning with = + - @ (or a
     * leading control char) are prefixed with a single quote so spreadsheet
     * software treats them as text rather than executing them.
     */
    private function sanitizeCsv(mixed $value): string
    {
        $value = (string) $value;

        if ($value !== '' && in_array($value[0], ['=', '+', '-', '@', "\t", "\r"], true)) {
            return "'".$value;
        }

        return $value;
    }
}
