<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Order;
use App\Models\Customer;
use App\Models\Product;
use App\Services\NotificationService;
use App\Support\OrderStatus;
use App\Support\Tax;
use App\Support\UserRole;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class InvoiceController extends Controller
{
    public function create()
    {
        return Inertia::render('portal/invoices/create', [
            'customers' => Customer::orderBy('name')->get()->map->only('id', 'name'),
            'products' => Product::orderBy('name')->get()->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'price' => (double) $p->price,
            ]),
        ]);
    }

    public function storeUnified(Request $request)
    {
        $request->validate([
            'customerId' => 'required|exists:customers,id',
            'invoice_type' => 'required|in:domestik,international',
            'currency' => 'nullable|string|in:IDR,EUR,USD',
            'exchangeRate' => 'nullable|numeric|min:0.000001',
            'items' => 'required|array|min:1',
            'items.*.productId' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'dp_amount' => 'nullable|numeric|min:0',
            'tax_percent' => 'nullable|numeric|min:0|max:100',
            'due_date' => 'nullable|date',
            'delivery_date' => 'nullable|date',
            'attachment' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120', // Max 5MB
        ]);

        if ($request->invoice_type === 'international' && !$request->hasFile('attachment')) {
            return back()->withErrors(['attachment' => 'Dokumen EXIM wajib dilampirkan untuk invoice Internasional.']);
        }

        DB::beginTransaction();
        try {
            // 1. Calculate subtotal first to save in order
            $subtotal = 0;
            foreach ($request->items as $itemData) {
                $product = Product::findOrFail($itemData['productId']);
                $subtotal += ($product->price * $itemData['quantity']);
            }

            // Generate an Order ID
            do {
                $orderId = sprintf('ORD-%03d-%s%d', random_int(100, 999), chr(random_int(65, 90)), random_int(1, 9));
            } while (Order::whereKey($orderId)->exists());

            // 2. Create Order as backend container
            $order = Order::create([
                'id' => $orderId,
                'user_id' => $request->user()->id,
                'sales_rep' => $request->user()->name,
                'customer_id' => $request->customerId,
                'status' => OrderStatus::SUBMITTED, // auto submit since it's just a backend container
                'currency' => $request->currency ?? 'IDR',
                'exchange_rate' => $request->exchangeRate ?? 1,
                'total_amount' => $subtotal,
                'date_raised' => now(),
            ]);

            // Re-loop to create OrderItems
            foreach ($request->items as $itemData) {
                $product = Product::findOrFail($itemData['productId']);
                $order->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $itemData['quantity'],
                    'price' => $product->price,
                ]);
            }


            // 2. File Upload for EXIM
            $filePath = null;
            if ($request->hasFile('attachment')) {
                $filePath = $request->file('attachment')->store('exim_documents', 'public');
            }

            // 3. Create Invoice
            $exchangeRate = (float) ($request->exchangeRate ?? 1);
            $taxPercent = $request->has('tax_percent') 
                ? (float) $request->tax_percent 
                : ($request->invoice_type === 'domestik' ? Tax::PERCENT : 0);

            $dpAmountInput = (float) ($request->dp_amount ?? 0);
            $dpAmount = ($order->currency && $order->currency !== 'IDR') 
                ? ($dpAmountInput * $exchangeRate) 
                : $dpAmountInput;

            $taxAmount = $subtotal * ($taxPercent / 100);

            if ($dpAmount > $subtotal + $taxAmount) {
                DB::rollBack();
                return redirect()->back()->with('error', 'Down payment cannot exceed the invoice total.');
            }

            $totalAmount = $subtotal + $taxAmount - $dpAmount;

            Invoice::create([
                'order_id' => $order->id,
                'invoice_type' => $request->invoice_type,
                'subtotal' => round($subtotal, 2),
                'tax_percent' => $taxPercent,
                'tax_amount' => round($taxAmount, 2),
                'dp_amount' => round($dpAmount, 2),
                'total_amount' => round($totalAmount, 2),
                'currency' => $order->currency,
                'exchange_rate' => $exchangeRate,
                'due_date' => $request->due_date,
                'delivery_date' => $request->delivery_date,
                'status' => 'draft',
                'file_path' => $filePath,
            ]);

            DB::commit();

            return redirect()->route('sales.invoice_rekap')->with('success', 'Invoice created successfully as Draft.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Failed to create invoice: ' . $e->getMessage());
        }
    }

    public function index()
    {
        // Generate invoice record for orders created without invoice record
        $ordersWithoutInvoice = Order::doesntHave('invoice')->get();
        foreach ($ordersWithoutInvoice as $order) {
            $taxPercent = 11;
            $total = (float) $order->total_amount;
            $subtotal = round($total / (1 + ($taxPercent / 100)), 2);
            $taxAmount = round($total - $subtotal, 2);

            Invoice::create([
                'order_id' => $order->id,
                'invoice_type' => 'domestik',
                'subtotal' => $subtotal,
                'tax_percent' => $taxPercent,
                'tax_amount' => $taxAmount,
                'dp_amount' => 0,
                'total_amount' => $total,
                'currency' => $order->currency ?? 'IDR',
                'exchange_rate' => (float) ($order->exchange_rate ?? 1),
                'status' => $order->status === 'lunas' ? 'lunas' : ($order->status === 'utang' ? 'utang' : ($order->status === 'Submitted' ? 'Submitted' : 'Pending')),
                'created_at' => $order->date_raised ?? $order->created_at ?? now(),
                'updated_at' => $order->updated_at ?? now(),
            ]);
        }

        $invoices = Invoice::with(['order.customer', 'order.items.product'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($inv) => [
                'id' => 'INV-' . str_pad($inv->id, 5, '0', STR_PAD_LEFT),
                'order_id' => $inv->order_id,
                'customer_name' => $inv->order->customer->name ?? 'Pelanggan',
                'sales_rep' => $inv->order->sales_rep ?? '-',
                'invoice_type' => $inv->invoice_type ?? 'domestik',
                'subtotal' => (double) $inv->subtotal,
                'tax_percent' => (double) $inv->tax_percent,
                'tax_amount' => (double) $inv->tax_amount,
                'dp_amount' => (double) $inv->dp_amount,
                'total_amount' => (double) $inv->total_amount,
                'currency' => $inv->currency ?? 'IDR',
                'exchange_rate' => (double) ($inv->exchange_rate ?? 1),
                'file_path' => $inv->file_path ? asset('storage/' . $inv->file_path) : null,
                'status' => $inv->status,
                'created_at' => $inv->created_at ? $inv->created_at->format('M d, Y H:i') : '-',
                'items' => ($inv->order && $inv->order->items) ? $inv->order->items->map(fn($item) => [
                    'product_name' => $item->product->name ?? 'Produk',
                    'quantity' => (int) $item->quantity,
                    'price' => (double) $item->price,
                ])->values()->all() : [],
            ]);

        return Inertia::render('portal/sales/invoice-rekap', [
            'invoices' => $invoices,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'order_id' => 'required|exists:orders,id',
            'invoice_type' => 'required|in:domestik,international',
            'dp_amount' => 'nullable|numeric|min:0',
            'due_date' => 'nullable|date',
            'delivery_date' => 'nullable|date',
            'tax_percent' => 'nullable|numeric|min:0|max:100',
            'exchange_rate' => 'nullable|numeric|min:0.000001',
        ]);

        $order = Order::with('items')->findOrFail($request->order_id);

        // Check if invoice already exists
        if (Invoice::where('order_id', $order->id)->exists()) {
            return redirect()->back()->with('error', 'Invoice already exists for this order.');
        }

        // Calculate subtotal from order items (in IDR)
        $subtotal = $order->items->sum(fn($item) => $item->price * $item->quantity);
        
        $exchangeRate = (float) $request->input('exchange_rate', $order->exchange_rate ?? 1);
        $taxPercent = $request->has('tax_percent') 
            ? (float) $request->input('tax_percent') 
            : ($request->invoice_type === 'domestik' ? Tax::PERCENT : 0);

        // Input DP is in the order's foreign currency if not IDR. Convert to IDR for DB storage.
        $dpAmountInput = (float) ($request->input('dp_amount', 0) ?? 0);
        $dpAmount = ($order->currency && $order->currency !== 'IDR') 
            ? ($dpAmountInput * $exchangeRate) 
            : $dpAmountInput;

        $taxAmount = $subtotal * ($taxPercent / 100);

        // The down payment can never exceed what is owed.
        if ($dpAmount > $subtotal + $taxAmount) {
            return redirect()->back()->with('error', 'Down payment cannot exceed the invoice total.');
        }

        $totalAmount = $subtotal + $taxAmount - $dpAmount;

        Invoice::create([
            'order_id' => $order->id,
            'invoice_type' => $request->invoice_type,
            'subtotal' => round($subtotal, 2),
            'tax_percent' => $taxPercent,
            'tax_amount' => round($taxAmount, 2),
            'dp_amount' => round($dpAmount, 2),
            'total_amount' => round($totalAmount, 2),
            'currency' => $order->currency ?? 'IDR',
            'exchange_rate' => $exchangeRate,
            'due_date' => $request->due_date,
            'delivery_date' => $request->delivery_date,
            'status' => 'draft',
        ]);

        return redirect()->route('sales.rekap')->with('success', 'Invoice created successfully as Draft.');
    }

    public function submit($id)
    {
        $invoice = Invoice::with('order.customer')->findOrFail($id);

        if ($invoice->status !== 'draft' && $invoice->status !== 'rejected') {
            return redirect()->back()->with('error', 'Only draft or rejected invoices can be submitted.');
        }

        $invoice->update([
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        $invNumber = 'INV-' . str_pad((string) $invoice->id, 5, '0', STR_PAD_LEFT);
        $senderName = Auth::user()?->name ?? 'Staff Sales';
        $customerName = $invoice->order?->customer?->name ?? 'Customer';

        NotificationService::notifyRole(
            UserRole::ACCOUNTING,
            'Invoice Baru Menunggu Validasi (' . $invNumber . ')',
            $senderName . ' mengirim ' . $invNumber . ' untuk customer ' . $customerName . ' senilai Rp ' . number_format((float) $invoice->total_amount, 0, ',', '.') . ' ke Kotak Masuk Validasi.',
            '/accounting/inbox',
            'invoice_submitted',
            Auth::id()
        );

        return redirect()->back()->with('success', 'Invoice submitted to Accounting for validation.');
    }

    public function markAsLunas($id)
    {
        $invoice = Invoice::with('order.customer')->findOrFail($id);
        
        $invoice->update([
            'status' => 'lunas'
        ]);

        if ($invoice->order) {
            $invoice->order->update(['status' => 'lunas']);
        }

        $invNumber = 'INV-' . str_pad((string) $invoice->id, 5, '0', STR_PAD_LEFT);
        $senderName = Auth::user()?->name ?? 'Staff Sales';
        $customerName = $invoice->order?->customer?->name ?? 'Customer';

        NotificationService::notifyRole(
            [UserRole::ACCOUNTING, UserRole::MANAGER],
            'Pembayaran Invoice Lunas (' . $invNumber . ')',
            $senderName . ' menandai pembayaran ' . $invNumber . ' (' . $customerName . ') senilai Rp ' . number_format((float) $invoice->total_amount, 0, ',', '.') . ' telah LUNAS.',
            '/sales/invoice-rekap',
            'invoice_paid',
            Auth::id()
        );

        return redirect()->back()->with('success', 'Invoice marked as Lunas.');
    }
}
