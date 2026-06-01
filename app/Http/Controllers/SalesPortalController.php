<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SalesPortalController extends Controller
{
    public function dashboard()
    {
        $orders = Order::with('customer')->orderBy('date_raised', 'desc')->get();
        
        $totalSales = $orders->sum('total_amount');
        $totalOrdersCount = $orders->count();
        $pendingCount = $orders->where('status', 'Pending')->count();
        $validatedCount = $orders->where('status', 'Validated')->count();

        return Inertia::render('portal/dashboard', [
            'metrics' => [
                'total_sales' => $totalSales,
                'total_orders' => $totalOrdersCount + 1234,
                'pending_orders' => $pendingCount,
                'validated_orders' => $validatedCount,
            ],
            'chart_data' => [
                ['month' => 'Jan', 'sales' => 4000],
                ['month' => 'Feb', 'sales' => 3000],
                ['month' => 'Mar', 'sales' => 2000],
                ['month' => 'Apr', 'sales' => 2780],
                ['month' => 'May', 'sales' => 1890],
                ['month' => 'Jun', 'sales' => 2390],
                ['month' => 'Jul', 'sales' => 3490],
                ['month' => 'Aug', 'sales' => 4200],
                ['month' => 'Sep', 'sales' => 4900],
                ['month' => 'Oct', 'sales' => $totalSales > 0 ? $totalSales : 6500],
            ],
            'recent_orders' => $orders->take(5)->map(fn($o) => [
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
        $orders = Order::with('customer')->orderBy('date_raised', 'desc')->get()->map(fn($o) => [
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
        $request->validate([
            'customerId' => 'required|exists:customers,id',
            'salesRep' => 'required',
            'items' => 'required|array|min:1',
            'items.*.productId' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric',
        ]);

        return DB::transaction(function () use ($request) {
            $subtotal = collect($request->items)->sum(fn($item) => $item['price'] * $item['quantity']);
            $totalAmount = $subtotal * 1.11;

            $order = Order::create([
                'id' => 'ORD-' . rand(100, 999) . '-' . chr(rand(65, 90)) . rand(1, 9),
                'date_raised' => now(),
                'customer_id' => $request->customerId,
                'sales_rep' => $request->salesRep,
                'status' => 'Pending',
                'total_amount' => round($totalAmount, 2),
            ]);

            foreach ($request->items as $item) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $item['productId'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                ]);
            }

            return redirect()->route('orders.index')->with('success', 'Order created successfully.');
        });
    }

    public function editOrder($id)
    {
        $order = Order::with('items.product', 'customer')->findOrFail($id);

        return Inertia::render('portal/orders/edit', [
            'order' => [
                'id' => $order->id,
                'customerId' => $order->customer_id,
                'sales_rep' => $order->sales_rep,
                'items' => $order->items->map(fn($i) => [
                    'productId' => $i->product_id,
                    'quantity' => $i->quantity,
                    'price' => $i->price,
                ]),
            ],
            'customers' => Customer::all(),
            'products' => Product::all(),
        ]);
    }

    public function updateOrder(Request $request, $id)
    {
        $request->validate([
            'customerId' => 'required|exists:customers,id',
            'salesRep' => 'required',
            'items' => 'required|array|min:1',
        ]);

        $order = Order::findOrFail($id);

        return DB::transaction(function () use ($request, $order) {
            $subtotal = collect($request->items)->sum(fn($item) => $item['price'] * $item['quantity']);
            $totalAmount = $subtotal * 1.11;

            $order->update([
                'customer_id' => $request->customerId,
                'sales_rep' => $request->salesRep,
                'total_amount' => round($totalAmount, 2),
            ]);

            $order->items()->delete();

            foreach ($request->items as $item) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $item['productId'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                ]);
            }

            return redirect()->route('orders.index')->with('success', 'Order updated successfully.');
        });
    }

    public function destroyOrder($id)
    {
        $order = Order::findOrFail($id);
        $order->delete();

        return redirect()->route('orders.index')->with('success', 'Order deleted successfully.');
    }

    public function pipeline()
    {
        return Inertia::render('portal/pipeline', [
            'pipeline' => [
                'prospect' => [
                    ['id' => 'deal-1', 'title' => 'Cloud Migration Service', 'company' => 'Hooli Inc.', 'value' => 25000, 'rep' => 'J. Smith'],
                    ['id' => 'deal-2', 'title' => 'Security Audit License', 'company' => 'Initech', 'value' => 8500, 'rep' => 'M. Doe'],
                ],
                'proposal' => [
                    ['id' => 'deal-3', 'title' => 'API Integration Phase 2', 'company' => 'Globex Inc.', 'value' => 12000, 'rep' => 'A. Perez'],
                ],
                'negotiation' => [
                    ['id' => 'deal-4', 'title' => 'Datacenter Server Rack', 'company' => 'Massive Dynamic', 'value' => 45000, 'rep' => 'L. Chen'],
                ],
                'closed_won' => [
                    ['id' => 'deal-5', 'title' => 'Enterprise SLA Upgrade', 'company' => 'Acme Corp', 'value' => 15000, 'rep' => 'J. Smith'],
                ],
            ]
        ]);
    }

    public function customers()
    {
        return Inertia::render('portal/customers/index', [
            'customers' => Customer::withCount('orders')->get()->map(fn($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'email' => $c->email,
                'orders_count' => $c->orders_count,
                'total_spent' => Order::where('customer_id', $c->id)->sum('total_amount'),
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
            'customer' => $customer
        ]);
    }

    public function updateCustomer(Request $request, $id)
    {
        $customer = Customer::findOrFail($id);
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:customers,email,' . $id,
        ]);

        $customer->update($validated);

        return redirect()->route('customers.index')->with('success', 'Customer updated successfully.');
    }

    public function destroyCustomer($id)
    {
        $customer = Customer::findOrFail($id);
        $customer->delete();

        return redirect()->route('customers.index')->with('success', 'Customer deleted successfully.');
    }

    public function analytics()
    {
        return Inertia::render('portal/analytics', [
            'rep_performance' => [
                ['name' => 'J. Smith', 'sales' => 38000, 'deals' => 15],
                ['name' => 'A. Perez', 'sales' => 24500, 'deals' => 10],
                ['name' => 'L. Chen', 'sales' => 48200, 'deals' => 8],
                ['name' => 'M. Doe', 'sales' => 12500, 'deals' => 5],
            ],
            'product_popularity' => [
                ['name' => 'Enterprise Cloud Suite', 'quantity' => 120, 'revenue' => 144000],
                ['name' => 'SaaS API License', 'quantity' => 450, 'revenue' => 202500],
                ['name' => 'Database Storage Node', 'quantity' => 18, 'revenue' => 63000],
            ]
        ]);
    }
}
