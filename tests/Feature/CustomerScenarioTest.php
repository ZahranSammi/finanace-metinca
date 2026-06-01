<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

function customerScenarioProvider()
{
    $scenarios = [];
    for ($i = 0; $i < 100; $i++) {
        $type = $i % 5;
        $scenarios["Scenario #$i"] = match ($type) {
            0 => ['payload' => ['name' => 'Valid Customer '.Str::random(5), 'email' => Str::random(10).'@test.com'], 'isValid' => true],
            1 => ['payload' => ['name' => Str::repeat('B', 255), 'email' => Str::random(5).'@longname.com'], 'isValid' => true],
            2 => ['payload' => ['name' => '', 'email' => 'missingname@test.com'], 'isValid' => false], // Name missing
            3 => ['payload' => ['name' => 'Invalid Email', 'email' => 'not-an-email'], 'isValid' => false], // Invalid email
            4 => ['payload' => ['name' => 'Special 😊', 'email' => 'emoji'.rand().'@test.com'], 'isValid' => true],
        };
    }
    return $scenarios;
}

test('mass customer creation scenarios', function (array $payload, bool $isValid) {
    $this->withoutMiddleware();
    $this->withoutExceptionHandling();
    
    $user = User::factory()->create();

    if (!$isValid) {
        $this->expectException(ValidationException::class);
    }

    $response = $this->actingAs($user)->post('/customers', $payload);

    if ($isValid) {
        $response->assertStatus(302);
        $this->assertDatabaseHas('customers', [
            'name' => $payload['name'],
            'email' => $payload['email']
        ]);
    } else {
        $this->assertDatabaseCount('customers', 0);
    }
})->with(customerScenarioProvider());

test('customer update and delete functionality', function () {
    $this->withoutMiddleware();
    $user = User::factory()->create();
    $customer = Customer::create(['name' => 'Old Name', 'email' => 'old@email.com']);

    // Update
    $response = $this->actingAs($user)->put("/customers/{$customer->id}", [
        'name' => 'New Name',
        'email' => 'new@email.com'
    ]);
    
    $response->assertRedirect('/customers');
    $this->assertDatabaseHas('customers', ['id' => $customer->id, 'name' => 'New Name']);

    // Delete
    $response = $this->actingAs($user)->delete("/customers/{$customer->id}");
    $response->assertRedirect('/customers');
    $this->assertDatabaseMissing('customers', ['id' => $customer->id]);
});
