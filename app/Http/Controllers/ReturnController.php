<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\ReturnNote;
use App\Models\ReturnNoteItem;
use App\Services\NotificationService;
use App\Support\UserRole;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReturnController extends Controller
{
    public function index()
    {
        $returns = ReturnNote::with(['order.customer'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($rtn) => [
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

        $returnNote = DB::transaction(function () use ($data) {
            $totalAmount = collect($data['items'])->sum(fn ($item) => $item['quantity'] * $item['price']);

            $returnNote = ReturnNote::create([
                'order_id' => $data['order_id'],
                'type' => $data['type'],
                'status' => 'Pending',
                'total_amount' => $totalAmount,
                'reason' => $data['reason'],
                'date' => now()->toDateString(),
            ]);

            foreach ($data['items'] as $item) {
                ReturnNoteItem::create([
                    'return_note_id' => $returnNote->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'price_per_item' => $item['price'],
                ]);
            }

            return $returnNote;
        });

        NotificationService::notifyRole(
            UserRole::ACCOUNTING,
            'Pengajuan Retur Barang Baru (#' . $returnNote->id . ')',
            ($request->user()?->name ?? 'Staff Sales') . ' mengajukan retur barang untuk Order ' . $returnNote->order_id . ' senilai Rp ' . number_format((float) $returnNote->total_amount, 0, ',', '.') . '.',
            '/returns',
            'return_submitted',
            Auth::id()
        );

        return redirect()->route('returns.index')->with('success', 'Return note created successfully.');
    }

    public function approve($id)
    {
        $returnNote = ReturnNote::with('order')->findOrFail($id);

        DB::transaction(function () use ($returnNote) {
            $returnNote->update(['status' => 'Approved']);

            $order = $returnNote->order;
            if ($order) {
                $order->total_amount = max(0, $order->total_amount - $returnNote->total_amount);
                $order->save();
            }
        });

        $senderName = Auth::user()?->name ?? 'Staff Accounting';
        if ($returnNote->order?->user_id) {
            NotificationService::notifyUser(
                $returnNote->order->user_id,
                'Retur Barang Disetujui (#' . $returnNote->id . ')',
                $senderName . ' telah menyetujui retur barang untuk Order ' . $returnNote->order_id . ' senilai Rp ' . number_format((float) $returnNote->total_amount, 0, ',', '.') . '.',
                '/returns',
                'return_approved',
                Auth::id()
            );
        } else {
            NotificationService::notifyRole(
                UserRole::SALES,
                'Retur Barang Disetujui (#' . $returnNote->id . ')',
                $senderName . ' telah menyetujui retur barang untuk Order ' . $returnNote->order_id . '.',
                '/returns',
                'return_approved',
                Auth::id()
            );
        }

        return redirect()->back()->with('success', 'Return note approved and order total adjusted.');
    }

    public function reject($id)
    {
        $returnNote = ReturnNote::with('order')->findOrFail($id);
        $returnNote->update(['status' => 'Rejected']);

        $senderName = Auth::user()?->name ?? 'Staff Accounting';
        if ($returnNote->order?->user_id) {
            NotificationService::notifyUser(
                $returnNote->order->user_id,
                'Retur Barang Ditolak (#' . $returnNote->id . ')',
                $senderName . ' menolak pengajuan retur barang untuk Order ' . $returnNote->order_id . '.',
                '/returns',
                'return_rejected',
                Auth::id()
            );
        } else {
            NotificationService::notifyRole(
                UserRole::SALES,
                'Retur Barang Ditolak (#' . $returnNote->id . ')',
                $senderName . ' menolak pengajuan retur barang untuk Order ' . $returnNote->order_id . '.',
                '/returns',
                'return_rejected',
                Auth::id()
            );
        }

        return redirect()->back()->with('success', 'Return note rejected.');
    }
}
