<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Default Test User (Sales)
        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'role' => 'staff_sales',
        ]);

        // Staff Sales User
        User::factory()->create([
            'name' => 'Staff Sales',
            'email' => 'sales@example.com',
            'role' => 'staff_sales',
        ]);

        // Staff Accounting User
        User::factory()->create([
            'name' => 'Staff Accounting',
            'email' => 'accounting@example.com',
            'role' => 'staff_accounting',
        ]);

        // Manager User
        User::factory()->create([
            'name' => 'Manager User',
            'email' => 'manager@example.com',
            'role' => 'manager',
        ]);
    }
}
