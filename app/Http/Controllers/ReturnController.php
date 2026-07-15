<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\ReturnNote;
use App\Models\ReturnNoteItem;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class ReturnController extends Controller
{
    public function index()
    {
        $returns = ReturnNote::with(['order.customer'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($rtn) => [
                'id' => $rtn->id,
                'order_id' => $rtn->order_id,
                'customer_name' => $rtn->order->customer->name ?? '-',
                'type' => $rtn->type,
                'total_amount' => $rtn->total_amount,
                'status' => $rtn->status,
                'date' => $rtn->created_at->format('Y-m-d H:i'),
            ]);

        return Inertia::render('portal/returns/index', [
            'returns' => $returns,
        ]);
    }

    public function create()
    {
        $orders = Order::with(['customer', 'items.product'])->orderBy('created_at', 'desc')->get();

        return Inertia::render('portal/returns/create', [
            'orders' => $orders,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'order_id' => 'required|exists:orders,id',
            'type' => 'required|in:credit_internal,debit_external',
            'reason' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($data) {
            $totalAmount = collect($data['items'])->sum(fn($item) => $item['quantity'] * $item['price']);

            $returnNote = ReturnNote::create([
                'order_id' => $data['order_id'],
                'type' => $data['type'],
                'status' => 'Pending',
                'total_amount' => $totalAmount,
                'reason' => $data['reason'],
            ]);

            foreach ($data['items'] as $item) {
                ReturnNoteItem::create([
                    'return_note_id' => $returnNote->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                ]);
            }
        });

        return redirect()->route('returns.index')->with('success', 'Return note created successfully.');
    }
}
