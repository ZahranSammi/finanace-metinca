<?php

namespace Database\Seeders;

use App\Models\User;
use App\Support\UserRole;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Never seed well-known credentials into a production database.
        if (app()->environment('production')) {
            return;
        }

        $users = [
            ['name' => 'Test User', 'email' => 'test@example.com', 'role' => UserRole::SALES],
            ['name' => 'Staff Sales', 'email' => 'sales@example.com', 'role' => UserRole::SALES],
            ['name' => 'Staff Accounting', 'email' => 'accounting@example.com', 'role' => UserRole::ACCOUNTING],
            ['name' => 'Manager User', 'email' => 'manager@example.com', 'role' => UserRole::MANAGER],
        ];

        foreach ($users as $attributes) {
            if (User::where('email', $attributes['email'])->exists()) {
                continue;
            }

            // forceCreate because 'role' is intentionally not mass assignable.
            User::forceCreate([
                ...$attributes,
                'email_verified_at' => now(),
                'password' => 'password',
            ]);
        }
    }
}
