<?php

use App\Http\Controllers\AccountingController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\ManagerController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\PurchaseOrderController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ReturnController;
use App\Http\Controllers\SalesPortalController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/login')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [SalesPortalController::class, 'dashboard'])->name('dashboard');

    // In-App Notifications (all authenticated actors)
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read_all');
    Route::post('notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');

    // View actions (staff only — self-registered "pending" users must not
    // see orders, customers, or pricing data)
    Route::middleware(['role:staff_sales,staff_accounting,manager'])->group(function () {
        Route::get('orders', [SalesPortalController::class, 'orders'])->name('orders.index');
        Route::get('customers', [SalesPortalController::class, 'customers'])->name('customers.index');
        Route::get('products', [ProductController::class, 'index'])->name('products.index');

        // Purchase Orders (PO) — accessible by Sales, Accounting, and Manager
        Route::get('purchase-orders', [PurchaseOrderController::class, 'index'])->name('purchase_orders.index');
        Route::post('purchase-orders', [PurchaseOrderController::class, 'store'])->name('purchase_orders.store');
        Route::post('purchase-orders/{id}/submit', [PurchaseOrderController::class, 'submit'])->name('purchase_orders.submit');
        Route::post('purchase-orders/{id}/receive', [PurchaseOrderController::class, 'receive'])->name('purchase_orders.receive');
        Route::post('purchase-orders/{id}/pay', [PurchaseOrderController::class, 'pay'])->name('purchase_orders.pay');

        Route::get('sales/invoice-rekap', [InvoiceController::class, 'index'])->name('sales.invoice_rekap');
        Route::get('invoices/template', [InvoiceController::class, 'downloadTemplate'])->name('invoices.template');
        Route::post('invoices/import', [InvoiceController::class, 'importExcel'])->name('invoices.import');
    });

    Route::middleware(['role:staff_sales,staff_accounting'])->group(function () {
        Route::get('returns', [ReturnController::class, 'index'])->name('returns.index');
    });

    // Sales actions (restricted to Sales Reps)
    Route::middleware(['role:staff_sales'])->group(function () {
        // Customers
        Route::get('customers/create', [SalesPortalController::class, 'createCustomer'])->name('customers.create');
        Route::post('customers', [SalesPortalController::class, 'storeCustomer'])->name('customers.store');
        Route::get('customers/{id}/edit', [SalesPortalController::class, 'editCustomer'])->name('customers.edit');
        Route::put('customers/{id}', [SalesPortalController::class, 'updateCustomer'])->name('customers.update');
        Route::delete('customers/{id}', [SalesPortalController::class, 'destroyCustomer'])->name('customers.destroy');

        // Products
        Route::get('products/create', [ProductController::class, 'create'])->name('products.create');
        Route::post('products', [ProductController::class, 'store'])->name('products.store');
        Route::get('products/{id}/edit', [ProductController::class, 'edit'])->name('products.edit');
        Route::put('products/{id}', [ProductController::class, 'update'])->name('products.update');
        Route::delete('products/{id}', [ProductController::class, 'destroy'])->name('products.destroy');

        // Returns (Barang Reject)
        Route::get('returns/create', [ReturnController::class, 'create'])->name('returns.create');
        Route::post('returns', [ReturnController::class, 'store'])->name('returns.store');

        Route::get('invoices/create', [InvoiceController::class, 'create'])->name('invoices.create');
        Route::post('invoices', [InvoiceController::class, 'storeUnified'])->name('invoices.store_unified');

        Route::post('sales/invoices/{id}/submit', [InvoiceController::class, 'submit'])->name('sales.invoices.submit');
        Route::post('sales/invoices/{id}/pay', [InvoiceController::class, 'markAsLunas'])->name('sales.invoices.pay');
    });

    // Accounting actions (restricted to Accounting Staff)
    Route::middleware(['role:staff_accounting'])->group(function () {
        Route::get('accounting/inbox', [AccountingController::class, 'inbox'])->name('accounting.inbox');
        Route::post('accounting/invoices/{id}/validate', [AccountingController::class, 'validateInvoice'])->name('accounting.validate');
        Route::post('accounting/invoices/{id}/reject', [AccountingController::class, 'rejectInvoice'])->name('accounting.reject');

        Route::post('accounting/reports/generate', [AccountingController::class, 'generateReport'])->name('accounting.generate_report');

        // Returns approval
        Route::post('accounting/returns/{id}/approve', [ReturnController::class, 'approve'])->name('returns.approve');
        Route::post('accounting/returns/{id}/reject', [ReturnController::class, 'reject'])->name('returns.reject');
    });

    // Manager actions (restricted to Manager Accounting)
    Route::middleware(['role:manager'])->group(function () {
        Route::get('manager/reports', [ManagerController::class, 'inbox'])->name('manager.reports');
        Route::post('manager/reports/{id}/validate', [ManagerController::class, 'validateReport'])->name('manager.reports.validate');
        Route::post('manager/reports/{id}/reject', [ManagerController::class, 'rejectReport'])->name('manager.reports.reject');

        Route::get('manager/sales-recap', [SalesPortalController::class, 'rekap'])->name('manager.sales_recap');

        // Purchase Order Approval by Manager Accounting
        Route::post('purchase-orders/{id}/approve', [PurchaseOrderController::class, 'approve'])->name('purchase_orders.approve');
        Route::post('purchase-orders/{id}/reject', [PurchaseOrderController::class, 'reject'])->name('purchase_orders.reject');

        // Neraca validation by Manager Accounting
        Route::post('manager/neraca/{id}/validate', [ManagerController::class, 'validateNeraca'])->name('manager.neraca.validate');
    });

    // Reports & Neraca accessible by Accounting and Manager Accounting
    Route::middleware(['role:staff_accounting,manager'])->group(function () {
        Route::get('reports/customer-recap', [ReportController::class, 'customerRecap'])->name('reports.customer_recap');
        Route::get('manager/neraca', [ManagerController::class, 'neraca'])->name('manager.neraca');
        Route::post('manager/neraca/submit', [ManagerController::class, 'submitNeraca'])->name('manager.neraca.submit');
    });
});

require __DIR__.'/settings.php';
