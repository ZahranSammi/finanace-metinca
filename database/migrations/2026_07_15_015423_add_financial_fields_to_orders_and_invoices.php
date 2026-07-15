<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->enum('currency', ['IDR', 'EUR', 'USD'])->default('IDR')->after('status');
            $table->decimal('exchange_rate', 15, 6)->default(1)->after('currency');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->enum('currency', ['IDR', 'EUR', 'USD'])->default('IDR')->after('status');
            $table->decimal('exchange_rate', 15, 6)->default(1)->after('currency');
            $table->date('due_date')->nullable()->after('exchange_rate');
            $table->date('delivery_date')->nullable()->after('due_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['currency', 'exchange_rate']);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['currency', 'exchange_rate', 'due_date', 'delivery_date']);
        });
    }
};
