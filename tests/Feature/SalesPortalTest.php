<?php

use App\Models\User;

test('guests are redirected from sales portal routes', function () {
    $this->get('/orders')->assertRedirect(route('login'));
    $this->get('/orders/create')->assertRedirect(route('login'));
    $this->get('/pipeline')->assertRedirect(route('login'));
    $this->get('/customers')->assertRedirect(route('login'));
    $this->get('/analytics')->assertRedirect(route('login'));
});

test('authenticated users can access sales portal pages', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->get('/orders')->assertOk();
    $this->get('/orders/create')->assertOk();
    $this->get('/pipeline')->assertOk();
    $this->get('/customers')->assertOk();
    $this->get('/analytics')->assertOk();
});

test('authenticated users can create a new order', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->post('/orders', [
        'customerId' => 1,
        'salesRep' => 'Test Rep',
        'items' => [
            ['productId' => 1, 'quantity' => 2, 'price' => 1200.00]
        ]
    ]);

    $response->assertRedirect('/orders');
    $this->assertTrue(session()->has('orders'));
    
    $orders = session()->get('orders');
    $this->assertCount(7, $orders); // default 6 mock orders + 1 new order
    $this->assertEquals('Test Rep', $orders[0]['sales_rep']);
});

test('authenticated users can edit an existing order', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    // Initial page load to set up session orders
    $this->get('/orders')->assertOk();

    $orders = session()->get('orders');
    $orderId = $orders[0]['id'];

    $this->get("/orders/{$orderId}/edit")->assertOk();

    $response = $this->put("/orders/{$orderId}", [
        'customerId' => 2,
        'salesRep' => 'Updated Rep',
        'items' => [
            ['productId' => 2, 'quantity' => 10, 'price' => 450.00]
        ]
    ]);

    $response->assertRedirect('/orders');
    
    $updatedOrders = session()->get('orders');
    $updatedOrder = collect($updatedOrders)->firstWhere('id', $orderId);
    $this->assertEquals('Updated Rep', $updatedOrder['sales_rep']);
});

test('authenticated users can delete an order', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    // Set up session orders
    $this->get('/orders')->assertOk();

    $orders = session()->get('orders');
    $orderId = $orders[0]['id'];

    $response = $this->delete("/orders/{$orderId}");
    $response->assertRedirect('/orders');

    $remainingOrders = session()->get('orders');
    $this->assertCount(5, $remainingOrders); // 6 default - 1 deleted
    $this->assertNull(collect($remainingOrders)->firstWhere('id', $orderId));
});
