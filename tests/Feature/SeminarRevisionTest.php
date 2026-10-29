<?php

use App\Models\AppNotification;
use App\Models\Branch;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\ManagerReport;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Plant;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\User;
use App\Support\SpreadsheetReader;
use App\Support\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->salesUser = User::factory()->create([
        'name' => 'Staff Sales',
        'email' => 'sales@metinca.com',
        'role' => UserRole::SALES,
    ]);

    $this->accountingUser = User::factory()->create([
        'name' => 'Staff Accounting',
        'email' => 'accounting@metinca.com',
        'role' => UserRole::ACCOUNTING,
    ]);

    $this->managerUser = User::factory()->create([
        'name' => 'Manager Accounting',
        'email' => 'manager@metinca.com',
        'role' => UserRole::MANAGER,
    ]);

    $this->branch = Branch::create(['name' => 'Cabang Jakarta', 'location' => 'Jakarta']);
    $this->plant = Plant::create(['branch_id' => $this->branch->id, 'name' => 'Plant A - Jakarta', 'location' => 'Jakarta']);
    $this->supplier = Supplier::create(['name' => 'PT Baja Utama']);
    $this->customer = Customer::create(['name' => 'PT Astra Otoparts Tbk', 'email' => 'astra@example.com']);
    $this->product = Product::create([
        'code' => 'MTC-001',
        'name' => 'Steel Flange 10 Inch',
        'category' => 'Gudang A',
        'price' => 500000,
        'stock' => 20,
        'unit' => 'Pcs',
    ]);
});

test('purchase order creation, submission, approval, receiving, and notifications work end-to-end', function () {
    // 1. Staff Accounting creates and submits a PO
    $response = $this->actingAs($this->accountingUser)->post('/purchase-orders', [
        'supplier_id' => $this->supplier->id,
        'plant_id' => $this->plant->id,
        'date' => now()->toDateString(),
        'expected_date' => now()->addDays(7)->toDateString(),
        'status' => 'Submitted',
        'notes' => 'Pengadaan Steel Flange Q4',
        'items' => [
            [
                'product_id' => $this->product->id,
                'quantity' => 10,
                'unit_price' => 350000,
            ],
        ],
    ]);

    $response->assertRedirect(route('purchase_orders.index'));

    $po = PurchaseOrder::first();
    expect($po)->not->toBeNull()
        ->and($po->status)->toBe('Submitted')
        ->and((float) $po->total_amount)->toBe(3500000.0);

    // Manager Accounting should receive a notification
    expect(AppNotification::where('user_id', $this->managerUser->id)->where('type', 'po_submitted')->exists())->toBeTrue();

    // 2. Manager Accounting approves the PO
    $this->actingAs($this->managerUser)
        ->post("/purchase-orders/{$po->id}/approve")
        ->assertRedirect();

    $po->refresh();
    expect($po->status)->toBe('Approved')
        ->and($po->approved_by)->toBe($this->managerUser->id);

    // Creator should receive approval notification
    expect(AppNotification::where('user_id', $this->accountingUser->id)->where('type', 'po_approved')->exists())->toBeTrue();

    // 3. Receive PO goods -> increments product stock
    $this->actingAs($this->accountingUser)
        ->post("/purchase-orders/{$po->id}/receive")
        ->assertRedirect();

    $po->refresh();
    $this->product->refresh();
    expect($po->status)->toBe('Received')
        ->and($this->product->stock)->toBe(30);
});

test('detailed accounting report submission and manager validation trigger notifications', function () {
    $order = Order::create([
        'id' => 'ORD-2026-001',
        'customer_id' => $this->customer->id,
        'user_id' => $this->salesUser->id,
        'sales_rep' => $this->salesUser->name,
        'date_raised' => now(),
        'status' => 'utang',
        'terms' => 'Net 30',
        'subtotal' => 5000000,
        'tax_amount' => 550000,
        'total_amount' => 5550000,
        'validated_at' => now(),
    ]);

    OrderItem::create([
        'order_id' => $order->id,
        'product_id' => $this->product->id,
        'quantity' => 10,
        'price' => 500000,
    ]);

    Invoice::create([
        'order_id' => $order->id,
        'invoice_type' => 'domestik',
        'subtotal' => 5000000,
        'tax_percent' => 11,
        'tax_amount' => 550000,
        'dp_amount' => 0,
        'total_amount' => 5550000,
        'status' => 'utang',
        'validated_at' => now(),
    ]);

    // Staff Accounting submits monthly report to Manager Accounting
    $this->actingAs($this->accountingUser)
        ->post('/accounting/reports/generate', [
            'type' => 'monthly',
            'period' => now()->toDateString(),
        ])
        ->assertRedirect();

    $report = ManagerReport::where('type', 'monthly')->first();
    expect($report)->not->toBeNull()
        ->and($report->metrics_data)->toHaveKeys([
            'invoices_detail',
            'customer_breakdown',
            'product_breakdown',
            'purchase_orders_detail',
        ]);

    expect(AppNotification::where('user_id', $this->managerUser->id)->where('type', 'report_submitted')->exists())->toBeTrue();

    // Manager Accounting validates the report
    $this->actingAs($this->managerUser)
        ->post("/manager/reports/{$report->id}/validate", ['notes' => 'Laporan lengkap dan disetujui.'])
        ->assertRedirect();

    $report->refresh();
    expect($report->status)->toBe('validated');
    expect(AppNotification::where('user_id', $this->accountingUser->id)->where('type', 'report_validated')->exists())->toBeTrue();
});

test('balance sheet (laporan neraca) page renders balanced aktiva and pasiva', function () {
    $response = $this->actingAs($this->managerUser)->get('/manager/neraca');
    $response->assertStatus(200);

    // Staff Accounting can submit Neraca for Manager validation
    $this->actingAs($this->accountingUser)
        ->post('/manager/neraca/submit', ['period' => now()->format('Y-m')])
        ->assertRedirect();

    $neracaReport = ManagerReport::where('type', 'neraca')->first();
    expect($neracaReport)->not->toBeNull();
    expect(AppNotification::where('user_id', $this->managerUser->id)->where('type', 'neraca_submitted')->exists())->toBeTrue();
});

test('excel invoice import saves automatically to database and prevents duplicate invoices', function () {
    // 1. Download template endpoint works
    $templateRes = $this->actingAs($this->salesUser)->get('/invoices/template');
    $templateRes->assertStatus(200);

    // 2. Build an .xlsx file with 2 invoices + 1 internal duplicate row
    $headers = [
        'No Referensi / Invoice',
        'Nama Pelanggan (Customer)',
        'Email Customer',
        'Tipe Invoice (domestik/international)',
        'Mata Uang (IDR/USD/EUR)',
        'Kurs (Exchange Rate)',
        'Kode Produk',
        'Nama Produk',
        'Qty',
        'Harga Satuan',
        'PPN (%)',
        'Uang Muka / DP',
        'Terms',
    ];
    $rows = [
        [
            'INV-XLS-101',
            'PT Astra Otoparts Tbk',
            'astra@example.com',
            'domestik',
            'IDR',
            1,
            'MTC-001',
            'Steel Flange 10 Inch',
            5,
            500000,
            11,
            0,
            'Net 30',
        ],
        // Internal exact duplicate row in the same Excel file (should be skipped automatically)
        [
            'INV-XLS-101',
            'PT Astra Otoparts Tbk',
            'astra@example.com',
            'domestik',
            'IDR',
            1,
            'MTC-001',
            'Steel Flange 10 Inch',
            5,
            500000,
            11,
            0,
            'Net 30',
        ],
        // Second invoice with a brand-new Customer and Product (auto-created in DB)
        [
            'INV-XLS-102',
            'PT Krakatau Pipe Industries',
            'krakatau@example.com',
            'domestik',
            'IDR',
            1,
            'MTC-999',
            'Heavy Duty Valve DN100',
            2,
            1250000,
            11,
            100000,
            'Net 30',
        ],
    ];

    $xlsxBinary = SpreadsheetReader::generateXlsx($headers, $rows, 'Import Invoice');
    $file = UploadedFile::fake()->createWithContent('import_invoices.xlsx', $xlsxBinary);

    $response = $this->actingAs($this->salesUser)->post('/invoices/import', [
        'excel_file' => $file,
        'default_action' => 'submit',
    ]);

    $response->assertRedirect(route('sales.invoice_rekap'));
    $response->assertSessionHas('success');

    // Verify 2 invoices were created in DB and the internal duplicate row was not doubled
    expect(Invoice::count())->toBe(2);
    expect(Customer::where('name', 'PT Krakatau Pipe Industries')->exists())->toBeTrue();
    expect(Product::where('code', 'MTC-999')->exists())->toBeTrue();

    $firstOrder = Order::where('customer_id', $this->customer->id)->first();
    $firstInvoice = Invoice::where('order_id', $firstOrder->id)->first();
    expect($firstInvoice)->not->toBeNull()
        ->and((float) $firstInvoice->subtotal)->toBe(2500000.0); // 5 * 500,000 (not 10 * 500,000)

    // 3. Re-importing the exact same Excel file detects all invoices as existing duplicates in DB
    $fileAgain = UploadedFile::fake()->createWithContent('import_invoices_again.xlsx', $xlsxBinary);
    $dupResponse = $this->actingAs($this->salesUser)->post('/invoices/import', [
        'excel_file' => $fileAgain,
        'default_action' => 'submit',
    ]);

    $dupResponse->assertSessionHas('error');
    expect(Invoice::count())->toBe(2); // Count remains 2, no duplicate inserted!
});

