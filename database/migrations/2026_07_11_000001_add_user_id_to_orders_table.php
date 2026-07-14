<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Orders were "owned" by the mutable, non-unique users.name string
     * (orders.sales_rep), which let a rep hijack another rep's orders by
     * renaming their own account. Ownership now lives in a real FK;
     * sales_rep remains as a display-only snapshot.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('sales_rep')->constrained('users')->nullOnDelete();
        });

        // Backfill existing orders from the legacy sales_rep display name.
        foreach (DB::table('users')->get(['id', 'name']) as $user) {
            DB::table('orders')
                ->where('sales_rep', $user->name)
                ->whereNull('user_id')
                ->update(['user_id' => $user->id]);
        }
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
        });
    }
};
