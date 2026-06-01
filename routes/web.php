<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SalesPortalController;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [SalesPortalController::class, 'dashboard'])->name('dashboard');
    
    // Sales Portal Routes
    Route::get('orders', [SalesPortalController::class, 'orders'])->name('orders.index');
    Route::get('orders/create', [SalesPortalController::class, 'createOrder'])->name('orders.create');
    Route::post('orders', [SalesPortalController::class, 'storeOrder'])->name('orders.store');
    Route::get('orders/{id}/edit', [SalesPortalController::class, 'editOrder'])->name('orders.edit');
    Route::put('orders/{id}', [SalesPortalController::class, 'updateOrder'])->name('orders.update');
    Route::delete('orders/{id}', [SalesPortalController::class, 'destroyOrder'])->name('orders.destroy');
    
    Route::get('pipeline', [SalesPortalController::class, 'pipeline'])->name('pipeline');
    
    // Customer CRUD Routes
    Route::get('customers', [SalesPortalController::class, 'customers'])->name('customers.index');
    Route::get('customers/create', [SalesPortalController::class, 'createCustomer'])->name('customers.create');
    Route::post('customers', [SalesPortalController::class, 'storeCustomer'])->name('customers.store');
    Route::get('customers/{id}/edit', [SalesPortalController::class, 'editCustomer'])->name('customers.edit');
    Route::put('customers/{id}', [SalesPortalController::class, 'updateCustomer'])->name('customers.update');
    Route::delete('customers/{id}', [SalesPortalController::class, 'destroyCustomer'])->name('customers.destroy');
    
    Route::get('analytics', [SalesPortalController::class, 'analytics'])->name('analytics');
});

require __DIR__.'/settings.php';

