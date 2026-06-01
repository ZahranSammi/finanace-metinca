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

        foreach ($customers as $c) {
            Customer::create($c);
        }

        $products = [
            ['code' => 'OFF-001', 'name' => 'Printer Paper A4 (Ream)', 'category' => 'Office Supplies', 'unit' => 'Ream', 'stock' => 150, 'min' => 50, 'location' => 'Gudang A-1', 'price' => 55000],
            ['code' => 'OFF-002', 'name' => 'Ballpoint Pen (Box)', 'category' => 'Office Supplies', 'unit' => 'Box', 'stock' => 8, 'min' => 28, 'location' => 'Gudang A-1', 'price' => 28000],
            ['code' => 'OFF-003', 'name' => 'Stapler Standard', 'category' => 'Office Supplies', 'unit' => 'Unit', 'stock' => 0, 'min' => 5, 'location' => 'Gudang A-2', 'price' => 45000],
            ['code' => 'ELE-001', 'name' => 'Mouse Wireless Logitech', 'category' => 'Electronics', 'unit' => 'Unit', 'stock' => 45, 'min' => 10, 'location' => 'Gudang B-1', 'price' => 185000],
        ];

        foreach ($products as $p) {
            Product::create($p);
        }

        $order = Order::create([
            'id' => 'ORD-892-A1',
            'date_raised' => Carbon::now(),
            'customer_id' => 1,
            'sales_rep' => 'J. Smith',
            'status' => 'Pending',
            'total_amount' => 14500.00,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => 1,
            'quantity' => 10,
            'price' => 1200.00,
        ]);
    }
}
