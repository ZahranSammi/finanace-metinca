<?php

namespace Database\Seeders;

use App\Http\Controllers\AccountingController;
use App\Models\AppNotification;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\ManagerReport;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ReturnNote;
use App\Models\ReturnNoteItem;
use App\Models\User;
use App\Support\UserRole;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class SalesPortalSeeder extends Seeder
{
    public function run(): void
    {
        $customers = [
            ['name' => 'Acme Corporation Ltd.', 'email' => 'billing@acme.com'],
            ['name' => 'Globex Inc.', 'email' => 'procurement@globex.com'],
            ['name' => 'Initech Solutions', 'email' => 'contact@initech.com'],
            ['name' => 'Soylent Corp', 'email' => 'sales@soylent.com'],
            ['name' => 'Massive Dynamic', 'email' => 'info@massivedynamic.com'],
            ['name' => 'Umbrella Corp', 'email' => 'orders@umbrellacorp.com'],
        ];

        $customerModels = [];
        foreach ($customers as $c) {
            $customerModels[] = Customer::firstOrCreate(['email' => $c['email']], $c);
        }

        $products = [
            ['code' => 'OFF-001', 'name' => 'Printer Paper A4 (Ream)', 'category' => 'Office Supplies', 'unit' => 'Ream', 'stock' => 150, 'min' => 50, 'location' => 'Gudang A-1', 'price' => 55000],
            ['code' => 'OFF-002', 'name' => 'Ballpoint Pen (Box)', 'category' => 'Office Supplies', 'unit' => 'Box', 'stock' => 8, 'min' => 28, 'location' => 'Gudang A-1', 'price' => 28000],
            ['code' => 'OFF-003', 'name' => 'Stapler Standard', 'category' => 'Office Supplies', 'unit' => 'Unit', 'stock' => 15, 'min' => 5, 'location' => 'Gudang A-2', 'price' => 45000],
            ['code' => 'ELE-001', 'name' => 'Mouse Wireless Logitech', 'category' => 'Electronics', 'unit' => 'Unit', 'stock' => 45, 'min' => 10, 'location' => 'Gudang B-1', 'price' => 185000],
        ];

        $productModels = [];
        foreach ($products as $p) {
            $productModels[] = Product::firstOrCreate(['code' => $p['code']], $p);
        }

        $staffSalesUser = User::where('email', 'sales@example.com')->first()
            ?? User::where('role', UserRole::SALES)->first();
        $staffAccountingUser = User::where('role', UserRole::ACCOUNTING)->first();
        $managerUser = User::where('role', UserRole::MANAGER)->first();

        $salesUserId = $staffSalesUser ? $staffSalesUser->id : 2;
        $accountingUserId = $staffAccountingUser ? $staffAccountingUser->id : 3;
        $managerUserId = $managerUser ? $managerUser->id : 4;

        $ordersData = [
            // January - Lunas
            [
                'id' => 'ORD-101-A1',
                'date' => '2026-01-15 10:00:00',
                'customer_idx' => 0,
                'sales_rep' => 'Staff Sales',
                'status' => 'lunas',
                'invoice_status' => 'lunas',
                'invoice_type' => 'domestik',
                'dp_amount' => 200000,
                'items' => [
                    ['product_idx' => 0, 'quantity' => 20],
                    ['product_idx' => 1, 'quantity' => 5],
                ],
            ],
            [
                'id' => 'ORD-102-B2',
                'date' => '2026-01-28 14:30:00',
                'customer_idx' => 1,
                'sales_rep' => 'Staff Sales',
                'status' => 'lunas',
                'invoice_status' => 'lunas',
                'invoice_type' => 'domestik',
                'dp_amount' => 0,
                'items' => [
                    ['product_idx' => 3, 'quantity' => 10],
                ],
            ],
            // February - Lunas
            [
                'id' => 'ORD-201-C3',
                'date' => '2026-02-10 11:15:00',
                'customer_idx' => 2,
                'sales_rep' => 'Staff Sales',
                'status' => 'lunas',
                'invoice_status' => 'lunas',
                'invoice_type' => 'domestik',
                'dp_amount' => 150000,
                'items' => [
                    ['product_idx' => 2, 'quantity' => 10],
                    ['product_idx' => 0, 'quantity' => 15],
                ],
            ],
            // March - Utang & Rejected
            [
                'id' => 'ORD-301-D4',
                'date' => '2026-03-05 09:00:00',
                'customer_idx' => 3,
                'sales_rep' => 'Staff Sales',
                'status' => 'utang',
                'invoice_status' => 'utang',
                'invoice_type' => 'domestik',
                'dp_amount' => 100000,
                'items' => [
                    ['product_idx' => 3, 'quantity' => 12],
                ],
            ],
            [
                'id' => 'ORD-302-E5',
                'date' => '2026-03-22 16:45:00',
                'customer_idx' => 4,
                'sales_rep' => 'Staff Sales',
                'status' => 'Rejected',
                'invoice_status' => 'rejected',
                'invoice_type' => 'domestik',
                'dp_amount' => 0,
                'items' => [
                    ['product_idx' => 1, 'quantity' => 12],
                ],
            ],
            // April - Utang
            [
                'id' => 'ORD-401-F6',
                'date' => '2026-04-12 13:20:00',
                'customer_idx' => 5,
                'sales_rep' => 'Staff Sales',
                'status' => 'utang',
                'invoice_status' => 'utang',
                'invoice_type' => 'international',
                'dp_amount' => 500000,
                'items' => [
                    ['product_idx' => 0, 'quantity' => 50],
                    ['product_idx' => 3, 'quantity' => 10],
                ],
            ],
            // May - Utang & Submitted
            [
                'id' => 'ORD-501-G7',
                'date' => '2026-05-18 10:30:00',
                'customer_idx' => 0,
                'sales_rep' => 'Staff Sales',
                'status' => 'utang',
                'invoice_status' => 'utang',
                'invoice_type' => 'domestik',
                'dp_amount' => 0,
                'items' => [
                    ['product_idx' => 2, 'quantity' => 8],
                    ['product_idx' => 3, 'quantity' => 4],
                ],
            ],
            [
                'id' => 'ORD-502-H8',
                'date' => '2026-05-25 15:00:00',
                'customer_idx' => 1,
                'sales_rep' => 'Staff Sales',
                'status' => 'Submitted',
                'invoice_status' => 'submitted',
                'invoice_type' => 'domestik',
                'dp_amount' => 0,
                'items' => [
                    ['product_idx' => 0, 'quantity' => 30],
                ],
            ],
            // June - Draft
            [
                'id' => 'ORD-601-I9',
                'date' => '2026-06-02 11:00:00',
                'customer_idx' => 2,
                'sales_rep' => 'Staff Sales',
                'status' => 'Pending',
                'invoice_status' => 'draft',
                'invoice_type' => 'domestik',
                'dp_amount' => 0,
                'items' => [
                    ['product_idx' => 1, 'quantity' => 20],
                    ['product_idx' => 2, 'quantity' => 5],
                ],
            ],
        ];

        foreach ($ordersData as $oData) {
            if (Order::where('id', $oData['id'])->exists()) {
                continue;
            }
            $subtotal = 0;
            foreach ($oData['items'] as $item) {
                $p = $productModels[$item['product_idx']];
                $subtotal += $p->price * $item['quantity'];
            }

            $taxPercent = $oData['invoice_type'] === 'international' ? 0 : 11;
            $taxAmount = round($subtotal * ($taxPercent / 100), 2);
            $dpAmount = (float) ($oData['dp_amount'] ?? 0);
            $totalAmount = round($subtotal + $taxAmount - $dpAmount, 2);

            $dateCarbon = Carbon::parse($oData['date']);
            $isValidated = in_array($oData['status'], ['utang', 'lunas'], true);
            $isSubmitted = in_array($oData['status'], ['Submitted', 'utang', 'lunas'], true);

            $order = Order::create([
                'id' => $oData['id'],
                'user_id' => $salesUserId,
                'date_raised' => $dateCarbon,
                'customer_id' => $customerModels[$oData['customer_idx']]->id,
                'sales_rep' => $oData['sales_rep'],
                'status' => $oData['status'],
                'total_amount' => $totalAmount,
                'submitted_at' => $isSubmitted ? $dateCarbon->copy()->addMinutes(30) : null,
                'validated_at' => $isValidated ? $dateCarbon->copy()->addHours(2) : null,
                'validated_by' => $isValidated ? $accountingUserId : null,
            ]);

            foreach ($oData['items'] as $item) {
                $p = $productModels[$item['product_idx']];
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $p->id,
                    'quantity' => $item['quantity'],
                    'price' => $p->price,
                ]);
            }

            Invoice::create([
                'order_id' => $order->id,
                'invoice_type' => $oData['invoice_type'],
                'subtotal' => round($subtotal, 2),
                'tax_percent' => $taxPercent,
                'tax_amount' => $taxAmount,
                'dp_amount' => $dpAmount,
                'total_amount' => $totalAmount,
                'currency' => 'IDR',
                'exchange_rate' => 1,
                'due_date' => $dateCarbon->copy()->addDays(14)->toDateString(),
                'delivery_date' => $dateCarbon->copy()->addDays(5)->toDateString(),
                'status' => $oData['invoice_status'],
                'submitted_at' => $isSubmitted ? $dateCarbon->copy()->addMinutes(30) : null,
                'validated_at' => $isValidated ? $dateCarbon->copy()->addHours(2) : null,
                'validated_by' => $isValidated ? $accountingUserId : null,
                'created_at' => $dateCarbon,
                'updated_at' => $dateCarbon,
            ]);
        }

        // Seed a sample approved Return Note so reports & Neraca show return adjustments
        if (ReturnNote::count() === 0) {
            $targetOrder = Order::find('ORD-501-G7') ?? Order::first();
            if ($targetOrder) {
                $rtn = ReturnNote::create([
                    'order_id' => $targetOrder->id,
                    'type' => 'credit_internal',
                    'status' => 'Approved',
                    'total_amount' => 90000,
                    'reason' => '2 unit Stapler mengalami kerusakan kemasan saat pengiriman.',
                    'date' => now()->subDays(4)->toDateString(),
                ]);
                ReturnNoteItem::create([
                    'return_note_id' => $rtn->id,
                    'product_id' => $productModels[2]->id,
                    'quantity' => 2,
                    'price_per_item' => 45000,
                ]);
            }
        }

        // Seed sample detailed ManagerReport so Manager Accounting immediately sees rich reports
        if (ManagerReport::count() === 0) {
            $yearStart = Carbon::create(2026, 1, 1)->startOfYear();
            $yearEnd = Carbon::create(2026, 12, 31)->endOfYear();

            ManagerReport::create([
                'type' => 'yearly',
                'period_start' => $yearStart,
                'period_end' => $yearEnd,
                'metrics_data' => AccountingController::buildDetailedReportPayload($yearStart, $yearEnd),
                'status' => 'submitted',
                'created_by' => $accountingUserId,
            ]);

            $monthStart = Carbon::create(2026, 5, 1)->startOfMonth();
            $monthEnd = Carbon::create(2026, 5, 31)->endOfMonth();

            ManagerReport::create([
                'type' => 'monthly',
                'period_start' => $monthStart,
                'period_end' => $monthEnd,
                'metrics_data' => AccountingController::buildDetailedReportPayload($monthStart, $monthEnd),
                'status' => 'validated',
                'created_by' => $accountingUserId,
                'validated_by' => $managerUserId,
                'validated_at' => now()->subDays(2),
                'validation_notes' => 'Laporan rincian transaksi invoice, customer, dan produk telah sesuai dengan buku besar.',
            ]);
        }

        // Seed initial In-App Notifications across all 3 actors
        if (AppNotification::count() === 0) {
            // For Staff Accounting
            AppNotification::create([
                'user_id' => $accountingUserId,
                'sender_id' => $salesUserId,
                'type' => 'invoice_submitted',
                'title' => 'Invoice Baru Menunggu Validasi (INV-00008)',
                'message' => 'Staff Sales mengirim INV-00008 untuk customer Globex Inc. ke Kotak Masuk Validasi.',
                'action_url' => '/accounting/inbox',
                'is_read' => false,
            ]);
            AppNotification::create([
                'user_id' => $accountingUserId,
                'sender_id' => $managerUserId,
                'type' => 'report_validated',
                'title' => 'Laporan Bulanan Disetujui Manager',
                'message' => 'Manager Accounting telah memvalidasi Laporan Bulanan periode Mei 2026.',
                'action_url' => '/accounting/inbox',
                'is_read' => false,
            ]);

            // For Manager Accounting
            AppNotification::create([
                'user_id' => $managerUserId,
                'sender_id' => $accountingUserId,
                'type' => 'report_submitted',
                'title' => 'Laporan Tahunan Baru Menunggu Validasi',
                'message' => 'Staff Accounting mengirim Laporan Detail Tahunan periode 2026 ke Inbox Laporan untuk ditinjau.',
                'action_url' => '/manager/reports',
                'is_read' => false,
            ]);
            AppNotification::create([
                'user_id' => $managerUserId,
                'sender_id' => $salesUserId,
                'type' => 'po_submitted',
                'title' => 'Pengajuan Purchase Order Baru (PO-2026-037)',
                'message' => 'Staff Sales mengajukan Purchase Order PO-2026-037 ke supplier CV. Teknologi Maju senilai Rp 9.300.000 untuk divalidasi.',
                'action_url' => '/purchase-orders',
                'is_read' => false,
            ]);

            // For Staff Sales
            AppNotification::create([
                'user_id' => $salesUserId,
                'sender_id' => $accountingUserId,
                'type' => 'invoice_validated',
                'title' => 'Invoice Tervalidasi (INV-00007)',
                'message' => 'Staff Accounting telah memvalidasi INV-00007 untuk customer Acme Corporation Ltd.',
                'action_url' => '/sales/invoice-rekap',
                'is_read' => false,
            ]);
            AppNotification::create([
                'user_id' => $salesUserId,
                'sender_id' => $accountingUserId,
                'type' => 'return_approved',
                'title' => 'Retur Barang Disetujui (#1)',
                'message' => 'Staff Accounting telah menyetujui retur barang untuk Order ORD-501-G7 senilai Rp 90.000.',
                'action_url' => '/returns',
                'is_read' => false,
            ]);
        }
    }
}
