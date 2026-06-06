<?php

use App\Models\User;

test('guests are redirected from sales portal routes', function () {
    $this->get('/orders')->assertRedirect(route('login'));
    $this->get('/orders/create')->assertRedirect(route('login'));
    $this->get('/pipeline')->assertRedirect(route('login'));
    $this->get('/customers')->assertRedirect(route('login'));
    $this->get('/analytics')->assertRedirect(route('login'));
});

test('authenticated users can access sales portal pages according to roles', function () {
    $salesUser = User::factory()->create(['role' => 'staff_sales']);
    $this->actingAs($salesUser);

    $this->get('/orders')->assertOk();
    $this->get('/orders/create')->assertOk();
    $this->get('/pipeline')->assertOk();
    $this->get('/customers')->assertOk();
    $this->get('/analytics')->assertStatus(403);
    $this->get('/accounting/inbox')->assertStatus(403);

    $managerUser = User::factory()->create(['role' => 'manager']);
    $this->actingAs($managerUser);
    $this->get('/analytics')->assertOk();
    $this->get('/orders/create')->assertStatus(403);

    $accountingUser = User::factory()->create(['role' => 'staff_accounting']);
    $this->actingAs($accountingUser);
    $this->get('/accounting/inbox')->assertOk();
    $this->get('/analytics')->assertStatus(403);
});

test('authenticated users can create a new order', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $customer = \App\Models\Customer::create(['name' => 'Acme Corp', 'email' => 'billing@acme.com']);
    $product = \App\Models\Product::create([
        'code' => 'OFF-001',
        'name' => 'Printer Paper A4 (Ream)',
        'category' => 'Office Supplies',
        'unit' => 'Ream',
        'stock' => 150,
        'min' => 50,
        'location' => 'Gudang A-1',
        'price' => 55000
    ]);

    $response = $this->post('/orders', [
        'customerId' => $customer->id,
        'salesRep' => 'Test Rep',
        'items' => [
            ['productId' => $product->id, 'quantity' => 2, 'price' => 1200.00]
        ]
    ]);

    $response->assertRedirect('/orders');
    
    $this->assertDatabaseHas('orders', [
        'customer_id' => $customer->id,
        'sales_rep' => 'Test Rep',
    ]);
});

test('authenticated users can edit an existing order', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $customer = \App\Models\Customer::create(['name' => 'Acme Corp', 'email' => 'billing@acme.com']);
    $product = \App\Models\Product::create([
        'code' => 'OFF-001',
        'name' => 'Printer Paper A4 (Ream)',
        'category' => 'Office Supplies',
        'unit' => 'Ream',
        'stock' => 150,
        'min' => 50,
        'location' => 'Gudang A-1',
        'price' => 55000
    ]);
    
    $order = \App\Models\Order::create([
        'id' => 'ORD-123-A1',
        'date_raised' => now(),
        'customer_id' => $customer->id,
        'sales_rep' => 'Test Rep',
        'status' => 'Pending',
        'total_amount' => 1200.00,
    ]);

    $response = $this->put("/orders/{$order->id}", [
        'customerId' => $customer->id,
        'salesRep' => 'Updated Rep',
        'items' => [
            ['productId' => $product->id, 'quantity' => 10, 'price' => 450.00]
        ]
    ]);

    $response->assertRedirect('/orders');
    
    $this->assertDatabaseHas('orders', [
        'id' => $order->id,
        'sales_rep' => 'Updated Rep',
    ]);
});

test('authenticated users can delete an order', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $customer = \App\Models\Customer::create(['name' => 'Acme Corp', 'email' => 'billing@acme.com']);
    
    $order = \App\Models\Order::create([
        'id' => 'ORD-123-A1',
        'date_raised' => now(),
        'customer_id' => $customer->id,
        'sales_rep' => 'Test Rep',
        'status' => 'Pending',
        'total_amount' => 1200.00,
    ]);

    $response = $this->delete("/orders/{$order->id}");
    $response->assertRedirect('/orders');

    $this->assertDatabaseMissing('orders', [
        'id' => $order->id,
    ]);
});
