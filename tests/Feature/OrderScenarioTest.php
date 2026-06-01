<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Product;
use App\Models\User;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

function scenarioProvider()
{
    $scenarios = [];
    for ($i = 0; $i < 100; $i++) {
        $type = $i % 5;
        $scenarios["Scenario #$i"] = match ($type) {
            0 => ['payload' => ['salesRep' => 'Valid Rep '.Str::random(5), 'items' => [['quantity' => 2, 'price' => 50]]], 'isValid' => true],
            1 => ['payload' => ['salesRep' => Str::repeat('A', 255), 'items' => [['quantity' => 1, 'price' => 10]]], 'isValid' => true],
            2 => ['payload' => ['salesRep' => 'Invalid Rep', 'items' => []], 'isValid' => false],
            3 => ['payload' => ['salesRep' => 'Big Order', 'items' => [['quantity' => 9999, 'price' => 1]]], 'isValid' => true],
            4 => ['payload' => ['salesRep' => 'Special Characters !@#', 'items' => [['quantity' => 1, 'price' => 5]]], 'isValid' => true],
        };
    }
    return $scenarios;
}

test('mass order creation scenarios', function (array $payload, bool $isValid) {
    $this->withoutMiddleware();
    $this->withoutExceptionHandling();
    
    $user = User::factory()->create();
    $customer = Customer::create(['name' => 'Test Customer', 'email' => Str::random(10).'@test.com']);
    $product = Product::create([
        'code' => 'PROD-'.Str::random(5),
        'name' => 'Test Product',
        'category' => 'Test',
        'unit' => 'Unit',
        'price' => 10.00
    ]);

    $payload['customerId'] = $customer->id;
    if (!empty($payload['items'])) {
        foreach ($payload['items'] as &$item) {
            $item['productId'] = $product->id;
        }
    }

    try {
        $response = $this->actingAs($user)->post('/orders', $payload);
        
        if (!$isValid) {
            $this->fail('Validation should have failed for this scenario.');
        }

        $response->assertStatus(302);
        $this->assertDatabaseHas('orders', [
            'customer_id' => $customer->id,
            'sales_rep' => $payload['salesRep']
        ]);
    } catch (ValidationException $e) {
        if ($isValid) {
            throw $e;
        }
        $this->assertDatabaseCount('orders', 0);
    }
})->with(scenarioProvider());
