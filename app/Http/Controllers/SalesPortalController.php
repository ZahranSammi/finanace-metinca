<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Services\OrderService;
use App\Support\OrderStatus;
use App\Support\SalesTrend;
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
            $query->where('user_id', $user->id);
        }

        $orders = $query->orderBy('date_raised', 'desc')->get();

        $totalSales = (float) $orders->where('status', OrderStatus::VALIDATED)->sum('total_amount');
        $totalOrdersCount = $orders->count();
        $pendingCount = $orders->where('status', OrderStatus::PENDING)->count();
        $validatedCount = $orders->where('status', OrderStatus::VALIDATED)->count();

        $chartData = SalesTrend::monthlyValidated(
            $user->isSales() ? $user->id : null
        );

        if (empty($chartData)) {
            $chartData = SalesTrend::emptySeries();
        }

        return Inertia::render('portal/dashboard', [
            'metrics' => [
                'total_sales' => $totalSales,
                'total_orders' => $totalOrdersCount,
                'pending_orders' => $pendingCount,
                'validated_orders' => $validatedCount,
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
        $query = Order::with('customer');

        if ($request->user()->isSales()) {
            $query->where('user_id', $request->user()->id);
        }

        $orders = $query->orderBy('date_raised', 'desc')->get()->map(fn ($o) => [
            'id' => $o->id,
            'date_raised' => $o->date_raised->format('M d, Y'),
            'customer_name' => $o->customer->name,
            'sales_rep' => $o->sales_rep,
            'status' => $o->status,
            'total_amount' => $o->total_amount,
        ]);

        return Inertia::render('portal/orders/index', [
            'orders' => $orders,
        ]);
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
            OrderStatus::VALIDATED => 'closed_won',
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
