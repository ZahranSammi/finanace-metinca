<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Order;
use App\Models\OrderItem;
use Carbon\Carbon;

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

        // We want data spread across the last few months of 2026:
        // E.g. Jan, Feb, Mar, Apr, May, Jun
        // And we want multiple statuses: 'Pending', 'Submitted', 'Validated', 'Rejected'
        // User 'Staff Sales' is sales_rep for sales@example.com
        
        $ordersData = [
            // January
            [
                'id' => 'ORD-101-A1',
                'date' => '2026-01-15 10:00:00',
                'customer_idx' => 0, // Acme
                'sales_rep' => 'Staff Sales',
                'status' => 'Validated',
                'items' => [
                    ['product_idx' => 0, 'quantity' => 20], // Printer Paper
                    ['product_idx' => 1, 'quantity' => 5],  // Ballpoint Pen
                ]
            ],
            [
                'id' => 'ORD-102-B2',
                'date' => '2026-01-28 14:30:00',
                'customer_idx' => 1, // Globex
                'sales_rep' => 'Staff Sales',
                'status' => 'Validated',
                'items' => [
                    ['product_idx' => 3, 'quantity' => 2],  // Mouse Wireless
                ]
            ],
            // February
            [
                'id' => 'ORD-201-C3',
                'date' => '2026-02-10 11:15:00',
                'customer_idx' => 2, // Initech
                'sales_rep' => 'Staff Sales',
                'status' => 'Validated',
                'items' => [
                    ['product_idx' => 2, 'quantity' => 10], // Stapler Standard
                    ['product_idx' => 0, 'quantity' => 15], // Printer Paper
                ]
            ],
            // March
            [
                'id' => 'ORD-301-D4',
                'date' => '2026-03-05 09:00:00',
                'customer_idx' => 3, // Soylent Corp
                'sales_rep' => 'Staff Sales',
                'status' => 'Validated',
                'items' => [
                    ['product_idx' => 3, 'quantity' => 5], // Mouse Wireless
                ]
            ],
            [
                'id' => 'ORD-302-E5',
                'date' => '2026-03-22 16:45:00',
                'customer_idx' => 4, // Massive Dynamic
                'sales_rep' => 'Staff Sales',
                'status' => 'Rejected',
                'items' => [
                    ['product_idx' => 1, 'quantity' => 12], // Ballpoint Pen
                ]
            ],
            // April
            [
                'id' => 'ORD-401-F6',
                'date' => '2026-04-12 13:20:00',
                'customer_idx' => 5, // Umbrella Corp
                'sales_rep' => 'Staff Sales',
                'status' => 'Validated',
                'items' => [
                    ['product_idx' => 0, 'quantity' => 50], // Printer Paper
                    ['product_idx' => 3, 'quantity' => 10], // Mouse Wireless
                ]
            ],
            // May
            [
                'id' => 'ORD-501-G7',
                'date' => '2026-05-18 10:30:00',
                'customer_idx' => 0, // Acme
                'sales_rep' => 'Staff Sales',
                'status' => 'Validated',
                'items' => [
                    ['product_idx' => 2, 'quantity' => 8],  // Stapler Standard
                    ['product_idx' => 3, 'quantity' => 4],  // Mouse Wireless
                ]
            ],
            [
                'id' => 'ORD-502-H8',
                'date' => '2026-05-25 15:00:00',
                'customer_idx' => 1, // Globex
                'sales_rep' => 'Staff Sales',
                'status' => 'Submitted',
                'items' => [
                    ['product_idx' => 0, 'quantity' => 30], // Printer Paper
                ]
            ],
            // June
            [
                'id' => 'ORD-601-I9',
                'date' => '2026-06-02 11:00:00',
                'customer_idx' => 2, // Initech
                'sales_rep' => 'Staff Sales',
                'status' => 'Pending',
                'items' => [
                    ['product_idx' => 1, 'quantity' => 20], // Ballpoint Pen
                    ['product_idx' => 2, 'quantity' => 5],  // Stapler Standard
                ]
            ],
            [
                'id' => 'ORD-602-J0',
                'date' => '2026-06-15 14:00:00',
                'customer_idx' => 4, // Massive Dynamic
                'sales_rep' => 'Staff Sales',
                'status' => 'Pending',
                'items' => [
                    ['product_idx' => 3, 'quantity' => 8], // Mouse Wireless
                ]
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
            $totalAmount = $subtotal * 1.11;

            $order = Order::create([
                'id' => $oData['id'],
                'date_raised' => Carbon::parse($oData['date']),
                'customer_id' => $customerModels[$oData['customer_idx']]->id,
                'sales_rep' => $oData['sales_rep'],
                'status' => $oData['status'],
                'total_amount' => round($totalAmount, 2),
                'submitted_at' => in_array($oData['status'], ['Submitted', 'Validated']) ? Carbon::parse($oData['date'])->addMinutes(30) : null,
                'validated_at' => $oData['status'] === 'Validated' ? Carbon::parse($oData['date'])->addHours(2) : null,
                'validated_by' => $oData['status'] === 'Validated' ? 3 : null,
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
        }
    }
}
