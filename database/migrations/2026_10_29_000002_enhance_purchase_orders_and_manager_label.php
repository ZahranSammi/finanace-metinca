<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->string('po_number')->nullable()->unique()->after('id');
            $table->date('expected_date')->nullable()->after('date');
            $table->text('notes')->nullable()->after('status');
            $table->foreignId('created_by')->nullable()->after('notes')->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable()->after('approved_by');
            $table->text('rejection_notes')->nullable()->after('approved_at');
            $table->string('payment_status')->default('unpaid')->after('rejection_notes');
        });

        // Update existing Manager User label to Manager Accounting
        DB::table('users')
            ->where('email', 'manager@example.com')
            ->where('name', 'Manager User')
            ->update(['name' => 'Manager Accounting']);
    }

    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropForeign(['approved_by']);
            $table->dropColumn([
                'po_number',
                'expected_date',
                'notes',
                'created_by',
                'approved_by',
                'approved_at',
                'rejection_notes',
                'payment_status',
            ]);
        });
    }
};

