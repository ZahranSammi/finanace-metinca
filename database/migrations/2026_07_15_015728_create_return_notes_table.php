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
        Schema::create('return_notes', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['credit_internal', 'debit_external']);
            $table->string('reference_id')->nullable(); // PO ID or Order ID
            $table->foreignId('customer_id')->nullable()->constrained()->onDelete('set null');
            $table->date('date');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('return_notes');
    }
};
