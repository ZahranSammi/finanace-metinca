<?php

use App\Models\User;
use App\Models\Customer;
use App\Models\Order;

test('sales rep can submit pending order to accounting', function () {
    $sales = User::factory()->create(['role' => 'staff_sales', 'name' => 'Sales Representative']);
    $customer = Customer::create(['name' => 'Acme Corp', 'email' => 'acme@example.com']);
    
    $order = Order::create([
        'id' => 'ORD-TEST-001',
        'date_raised' => now(),
        'customer_id' => $customer->id,
        'sales_rep' => 'Sales Representative',
        'status' => 'Pending',
        'total_amount' => 150.00,
    ]);

    $this->actingAs($sales);
    
    $response = $this->post(route('orders.submit', $order->id));
    $response->assertRedirect(route('orders.index'));

    $this->assertDatabaseHas('orders', [
        'id' => 'ORD-TEST-001',
        'status' => 'Submitted',
    ]);
});

test('sales rep cannot edit or delete a submitted order', function () {
    $sales = User::factory()->create(['role' => 'staff_sales', 'name' => 'Sales Representative']);
    $customer = Customer::create(['name' => 'Acme Corp', 'email' => 'acme@example.com']);
    
    $order = Order::create([
        'id' => 'ORD-TEST-002',
        'date_raised' => now(),
        'customer_id' => $customer->id,
        'sales_rep' => 'Sales Representative',
        'status' => 'Submitted',
        'total_amount' => 150.00,
    ]);

    $this->actingAs($sales);

    $response = $this->get(route('orders.edit', $order->id));
    $response->assertStatus(403);

    $response = $this->put(route('orders.update', $order->id), [
        'customerId' => $customer->id,
        'salesRep' => 'Sales Representative',
        'items' => [
            ['productId' => 1, 'quantity' => 1, 'price' => 10.00]
        ]
    ]);
    $response->assertStatus(403);

    $response = $this->delete(route('orders.destroy', $order->id));
    $response->assertStatus(403);
});

test('accounting staff can validate a submitted order', function () {
    $accounting = User::factory()->create(['role' => 'staff_accounting']);
    $customer = Customer::create(['name' => 'Acme Corp', 'email' => 'acme@example.com']);
    
    $order = Order::create([
        'id' => 'ORD-TEST-003',
        'date_raised' => now(),
        'customer_id' => $customer->id,
        'sales_rep' => 'Sales Representative',
        'status' => 'Submitted',
        'total_amount' => 250.00,
    ]);

    $this->actingAs($accounting);
    
    $response = $this->post(route('accounting.validate', $order->id), [
        'notes' => 'All details correct.'
    ]);
    $response->assertRedirect(route('accounting.inbox'));

    $this->assertDatabaseHas('orders', [
        'id' => 'ORD-TEST-003',
        'status' => 'Validated',
        'validated_by' => $accounting->id,
        'validation_notes' => 'All details correct.',
    ]);
});

test('accounting staff can reject a submitted order with notes', function () {
    $accounting = User::factory()->create(['role' => 'staff_accounting']);
    $customer = Customer::create(['name' => 'Acme Corp', 'email' => 'acme@example.com']);
    
    $order = Order::create([
        'id' => 'ORD-TEST-004',
        'date_raised' => now(),
        'customer_id' => $customer->id,
        'sales_rep' => 'Sales Representative',
        'status' => 'Submitted',
        'total_amount' => 250.00,
    ]);

    $this->actingAs($accounting);
    
    $response = $this->post(route('accounting.reject', $order->id), [
        'notes' => 'Wrong pricing.'
    ]);
    $response->assertRedirect(route('accounting.inbox'));

    $this->assertDatabaseHas('orders', [
        'id' => 'ORD-TEST-004',
        'status' => 'Rejected',
        'validation_notes' => 'Wrong pricing.',
    ]);
});

test('manager can export validated sales report as CSV', function () {
    $manager = User::factory()->create(['role' => 'manager']);
    
    $this->actingAs($manager);

    $response = $this->get(route('analytics.export', [
        'start_date' => now()->subDay()->format('Y-m-d'),
        'end_date' => now()->addDay()->format('Y-m-d'),
    ]));

    $response->assertOk();
    $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
});
