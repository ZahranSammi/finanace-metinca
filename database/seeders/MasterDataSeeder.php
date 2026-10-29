<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Customer;
use App\Models\Plant;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Supplier;
use App\Models\User;
use App\Support\UserRole;
use Illuminate\Database\Seeder;

class MasterDataSeeder extends Seeder
{
    public function run(): void
    {
        // ── Customers ──────────────────────────────────────────────────────────
        $customers = [
            ['name' => 'Acme Corporation Ltd.', 'email' => 'billing@acme.com'],
            ['name' => 'Globex Inc.',            'email' => 'procurement@globex.com'],
            ['name' => 'Initech Solutions',      'email' => 'contact@initech.com'],
            ['name' => 'Soylent Corp',           'email' => 'sales@soylent.com'],
            ['name' => 'Massive Dynamic',        'email' => 'info@massivedynamic.com'],
            ['name' => 'Umbrella Corp',          'email' => 'orders@umbrellacorp.com'],
        ];

        foreach ($customers as $c) {
            Customer::firstOrCreate(['email' => $c['email']], $c);
        }

        // ── Products ───────────────────────────────────────────────────────────
        $products = [
            ['code' => 'OFF-001', 'name' => 'Printer Paper A4 (Ream)',   'category' => 'Office Supplies', 'unit' => 'Ream', 'stock' => 150, 'min' => 50,  'location' => 'Gudang A-1', 'price' => 55000],
            ['code' => 'OFF-002', 'name' => 'Ballpoint Pen (Box)',        'category' => 'Office Supplies', 'unit' => 'Box',  'stock' => 80,  'min' => 20,  'location' => 'Gudang A-1', 'price' => 28000],
            ['code' => 'OFF-003', 'name' => 'Stapler Standard',          'category' => 'Office Supplies', 'unit' => 'Unit', 'stock' => 15,  'min' => 5,   'location' => 'Gudang A-2', 'price' => 45000],
            ['code' => 'ELE-001', 'name' => 'Mouse Wireless Logitech',   'category' => 'Electronics',     'unit' => 'Unit', 'stock' => 45,  'min' => 10,  'location' => 'Gudang B-1', 'price' => 185000],
            ['code' => 'ELE-002', 'name' => 'Keyboard USB Standard',     'category' => 'Electronics',     'unit' => 'Unit', 'stock' => 30,  'min' => 10,  'location' => 'Gudang B-1', 'price' => 125000],
            ['code' => 'ELE-003', 'name' => 'HDMI Cable 2m',             'category' => 'Electronics',     'unit' => 'Pcs',  'stock' => 60,  'min' => 15,  'location' => 'Gudang B-2', 'price' => 75000],
            ['code' => 'FUR-001', 'name' => 'Office Chair Ergonomic',    'category' => 'Furniture',       'unit' => 'Unit', 'stock' => 10,  'min' => 3,   'location' => 'Gudang C-1', 'price' => 1250000],
            ['code' => 'FUR-002', 'name' => 'Standing Desk Adjustable',  'category' => 'Furniture',       'unit' => 'Unit', 'stock' => 5,   'min' => 2,   'location' => 'Gudang C-1', 'price' => 2800000],
        ];

        foreach ($products as $p) {
            Product::firstOrCreate(['code' => $p['code']], $p);
        }

        // ── Branches & Plants ──────────────────────────────────────────────────
        $branches = [
            'Jakarta' => ['Plant A Jakarta', 'Plant B Jakarta'],
            'Surabaya' => ['Plant A Surabaya'],
            'Bandung' => ['Plant A Bandung'],
        ];

        foreach ($branches as $branchName => $plantNames) {
            $branch = Branch::firstOrCreate(['name' => $branchName]);
            foreach ($plantNames as $plantName) {
                Plant::firstOrCreate([
                    'branch_id' => $branch->id,
                    'name' => $plantName,
                ]);
            }
        }

        // ── Suppliers ──────────────────────────────────────────────────────────
        $suppliers = [
            'CV. Teknologi Maju',
            'PT. Furniture Nusantara',
            'PT. Sumber Jaya Abadi',
            'PT. Safety Prima',
            'PT Baja Pratama',
            'PT Logam Abadi',
        ];
        foreach ($suppliers as $name) {
            Supplier::firstOrCreate(['name' => $name]);
        }

        // ── Purchase Orders & Items (Sama seperti modul PO ADI) ────────────────
        $dbProducts = Product::all()->keyBy('code');
        $dbSuppliers = Supplier::all()->keyBy('name');
        $dbPlants = Plant::all();

        $accountingUser = User::where('role', UserRole::ACCOUNTING)->first();
        $salesUser = User::where('role', UserRole::SALES)->where('email', 'sales@example.com')->first()
            ?? User::where('role', UserRole::SALES)->first();
        $managerUser = User::where('role', UserRole::MANAGER)->first();

        if (PurchaseOrder::count() === 0 && $dbProducts->count() > 0 && $dbSuppliers->count() > 0 && $dbPlants->count() > 0) {
            $samplePOs = [
                [
                    'po_number' => 'PO-2026-033',
                    'supplier' => 'CV. Teknologi Maju',
                    'plant_idx' => 0,
                    'date' => now()->subDays(18)->toDateString(),
                    'expected_date' => now()->subDays(11)->toDateString(),
                    'status' => 'Received',
                    'payment_status' => 'paid',
                    'created_by' => $accountingUser?->id,
                    'approved_by' => $managerUser?->id,
                    'approved_at' => now()->subDays(17),
                    'notes' => 'Pengadaan perangkat elektronik operasional Plant A Jakarta.',
                    'items' => [
                        ['code' => 'ELE-001', 'qty' => 40, 'price' => 185000],
                        ['code' => 'ELE-002', 'qty' => 56, 'price' => 125000],
                    ],
                ],
                [
                    'po_number' => 'PO-2026-034',
                    'supplier' => 'PT. Sumber Jaya Abadi',
                    'plant_idx' => 1,
                    'date' => now()->subDays(14)->toDateString(),
                    'expected_date' => now()->subDays(7)->toDateString(),
                    'status' => 'Received',
                    'payment_status' => 'paid',
                    'created_by' => $accountingUser?->id,
                    'approved_by' => $managerUser?->id,
                    'approved_at' => now()->subDays(13),
                    'notes' => 'Restock ATK dan perlengkapan kantor bulanan.',
                    'items' => [
                        ['code' => 'OFF-001', 'qty' => 100, 'price' => 55000],
                        ['code' => 'OFF-002', 'qty' => 50, 'price' => 28000],
                        ['code' => 'OFF-003', 'qty' => 40, 'price' => 45000],
                    ],
                ],
                [
                    'po_number' => 'PO-2026-035',
                    'supplier' => 'PT. Sumber Jaya Abadi',
                    'plant_idx' => 2,
                    'date' => now()->subDays(9)->toDateString(),
                    'expected_date' => now()->subDays(2)->toDateString(),
                    'status' => 'Approved',
                    'payment_status' => 'unpaid',
                    'created_by' => $accountingUser?->id,
                    'approved_by' => $managerUser?->id,
                    'approved_at' => now()->subDays(8),
                    'notes' => 'Pengadaan kabel HDMI dan aksesoris ruang kontrol Surabaya.',
                    'items' => [
                        ['code' => 'ELE-003', 'qty' => 60, 'price' => 75000],
                        ['code' => 'OFF-001', 'qty' => 35, 'price' => 55000],
                    ],
                ],
                [
                    'po_number' => 'PO-2026-036',
                    'supplier' => 'PT. Furniture Nusantara',
                    'plant_idx' => 0,
                    'date' => now()->subDays(6)->toDateString(),
                    'expected_date' => now()->addDays(4)->toDateString(),
                    'status' => 'Approved',
                    'payment_status' => 'unpaid',
                    'created_by' => $accountingUser?->id,
                    'approved_by' => $managerUser?->id,
                    'approved_at' => now()->subDays(5),
                    'notes' => 'Pengadaan kursi ergonomis & meja kerja divisi engineering.',
                    'items' => [
                        ['code' => 'FUR-001', 'qty' => 6, 'price' => 1250000],
                        ['code' => 'FUR-002', 'qty' => 2, 'price' => 2500000],
                    ],
                ],
                [
                    'po_number' => 'PO-2026-037',
                    'supplier' => 'CV. Teknologi Maju',
                    'plant_idx' => 3,
                    'date' => now()->subDays(2)->toDateString(),
                    'expected_date' => now()->addDays(5)->toDateString(),
                    'status' => 'Submitted',
                    'payment_status' => 'unpaid',
                    'created_by' => $salesUser?->id ?? $accountingUser?->id,
                    'approved_by' => null,
                    'approved_at' => null,
                    'notes' => 'Menunggu persetujuan Manager Accounting untuk pemenuhan pesanan cabang Bandung.',
                    'items' => [
                        ['code' => 'ELE-001', 'qty' => 30, 'price' => 185000],
                        ['code' => 'ELE-002', 'qty' => 30, 'price' => 125000],
                    ],
                ],
                [
                    'po_number' => 'PO-2026-038',
                    'supplier' => 'PT. Safety Prima',
                    'plant_idx' => 0,
                    'date' => now()->toDateString(),
                    'expected_date' => now()->addDays(7)->toDateString(),
                    'status' => 'Draft',
                    'payment_status' => 'unpaid',
                    'created_by' => $accountingUser?->id,
                    'approved_by' => null,
                    'approved_at' => null,
                    'notes' => 'Draft PO perlengkapan gudang & administrasi.',
                    'items' => [
                        ['code' => 'OFF-001', 'qty' => 50, 'price' => 55000],
                        ['code' => 'OFF-003', 'qty' => 40, 'price' => 45000],
                    ],
                ],
            ];

            foreach ($samplePOs as $poData) {
                $supplier = $dbSuppliers[$poData['supplier']] ?? $dbSuppliers->first();
                $plant = $dbPlants[$poData['plant_idx']] ?? $dbPlants->first();

                $total = 0;
                foreach ($poData['items'] as $row) {
                    $total += $row['qty'] * $row['price'];
                }

                $po = PurchaseOrder::create([
                    'po_number' => $poData['po_number'],
                    'supplier_id' => $supplier->id,
                    'plant_id' => $plant->id,
                    'date' => $poData['date'],
                    'expected_date' => $poData['expected_date'],
                    'status' => $poData['status'],
                    'payment_status' => $poData['payment_status'],
                    'total_amount' => $total,
                    'created_by' => $poData['created_by'],
                    'approved_by' => $poData['approved_by'],
                    'approved_at' => $poData['approved_at'],
                    'notes' => $poData['notes'],
                ]);

                foreach ($poData['items'] as $row) {
                    $prod = $dbProducts[$row['code']] ?? $dbProducts->first();
                    PurchaseOrderItem::create([
                        'purchase_order_id' => $po->id,
                        'product_id' => $prod->id,
                        'quantity' => $row['qty'],
                        'unit_price' => $row['price'],
                        'subtotal' => $row['qty'] * $row['price'],
                    ]);
                }
            }
        }
    }
}
