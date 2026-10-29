<?php

namespace App\Http\Controllers;

use App\Models\Plant;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Supplier;
use App\Services\NotificationService;
use App\Support\UserRole;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PurchaseOrderController extends Controller
{
    public function index()
    {
        $purchaseOrders = PurchaseOrder::with(['supplier', 'plant.branch', 'items.product', 'creator', 'approver'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function (PurchaseOrder $po) {
                $poNumber = $po->po_number ?: ('PO-2026-' . str_pad((string) $po->id, 3, '0', STR_PAD_LEFT));

                return [
                    'id' => $po->id,
                    'po_number' => $poNumber,
                    'supplier_id' => $po->supplier_id,
                    'supplier_name' => $po->supplier?->name ?? '-',
                    'plant_id' => $po->plant_id,
                    'plant_name' => $po->plant?->name ?? '-',
                    'branch_name' => $po->plant?->branch?->name ?? '-',
                    'date' => $po->date ? $po->date->format('M d, Y') : '-',
                    'date_raw' => $po->date ? $po->date->format('Y-m-d') : null,
                    'expected_date' => $po->expected_date
                        ? $po->expected_date->format('M d, Y')
                        : ($po->date ? $po->date->copy()->addDays(7)->format('M d, Y') : '-'),
                    'expected_date_raw' => $po->expected_date ? $po->expected_date->format('Y-m-d') : null,
                    'items_count' => $po->items->sum('quantity'),
                    'line_items_count' => $po->items->count(),
                    'total_amount' => (float) $po->total_amount,
                    'status' => $po->status,
                    'payment_status' => $po->payment_status ?? 'unpaid',
                    'notes' => $po->notes,
                    'rejection_notes' => $po->rejection_notes,
                    'created_by_name' => $po->creator?->name ?? 'Staff Accounting',
                    'approved_by_name' => $po->approver?->name ?? (in_array($po->status, ['Approved', 'Received']) ? 'Manager Accounting' : '—'),
                    'approved_at' => $po->approved_at ? $po->approved_at->format('M d, Y H:i') : null,
                    'items' => $po->items->map(fn ($item) => [
                        'id' => $item->id,
                        'product_id' => $item->product_id,
                        'product_code' => $item->product?->code ?? '-',
                        'product_name' => $item->product?->name ?? 'Produk',
                        'unit' => $item->product?->unit ?? 'Unit',
                        'quantity' => (int) $item->quantity,
                        'unit_price' => (float) $item->unit_price,
                        'subtotal' => (float) $item->subtotal,
                    ])->values()->all(),
                ];
            });

        return Inertia::render('portal/purchase-orders/index', [
            'purchase_orders' => $purchaseOrders,
            'suppliers' => Supplier::orderBy('name')->get(['id', 'name']),
            'plants' => Plant::with('branch')->orderBy('name')->get()->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'branch_name' => $p->branch?->name ?? '',
            ]),
            'products' => Product::orderBy('name')->get()->map(fn ($p) => [
                'id' => $p->id,
                'code' => $p->code,
                'name' => $p->name,
                'unit' => $p->unit,
                'price' => (float) $p->price,
                'stock' => (int) $p->stock,
            ]),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => 'nullable|exists:suppliers,id',
            'new_supplier_name' => 'nullable|string|max:255',
            'plant_id' => 'required|exists:plants,id',
            'date' => 'required|date',
            'expected_date' => 'nullable|date',
            'status' => 'required|in:Draft,Submitted',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        if (empty($validated['supplier_id']) && empty($validated['new_supplier_name'])) {
            return redirect()->back()->withErrors(['supplier_id' => 'Pilih supplier atau masukkan nama supplier baru.']);
        }

        $po = DB::transaction(function () use ($validated, $request) {
            $supplierId = $validated['supplier_id'] ?? null;
            if (! $supplierId && ! empty($validated['new_supplier_name'])) {
                $supplier = Supplier::firstOrCreate(['name' => trim($validated['new_supplier_name'])]);
                $supplierId = $supplier->id;
            }

            $nextSeq = (PurchaseOrder::max('id') ?? 0) + 1;
            $poNumber = sprintf('PO-%s-%03d', now()->format('Y'), $nextSeq);
            while (PurchaseOrder::where('po_number', $poNumber)->exists()) {
                $nextSeq++;
                $poNumber = sprintf('PO-%s-%03d', now()->format('Y'), $nextSeq);
            }

            $totalAmount = 0;
            foreach ($validated['items'] as $item) {
                $totalAmount += ((int) $item['quantity']) * ((float) $item['unit_price']);
            }

            $po = PurchaseOrder::create([
                'po_number' => $poNumber,
                'supplier_id' => $supplierId,
                'plant_id' => $validated['plant_id'],
                'date' => $validated['date'],
                'expected_date' => $validated['expected_date'] ?? now()->parse($validated['date'])->addDays(7)->toDateString(),
                'total_amount' => $totalAmount,
                'status' => $validated['status'],
                'notes' => $validated['notes'] ?? null,
                'created_by' => $request->user()->id,
                'payment_status' => 'unpaid',
            ]);

            foreach ($validated['items'] as $item) {
                $qty = (int) $item['quantity'];
                $price = (float) $item['unit_price'];
                PurchaseOrderItem::create([
                    'purchase_order_id' => $po->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $qty,
                    'unit_price' => $price,
                    'subtotal' => $qty * $price,
                ]);
            }

            return $po;
        });

        $po->load('supplier');
        $user = $request->user();

        if ($po->status === 'Submitted') {
            NotificationService::notifyRole(
                [UserRole::MANAGER, UserRole::ACCOUNTING],
                'Pengajuan Purchase Order Baru (' . $po->po_number . ')',
                $user->name . ' mengajukan Purchase Order ' . $po->po_number . ' ke supplier ' . ($po->supplier?->name ?? '-') . ' senilai Rp ' . number_format((float) $po->total_amount, 0, ',', '.') . ' untuk divalidasi.',
                '/purchase-orders',
                'po_submitted',
                $user->id
            );
        }

        return redirect()->route('purchase_orders.index')->with(
            'success',
            'Purchase Order ' . $po->po_number . ' berhasil dibuat dengan status ' . $po->status . '.'
        );
    }

    public function submit(Request $request, $id)
    {
        $po = PurchaseOrder::with('supplier')->findOrFail($id);

        if (! in_array($po->status, ['Draft', 'Pending', 'Rejected'], true)) {
            return redirect()->back()->with('error', 'Hanya PO berstatus Draft, Pending, atau Rejected yang dapat diajukan.');
        }

        $poNumber = $po->po_number ?: ('PO-2026-' . str_pad((string) $po->id, 3, '0', STR_PAD_LEFT));
        $po->update([
            'po_number' => $poNumber,
            'status' => 'Submitted',
            'rejection_notes' => null,
        ]);

        $user = $request->user();
        NotificationService::notifyRole(
            [UserRole::MANAGER, UserRole::ACCOUNTING],
            'Purchase Order Diajukan (' . $poNumber . ')',
            $user->name . ' mengirim Purchase Order ' . $poNumber . ' (' . ($po->supplier?->name ?? '-') . ') untuk persetujuan Manager Accounting.',
            '/purchase-orders',
            'po_submitted',
            $user->id
        );

        return redirect()->back()->with('success', 'Purchase Order ' . $poNumber . ' berhasil dikirim ke Manager Accounting.');
    }

    public function approve(Request $request, $id)
    {
        $po = PurchaseOrder::with('supplier')->findOrFail($id);
        $poNumber = $po->po_number ?: ('PO-2026-' . str_pad((string) $po->id, 3, '0', STR_PAD_LEFT));

        $po->update([
            'po_number' => $poNumber,
            'status' => 'Approved',
            'approved_by' => Auth::id(),
            'approved_at' => now(),
            'rejection_notes' => null,
        ]);

        $user = $request->user();
        if ($po->created_by) {
            NotificationService::notifyUser(
                $po->created_by,
                'Purchase Order Disetujui (' . $poNumber . ')',
                $user->name . ' telah menyetujui Purchase Order ' . $poNumber . ' untuk supplier ' . ($po->supplier?->name ?? '-') . '.',
                '/purchase-orders',
                'po_approved',
                $user->id
            );
        }

        NotificationService::notifyRole(
            [UserRole::ACCOUNTING, UserRole::SALES],
            'Purchase Order Disetujui (' . $poNumber . ')',
            'Purchase Order ' . $poNumber . ' (' . ($po->supplier?->name ?? '-') . ') telah disetujui oleh ' . $user->name . '.',
            '/purchase-orders',
            'po_approved',
            $user->id
        );

        return redirect()->back()->with('success', 'Purchase Order ' . $poNumber . ' berhasil disetujui (Approved).');
    }

    public function reject(Request $request, $id)
    {
        $validated = $request->validate([
            'notes' => 'required|string|max:1000',
        ]);

        $po = PurchaseOrder::with('supplier')->findOrFail($id);
        $poNumber = $po->po_number ?: ('PO-2026-' . str_pad((string) $po->id, 3, '0', STR_PAD_LEFT));

        $po->update([
            'po_number' => $poNumber,
            'status' => 'Rejected',
            'approved_by' => Auth::id(),
            'approved_at' => now(),
            'rejection_notes' => $validated['notes'],
        ]);

        $user = $request->user();
        if ($po->created_by) {
            NotificationService::notifyUser(
                $po->created_by,
                'Purchase Order Ditolak (' . $poNumber . ')',
                $user->name . ' menolak Purchase Order ' . $poNumber . '. Catatan: "' . $validated['notes'] . '"',
                '/purchase-orders',
                'po_rejected',
                $user->id
            );
        } else {
            NotificationService::notifyRole(
                [UserRole::ACCOUNTING, UserRole::SALES],
                'Purchase Order Ditolak (' . $poNumber . ')',
                $user->name . ' menolak Purchase Order ' . $poNumber . '. Catatan: "' . $validated['notes'] . '"',
                '/purchase-orders',
                'po_rejected',
                $user->id
            );
        }

        return redirect()->back()->with('success', 'Purchase Order ' . $poNumber . ' ditolak dan dikembalikan untuk revisi.');
    }

    public function receive(Request $request, $id)
    {
        $po = PurchaseOrder::with(['items.product', 'supplier'])->findOrFail($id);
        if ($po->status !== 'Approved') {
            return redirect()->back()->with('error', 'Hanya PO berstatus Approved yang dapat ditandai diterima (Received).');
        }

        $poNumber = $po->po_number ?: ('PO-2026-' . str_pad((string) $po->id, 3, '0', STR_PAD_LEFT));

        DB::transaction(function () use ($po, $poNumber) {
            $po->update([
                'po_number' => $poNumber,
                'status' => 'Received',
            ]);

            foreach ($po->items as $item) {
                if ($item->product) {
                    $item->product->increment('stock', (int) $item->quantity);
                }
            }
        });

        $user = $request->user();
        NotificationService::notifyRole(
            [UserRole::MANAGER, UserRole::ACCOUNTING],
            'Barang PO Diterima (' . $poNumber . ')',
            $user->name . ' mengonfirmasi penerimaan barang untuk ' . $poNumber . ' (' . ($po->supplier?->name ?? '-') . '). Stok gudang telah diperbarui.',
            '/purchase-orders',
            'po_received',
            $user->id
        );

        return redirect()->back()->with('success', 'Barang untuk ' . $poNumber . ' telah diterima dan stok gudang berhasil ditambahkan.');
    }

    public function pay(Request $request, $id)
    {
        $po = PurchaseOrder::with('supplier')->findOrFail($id);
        $poNumber = $po->po_number ?: ('PO-2026-' . str_pad((string) $po->id, 3, '0', STR_PAD_LEFT));

        $po->update([
            'po_number' => $poNumber,
            'payment_status' => 'paid',
        ]);

        $user = $request->user();
        NotificationService::notifyRole(
            [UserRole::MANAGER, UserRole::ACCOUNTING, UserRole::SALES],
            'Pembayaran PO Lunas (' . $poNumber . ')',
            $user->name . ' menandai pembayaran Purchase Order ' . $poNumber . ' kepada ' . ($po->supplier?->name ?? '-') . ' telah lunas.',
            '/purchase-orders',
            'po_paid',
            $user->id
        );

        return redirect()->back()->with('success', 'Pembayaran Purchase Order ' . $poNumber . ' berhasil dicatat lunas.');
    }
}

