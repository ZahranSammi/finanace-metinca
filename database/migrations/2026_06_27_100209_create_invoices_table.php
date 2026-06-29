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
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('order_id');
            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            $table->enum('invoice_type', ['tua_lokal', 'inter_expor']);
            $table->decimal('subtotal', 15, 2);
            $table->decimal('tax_percent', 5, 2)->default(0); // 11 for tua_lokal, 0 for inter_expor
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('dp_amount', 15, 2)->nullable()->default(0);
            $table->decimal('total_amount', 15, 2);
            $table->string('status')->default('Draft');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
