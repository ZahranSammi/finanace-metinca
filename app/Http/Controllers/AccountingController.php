<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AccountingController extends Controller
{
    public function inbox()
    {
        $orders = Order::with('customer')
            ->where('status', 'Submitted')
            ->orderBy('submitted_at', 'asc')
            ->get()
            ->map(fn($o) => [
                'id' => $o->id,
                'date_raised' => $o->date_raised->format('M d, Y'),
                'submitted_at' => $o->submitted_at ? $o->submitted_at->format('M d, Y H:i') : null,
                'customer_name' => $o->customer->name,
                'sales_rep' => $o->sales_rep,
                'status' => $o->status,
                'total_amount' => $o->total_amount,
                'items' => $o->items()->with('product')->get()->map(fn($item) => [
                    'product_name' => $item->product->name,
                    'quantity' => $item->quantity,
                    'price' => $item->price,
                ]),
            ]);

        return Inertia::render('portal/accounting/inbox', [
            'orders' => $orders,
        ]);
    }

    public function validateOrder(Request $request, $id)
    {
        $order = Order::where('status', 'Submitted')->findOrFail($id);

        $order->update([
            'status' => 'Validated',
            'validated_at' => now(),
            'validated_by' => auth()->id(),
            'validation_notes' => $request->input('notes'),
        ]);

        return redirect()->route('accounting.inbox')->with('success', 'Order validated successfully.');
    }

    public function rejectOrder(Request $request, $id)
    {
        $request->validate([
            'notes' => 'required|string|max:1000',
        ]);

        $order = Order::where('status', 'Submitted')->findOrFail($id);

        $order->update([
            'status' => 'Rejected',
            'validation_notes' => $request->input('notes'),
            'submitted_at' => null, // reset submission
        ]);

        return redirect()->route('accounting.inbox')->with('success', 'Order rejected and sent back to Sales.');
    }

    public function rekap()
    {
        $orders = Order::with('customer', 'validatedBy', 'invoice')
            ->where('status', 'Validated')
            ->orderBy('validated_at', 'desc')
            ->get()
            ->map(fn($o) => [
                'id' => $o->id,
                'date_raised' => $o->date_raised->format('M d, Y'),
                'validated_at' => $o->validated_at ? $o->validated_at->format('M d, Y H:i') : null,
                'validated_by_name' => $o->validatedBy ? $o->validatedBy->name : 'System',
                'customer_name' => $o->customer->name,
                'sales_rep' => $o->sales_rep,
                'total_amount' => $o->total_amount,
                'has_invoice' => $o->invoice !== null,
                'invoice_id' => $o->invoice ? 'INV-' . str_pad($o->invoice->id, 5, '0', STR_PAD_LEFT) : null,
            ]);

        return Inertia::render('portal/accounting/rekap', [
            'orders' => $orders,
        ]);
    }
}
