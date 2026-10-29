<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Services\NotificationService;
use App\Services\OrderService;
use App\Support\OrderStatus;
use App\Support\SalesTrend;
use App\Support\UserRole;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class SalesPortalController extends Controller
{
    public function __construct(private readonly OrderService $orders)
    {
    }

    public function dashboard(Request $request)
    {
        $user = $request->user();

        // Self-registered users stay "pending" until an administrator promotes
        // them; they must not see any sales, customer, or pricing data.
        if (! $user->isSales() && ! $user->isAccounting() && ! $user->isManager()) {
            return Inertia::render('portal/pending');
        }

        $query = Order::with('customer');

        if ($user->isSales()) {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhere('sales_rep', $user->name);
            });
        }

        $orders = $query->orderBy('date_raised', 'desc')->get();

        $totalSales = (float) $orders->whereIn('status', [OrderStatus::UTANG, OrderStatus::LUNAS])->sum('total_amount');
        $totalPaidSales = (float) $orders->where('status', OrderStatus::LUNAS)->sum('total_amount');
        $totalOrdersCount = $orders->count();
        $pendingCount = $user->isSales()
            ? $orders->where('status', OrderStatus::PENDING)->count()
            : $orders->where('status', OrderStatus::SUBMITTED)->count();
        $validatedCount = $orders->whereIn('status', [OrderStatus::UTANG, OrderStatus::LUNAS])->count();

        $returnsQuery = \App\Models\ReturnNote::query();
        if ($user->isSales()) {
            $returnsQuery->whereHas('order', function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhere('sales_rep', $user->name);
            });
        }
        $approvedReturnsCount = $returnsQuery->where('status', 'Approved')->count();

        $chartData = SalesTrend::monthlyValidated(
            $user->isSales() ? $user->id : null
        );

        if (empty($chartData)) {
            $chartData = SalesTrend::emptySeries();
        }

        return Inertia::render('portal/dashboard', [
            'metrics' => [
                'total_sales' => $totalSales,
                'total_paid_sales' => $totalPaidSales,
                'total_orders' => $totalOrdersCount,
                'pending_orders' => $pendingCount,
                'validated_orders' => $validatedCount,
                'approved_returns' => $approvedReturnsCount,
            ],
            'chart_data' => $chartData,
            'recent_orders' => $orders->take(5)->map(fn ($o) => [
                'id' => $o->id,
                'date_raised' => $o->date_raised->format('M d, Y'),
                'customer_name' => $o->customer->name,
                'sales_rep' => $o->sales_rep,
                'status' => $o->status,
                'total_amount' => $o->total_amount,
            ]),
        ]);
    }

    public function orders(Request $request)
    {
        return redirect()->route('sales.invoice_rekap');
    }

    public function createOrder()
    {
        return Inertia::render('portal/orders/create', [
            'customers' => Customer::all(),
            'products' => Product::all(),
        ]);
    }

    public function storeOrder(Request $request)
    {
        $data = $request->validate([
            'customerId' => 'required|exists:customers,id',
            'currency' => 'nullable|string|in:IDR,EUR,USD',
            'exchangeRate' => 'nullable|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.productId' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        $this->orders->create($request->user(), $data);

        return redirect()->route('orders.index')->with('success', 'Order created successfully.');
    }

    public function submitOrder(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        Gate::authorize('submit', $order);

        if (! in_array($order->status, OrderStatus::EDITABLE, true)) {
            return redirect()->back()->with('error', 'Only Pending or Rejected orders can be submitted.');
        }

        $order->update([
            'status' => OrderStatus::SUBMITTED,
            'submitted_at' => now(),
        ]);

        NotificationService::notifyRole(
            UserRole::ACCOUNTING,
            'Pesanan Baru Dikirim (' . $order->id . ')',
            ($request->user()?->name ?? 'Staff Sales') . ' mengirim pesanan ' . $order->id . ' untuk divalidasi oleh Accounting.',
            '/accounting/inbox',
            'order_submitted',
            $request->user()?->id
        );

        return redirect()->route('orders.index')->with('success', 'Order submitted to accounting successfully.');
    }

    public function editOrder($id)
    {
        $order = Order::with('items.product', 'customer')->findOrFail($id);

        Gate::authorize('update', $order);

        return Inertia::render('portal/orders/edit', [
            'order' => [
                'id' => $order->id,
                'customerId' => $order->customer_id,
                'sales_rep' => $order->sales_rep,
                'currency' => $order->currency,
                'exchangeRate' => $order->exchange_rate,
                'items' => $order->items->map(fn ($i) => [
                    'productId' => $i->product_id,
                    'quantity' => $i->quantity,
                    'price' => $i->price,
                ]),
                'status' => $order->status,
                'validation_notes' => $order->validation_notes,
            ],
            'customers' => Customer::all(),
            'products' => Product::all(),
        ]);
    }

    public function updateOrder(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        Gate::authorize('update', $order);

        $data = $request->validate([
            'customerId' => 'required|exists:customers,id',
            'currency' => 'nullable|string|in:IDR,EUR,USD',
            'exchangeRate' => 'nullable|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.productId' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        $this->orders->update($order, $request->user(), $data);

        return redirect()->route('orders.index')->with('success', 'Order updated successfully.');
    }

    public function destroyOrder($id)
    {
        $order = Order::findOrFail($id);

        Gate::authorize('delete', $order);

        $order->delete();

        return redirect()->route('orders.index')->with('success', 'Order deleted successfully.');
    }

    public function pipeline(Request $request)
    {
        $query = Order::with('customer');

        if ($request->user()->isSales()) {
            $query->where('user_id', $request->user()->id);
        }

        $orders = $query->get();

        $buckets = [
            'prospect' => [],
            'proposal' => [],
            'negotiation' => [],
            'closed_won' => [],
        ];

        $stageByStatus = [
            OrderStatus::PENDING => 'prospect',
            OrderStatus::SUBMITTED => 'proposal',
            OrderStatus::REJECTED => 'negotiation',
            OrderStatus::UTANG => 'closed_won',
            OrderStatus::LUNAS => 'closed_won',
        ];

        foreach ($orders as $order) {
            $stage = $stageByStatus[$order->status] ?? null;

            if ($stage === null) {
                continue;
            }

            $buckets[$stage][] = [
                'id' => $order->id,
                'title' => 'Order '.$order->id,
                'company' => $order->customer->name ?? 'Unknown Customer',
                'value' => (float) $order->total_amount,
                'rep' => $order->sales_rep,
            ];
        }

        return Inertia::render('portal/pipeline', [
            'pipeline' => $buckets,
        ]);
    }

    public function rekap()
    {
        $orders = Order::with('customer', 'validatedBy', 'invoice')
            ->whereIn('status', [OrderStatus::UTANG, OrderStatus::LUNAS])
            ->orderBy('validated_at', 'desc')
            ->get()
            ->map(fn ($o) => [
                'id' => $o->id,
                'date_raised' => $o->date_raised->format('M d, Y'),
                'validated_at' => $o->validated_at ? $o->validated_at->format('M d, Y H:i') : null,
                'validated_by_name' => $o->validatedBy ? $o->validatedBy->name : 'System',
                'customer_name' => $o->customer->name,
                'sales_rep' => $o->sales_rep,
                'total_amount' => $o->total_amount,
                'currency' => $o->currency,
                'exchange_rate' => (float) $o->exchange_rate,
                'has_invoice' => $o->invoice !== null,
                'invoice_id' => $o->invoice ? 'INV-'.str_pad($o->invoice->id, 5, '0', STR_PAD_LEFT) : null,
            ]);

        return Inertia::render('portal/sales/rekap', [
            'orders' => $orders,
        ]);
    }

    public function customers()
    {
        return Inertia::render('portal/customers/index', [
            'customers' => Customer::withCount('orders')
                ->withSum('orders as total_spent', 'total_amount')
                ->get()
                ->map(fn ($c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'email' => $c->email,
                    'orders_count' => $c->orders_count,
                    'total_spent' => (float) ($c->total_spent ?? 0),
                ]),
        ]);
    }

    public function createCustomer()
    {
        return Inertia::render('portal/customers/create');
    }

    public function storeCustomer(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:customers,email',
        ]);

        Customer::create($validated);

        return redirect()->route('customers.index')->with('success', 'Customer created successfully.');
    }

    public function editCustomer($id)
    {
        $customer = Customer::findOrFail($id);

        return Inertia::render('portal/customers/edit', [
            'customer' => $customer,
        ]);
    }

    public function updateCustomer(Request $request, $id)
    {
        $customer = Customer::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:customers,email,'.$id,
        ]);

        $customer->update($validated);

        return redirect()->route('customers.index')->with('success', 'Customer updated successfully.');
    }

    public function destroyCustomer($id)
    {
        $customer = Customer::findOrFail($id);

        // The customer_id FK cascades: deleting a customer would silently
        // destroy their orders (including validated ones) and invoices.
        if ($customer->orders()->exists()) {
            return redirect()->route('customers.index')->with('error', 'Cannot delete a customer that has orders.');
        }

        $customer->delete();

        return redirect()->route('customers.index')->with('success', 'Customer deleted successfully.');
    }
}
