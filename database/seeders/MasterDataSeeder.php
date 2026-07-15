<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Branch;
use App\Models\Plant;
use App\Models\Supplier;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;

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
        $suppliers = ['PT Baja Pratama', 'PT Logam Abadi', 'PT Energi Jaya', 'CV Teknik Mandiri'];
        foreach ($suppliers as $name) {
            Supplier::firstOrCreate(['name' => $name]);
        }

        // ── Purchase Orders & Items ────────────────────────────────────────────
        $dbProducts = Product::all();
        $dbSuppliers = Supplier::all();
        $dbPlants = Plant::all();

        if (PurchaseOrder::count() === 0 && $dbProducts->count() > 0 && $dbSuppliers->count() > 0 && $dbPlants->count() > 0) {
            // PO 1
            $po1 = PurchaseOrder::create([
                'supplier_id' => $dbSuppliers->first()->id,
                'plant_id' => $dbPlants->first()->id,
                'date' => now()->subDays(10)->format('Y-m-d'),
                'status' => 'Approved',
                'total_amount' => 0,
            ]);
            PurchaseOrderItem::create([
                'purchase_order_id' => $po1->id,
                'product_id' => $dbProducts->where('code', 'FUR-001')->first()->id ?? $dbProducts->first()->id,
                'quantity' => 2,
                'unit_price' => 1250000,
                'subtotal' => 2500000,
            ]);
            $po1->update(['total_amount' => 2500000]);

            // PO 2
            $po2 = PurchaseOrder::create([
                'supplier_id' => $dbSuppliers->skip(1)->first()->id,
                'plant_id' => $dbPlants->skip(1)->first()->id,
                'date' => now()->subDays(5)->format('Y-m-d'),
                'status' => 'Pending',
                'total_amount' => 0,
            ]);
            PurchaseOrderItem::create([
                'purchase_order_id' => $po2->id,
                'product_id' => $dbProducts->where('code', 'ELE-002')->first()->id ?? $dbProducts->first()->id,
                'quantity' => 10,
                'unit_price' => 125000,
                'subtotal' => 1250000,
            ]);
            $po2->update(['total_amount' => 1250000]);
        }
    }
}
