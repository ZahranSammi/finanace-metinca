<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Order;
use App\Support\OrderStatus;
use App\Support\Tax;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InvoiceController extends Controller
{
    public function index()
    {
        $invoices = Invoice::with(['order.customer'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($inv) => [
                'id' => 'INV-' . str_pad($inv->id, 5, '0', STR_PAD_LEFT),
                'order_id' => $inv->order_id,
                'customer_name' => $inv->order->customer->name,
                'invoice_type' => $inv->invoice_type,
                'subtotal' => (double) $inv->subtotal,
                'tax_percent' => (double) $inv->tax_percent,
                'tax_amount' => (double) $inv->tax_amount,
                'dp_amount' => (double) $inv->dp_amount,
                'total_amount' => (double) $inv->total_amount,
                'status' => $inv->status,
                'created_at' => $inv->created_at->format('M d, Y H:i'),
            ]);

        return Inertia::render('portal/accounting/invoice-rekap', [
            'invoices' => $invoices,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'order_id' => 'required|exists:orders,id',
            'invoice_type' => 'required|in:tua_lokal,inter_expor',
            'dp_amount' => 'nullable|numeric|min:0',
            'due_date' => 'nullable|date',
            'delivery_date' => 'nullable|date',
        ]);

        $order = Order::with('items')->findOrFail($request->order_id);

        // Invoices may only be issued once accounting has validated the order.
        if ($order->status !== OrderStatus::VALIDATED) {
            return redirect()->back()->with('error', 'Invoices can only be created for validated orders.');
        }

        // Check if invoice already exists
        if (Invoice::where('order_id', $order->id)->exists()) {
            return redirect()->back()->with('error', 'Invoice already exists for this order.');
        }

        // Calculate subtotal from order items
        $subtotal = $order->items->sum(fn($item) => $item->price * $item->quantity);
        $dpAmount = (float) ($request->input('dp_amount', 0) ?? 0);

        $taxPercent = 0;
        $taxAmount = 0;

        if ($request->invoice_type === 'tua_lokal') {
            $taxPercent = Tax::PERCENT;
            $taxAmount = Tax::on($subtotal);
        }

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
            'exchange_rate' => $order->exchange_rate ?? 1,
            'due_date' => $request->due_date,
            'delivery_date' => $request->delivery_date,
            'status' => 'Draft',
        ]);

        return redirect()->route('accounting.rekap')->with('success', 'Invoice created successfully.');
    }
}
