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

test('newly registered users have no privileged role', function () {
    $user = User::factory()->create(['role' => 'pending']);
    $this->actingAs($user);

    // A pending user cannot see business data or reach any mutating route.
    $this->get('/orders')->assertStatus(403);
    $this->get('/customers')->assertStatus(403);
    $this->get('/products')->assertStatus(403);
    $this->get('/orders/create')->assertStatus(403);
    $this->post('/orders', [])->assertStatus(403);

    // The dashboard shows the awaiting-approval page instead of data.
    $this->get('/dashboard')->assertOk();
});

test('sales rep can create a new order with server-side pricing and identity', function () {
    $user = User::factory()->create(['role' => 'staff_sales', 'name' => 'Real Rep']);
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
        'price' => 100.00,
    ]);

    // Client tries to spoof the rep and tamper the price; both must be ignored.
    $response = $this->post('/orders', [
        'customerId' => $customer->id,
        'salesRep' => 'Someone Else',
        'items' => [
            ['productId' => $product->id, 'quantity' => 2, 'price' => 1.00],
        ],
    ]);

    $response->assertRedirect('/orders');

    // Ownership (user_id) and sales_rep come from the authenticated user,
    // not the request.
    $this->assertDatabaseHas('orders', [
        'customer_id' => $customer->id,
        'sales_rep' => 'Real Rep',
        'user_id' => $user->id,
    ]);

    // Line price is taken from the product (100), not the posted 1.00.
    $this->assertDatabaseHas('order_items', [
        'product_id' => $product->id,
        'quantity' => 2,
        'price' => 100.00,
    ]);
});

test('sales rep can edit their own order', function () {
    $user = User::factory()->create(['role' => 'staff_sales', 'name' => 'Real Rep']);
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
        'price' => 55000,
    ]);

    $order = \App\Models\Order::create([
        'id' => 'ORD-123-A1',
        'date_raised' => now(),
        'customer_id' => $customer->id,
        'sales_rep' => 'Real Rep',
        'user_id' => $user->id,
        'status' => 'Pending',
        'total_amount' => 1200.00,
    ]);

    $response = $this->put("/orders/{$order->id}", [
        'customerId' => $customer->id,
        'salesRep' => 'Updated Rep',
        'items' => [
            ['productId' => $product->id, 'quantity' => 10, 'price' => 450.00],
        ],
    ]);

    $response->assertRedirect('/orders');

    $this->assertDatabaseHas('orders', [
        'id' => $order->id,
        'sales_rep' => 'Real Rep',
    ]);
});

test('sales rep cannot edit or delete another reps order', function () {
    $user = User::factory()->create(['role' => 'staff_sales', 'name' => 'Real Rep']);
    $this->actingAs($user);

    $customer = \App\Models\Customer::create(['name' => 'Acme Corp', 'email' => 'billing@acme.com']);
    $otherRep = User::factory()->create(['role' => 'staff_sales', 'name' => 'Another Rep']);

    $order = \App\Models\Order::create([
        'id' => 'ORD-999-Z9',
        'date_raised' => now(),
        'customer_id' => $customer->id,
        'sales_rep' => 'Another Rep',
        'user_id' => $otherRep->id,
        'status' => 'Pending',
        'total_amount' => 1200.00,
    ]);

    $this->get("/orders/{$order->id}/edit")->assertStatus(403);
    $this->delete("/orders/{$order->id}")->assertStatus(403);

    $this->assertDatabaseHas('orders', ['id' => $order->id]);
});

test('renaming yourself to another reps name does not grant access to their orders', function () {
    $victim = User::factory()->create(['role' => 'staff_sales', 'name' => 'Victim Rep']);
    $attacker = User::factory()->create(['role' => 'staff_sales', 'name' => 'Victim Rep']);
    $this->actingAs($attacker);

    $customer = \App\Models\Customer::create(['name' => 'Acme Corp', 'email' => 'billing@acme.com']);

    $order = \App\Models\Order::create([
        'id' => 'ORD-777-B7',
        'date_raised' => now(),
        'customer_id' => $customer->id,
        'sales_rep' => 'Victim Rep',
        'user_id' => $victim->id,
        'status' => 'Pending',
        'total_amount' => 500.00,
    ]);

    // Despite the identical display name, ownership is the user_id FK.
    $this->get("/orders/{$order->id}/edit")->assertStatus(403);
    $this->delete("/orders/{$order->id}")->assertStatus(403);
});

test('sales rep can delete their own order', function () {
    $user = User::factory()->create(['role' => 'staff_sales', 'name' => 'Real Rep']);
    $this->actingAs($user);

    $customer = \App\Models\Customer::create(['name' => 'Acme Corp', 'email' => 'billing@acme.com']);

    $order = \App\Models\Order::create([
        'id' => 'ORD-123-A1',
        'date_raised' => now(),
        'customer_id' => $customer->id,
        'sales_rep' => 'Real Rep',
        'user_id' => $user->id,
        'status' => 'Pending',
        'total_amount' => 1200.00,
    ]);

    $response = $this->delete("/orders/{$order->id}");
    $response->assertRedirect('/orders');

    $this->assertDatabaseMissing('orders', [
        'id' => $order->id,
    ]);
});
