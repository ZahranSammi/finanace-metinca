<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SalesPortalController;
use App\Http\Controllers\InvoiceController;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [SalesPortalController::class, 'dashboard'])->name('dashboard');
    
    // View actions (open to all authenticated users)
    Route::get('orders', [SalesPortalController::class, 'orders'])->name('orders.index');
    Route::get('customers', [SalesPortalController::class, 'customers'])->name('customers.index');

    // Sales actions (restricted to Sales Reps)
    Route::middleware(['role:staff_sales'])->group(function () {
        Route::get('orders/create', [SalesPortalController::class, 'createOrder'])->name('orders.create');
        Route::post('orders', [SalesPortalController::class, 'storeOrder'])->name('orders.store');
        Route::get('orders/{id}/edit', [SalesPortalController::class, 'editOrder'])->name('orders.edit');
        Route::put('orders/{id}', [SalesPortalController::class, 'updateOrder'])->name('orders.update');
        Route::delete('orders/{id}', [SalesPortalController::class, 'destroyOrder'])->name('orders.destroy');
        Route::post('orders/{id}/submit', [SalesPortalController::class, 'submitOrder'])->name('orders.submit');

        Route::get('pipeline', [SalesPortalController::class, 'pipeline'])->name('pipeline');

        Route::get('customers/create', [SalesPortalController::class, 'createCustomer'])->name('customers.create');
        Route::post('customers', [SalesPortalController::class, 'storeCustomer'])->name('customers.store');
        Route::get('customers/{id}/edit', [SalesPortalController::class, 'editCustomer'])->name('customers.edit');
        Route::put('customers/{id}', [SalesPortalController::class, 'updateCustomer'])->name('customers.update');
        Route::delete('customers/{id}', [SalesPortalController::class, 'destroyCustomer'])->name('customers.destroy');
    });

    // Accounting actions (restricted to Accounting Staff)
    Route::middleware(['role:staff_accounting'])->group(function () {
        Route::get('accounting/inbox', [\App\Http\Controllers\AccountingController::class, 'inbox'])->name('accounting.inbox');
        Route::post('accounting/orders/{id}/validate', [\App\Http\Controllers\AccountingController::class, 'validateOrder'])->name('accounting.validate');
        Route::post('accounting/orders/{id}/reject', [\App\Http\Controllers\AccountingController::class, 'rejectOrder'])->name('accounting.reject');
        Route::get('accounting/rekap', [\App\Http\Controllers\AccountingController::class, 'rekap'])->name('accounting.rekap');
        
        Route::get('accounting/invoice-rekap', [InvoiceController::class, 'index'])->name('accounting.invoice_rekap');
        Route::post('accounting/invoices', [InvoiceController::class, 'store'])->name('accounting.invoices.store');
    });

    // Manager actions (restricted to Managers)
    Route::middleware(['role:manager'])->group(function () {
        Route::get('analytics', [\App\Http\Controllers\ManagerController::class, 'analytics'])->name('analytics');
        Route::get('analytics/export', [\App\Http\Controllers\ManagerController::class, 'exportCsv'])->name('analytics.export');
    });
});

require __DIR__.'/settings.php';

