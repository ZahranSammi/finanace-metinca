<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Order;
use App\Models\Customer;
use App\Models\Product;
use App\Services\NotificationService;
use App\Support\OrderStatus;
use App\Support\SpreadsheetReader;
use App\Support\Tax;
use App\Support\UserRole;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class InvoiceController extends Controller
{
    /**
     * Build a canonical signature for an invoice based on customer name, invoice type, and sorted item lines.
     *
     * @param  array<int, array{product_name?: string, product_code?: string, quantity: int}>  $items
     */
    public static function buildSignature(string $customerName, string $invoiceType, array $items): string
    {
        $cust = strtolower(trim($customerName));
        $type = strtolower(trim($invoiceType ?: 'domestik'));
        $parts = [];
        foreach ($items as $item) {
            $key = strtolower(trim((string) ($item['product_code'] ?? $item['product_name'] ?? '')));
            $qty = (int) ($item['quantity'] ?? 0);
            if ($key !== '' && $qty > 0) {
                $parts[] = $key.':'.$qty;
            }
        }
        sort($parts);

        return $cust.'|'.$type.'|'.implode(',', $parts);
    }

    public function create()
    {
        $existingInvoices = Invoice::with(['order.customer', 'order.items.product'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function (Invoice $inv) {
                $custName = $inv->order?->customer?->name ?? '';
                $items = ($inv->order && $inv->order->items) ? $inv->order->items->map(fn ($it) => [
                    'product_code' => $it->product?->code ?? '',
                    'product_name' => $it->product?->name ?? '',
                    'quantity' => (int) $it->quantity,
                ])->all() : [];

                return [
                    'id' => 'INV-'.str_pad((string) $inv->id, 5, '0', STR_PAD_LEFT),
                    'order_id' => (string) $inv->order_id,
                    'customer_name' => $custName,
                    'invoice_type' => $inv->invoice_type ?? 'domestik',
                    'total_amount' => (float) $inv->total_amount,
                    'signature_by_name' => self::buildSignature($custName, $inv->invoice_type ?? 'domestik', array_map(fn ($i) => [
                        'product_name' => $i['product_name'],
                        'quantity' => $i['quantity'],
                    ], $items)),
                    'signature_by_code' => self::buildSignature($custName, $inv->invoice_type ?? 'domestik', array_map(fn ($i) => [
                        'product_code' => $i['product_code'] ?: $i['product_name'],
                        'quantity' => $i['quantity'],
                    ], $items)),
                ];
            });

        return Inertia::render('portal/invoices/create', [
            'customers' => Customer::orderBy('name')->get()->map->only('id', 'name', 'email'),
            'products' => Product::orderBy('name')->get()->map(fn ($p) => [
                'id' => $p->id,
                'code' => $p->code,
                'name' => $p->name,
                'price' => (float) $p->price,
                'stock' => (int) $p->stock,
            ]),
            'existing_invoices' => $existingInvoices,
        ]);
    }

    public function storeUnified(Request $request)
    {
        $request->validate([
            'customerId' => 'required|exists:customers,id',
            'invoice_type' => 'required|in:domestik,international',
            'currency' => 'nullable|string|in:IDR,EUR,USD',
            'exchangeRate' => 'nullable|numeric|min:0.000001',
            'items' => 'required|array|min:1',
            'items.*.productId' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'dp_amount' => 'nullable|numeric|min:0',
            'tax_percent' => 'nullable|numeric|min:0|max:100',
            'due_date' => 'nullable|date',
            'delivery_date' => 'nullable|date',
            'attachment' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120', // Max 5MB
        ]);

        if ($request->invoice_type === 'international' && !$request->hasFile('attachment')) {
            return back()->withErrors(['attachment' => 'Dokumen EXIM wajib dilampirkan untuk invoice Internasional.']);
        }

        // Duplicate Check: Check if an invoice with the exact same customer, invoice_type, and product+quantity items already exists
        if (! $request->boolean('force_save')) {
            $customer = Customer::find($request->customerId);
            $customerName = $customer?->name ?? '';
            $reqItemsForSig = [];
            foreach ($request->items as $itemData) {
                $prod = Product::find($itemData['productId']);
                if ($prod) {
                    $reqItemsForSig[] = [
                        'product_name' => $prod->name,
                        'quantity' => (int) $itemData['quantity'],
                    ];
                }
            }
            $incomingSignature = self::buildSignature($customerName, (string) $request->invoice_type, $reqItemsForSig);

            $existingDuplicate = Invoice::with(['order.customer', 'order.items.product'])
                ->whereHas('order', fn ($q) => $q->where('customer_id', $request->customerId))
                ->where('invoice_type', $request->invoice_type)
                ->get()
                ->first(function (Invoice $inv) use ($incomingSignature, $customerName) {
                    $items = ($inv->order && $inv->order->items) ? $inv->order->items->map(fn ($it) => [
                        'product_name' => $it->product?->name ?? '',
                        'quantity' => (int) $it->quantity,
                    ])->all() : [];

                    return self::buildSignature($customerName, $inv->invoice_type ?? 'domestik', $items) === $incomingSignature;
                });

            if ($existingDuplicate) {
                $dupInvNo = 'INV-'.str_pad((string) $existingDuplicate->id, 5, '0', STR_PAD_LEFT);

                return back()->withErrors([
                    'duplicate' => "Data Duplikat Terdeteksi: Invoice untuk customer \"{$customerName}\" dengan rincian produk dan kuantitas yang sama persis sudah ada di database ({$dupInvNo} / {$existingDuplicate->order_id}).",
                ])->withInput();
            }
        }

        DB::beginTransaction();
        try {
            // 1. Calculate subtotal first to save in order
            $subtotal = 0;
            foreach ($request->items as $itemData) {
                $product = Product::findOrFail($itemData['productId']);
                $subtotal += ($product->price * $itemData['quantity']);
            }

            // Generate an Order ID
            do {
                $orderId = sprintf('ORD-%03d-%s%d', random_int(100, 999), chr(random_int(65, 90)), random_int(1, 9));
            } while (Order::whereKey($orderId)->exists());

            // 2. Create Order as backend container
            $order = Order::create([
                'id' => $orderId,
                'user_id' => $request->user()->id,
                'sales_rep' => $request->user()->name,
                'customer_id' => $request->customerId,
                'status' => OrderStatus::SUBMITTED, // auto submit since it's just a backend container
                'currency' => $request->currency ?? 'IDR',
                'exchange_rate' => $request->exchangeRate ?? 1,
                'total_amount' => $subtotal,
                'date_raised' => now(),
            ]);

            // Re-loop to create OrderItems
            foreach ($request->items as $itemData) {
                $product = Product::findOrFail($itemData['productId']);
                $order->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $itemData['quantity'],
                    'price' => $product->price,
                ]);
            }


            // 2. File Upload for EXIM
            $filePath = null;
            if ($request->hasFile('attachment')) {
                $filePath = $request->file('attachment')->store('exim_documents', 'public');
            }

            // 3. Create Invoice
            $exchangeRate = (float) ($request->exchangeRate ?? 1);
            $taxPercent = $request->has('tax_percent') 
                ? (float) $request->tax_percent 
                : ($request->invoice_type === 'domestik' ? Tax::PERCENT : 0);

            $dpAmountInput = (float) ($request->dp_amount ?? 0);
            $dpAmount = ($order->currency && $order->currency !== 'IDR') 
                ? ($dpAmountInput * $exchangeRate) 
                : $dpAmountInput;

            $taxAmount = $subtotal * ($taxPercent / 100);

            if ($dpAmount > $subtotal + $taxAmount) {
                DB::rollBack();
                return redirect()->back()->with('error', 'Down payment cannot exceed the invoice total.');
            }

            $totalAmount = $subtotal + $taxAmount - $dpAmount;

            Invoice::create([
                'order_id' => $order->id,
                'invoice_type' => $request->invoice_type,
                'subtotal' => round($subtotal, 2),
                'tax_percent' => $taxPercent,
                'tax_amount' => round($taxAmount, 2),
                'dp_amount' => round($dpAmount, 2),
                'total_amount' => round($totalAmount, 2),
                'currency' => $order->currency,
                'exchange_rate' => $exchangeRate,
                'due_date' => $request->due_date,
                'delivery_date' => $request->delivery_date,
                'status' => 'draft',
                'file_path' => $filePath,
            ]);

            DB::commit();

            return redirect()->route('sales.invoice_rekap')->with('success', 'Invoice created successfully as Draft.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Failed to create invoice: ' . $e->getMessage());
        }
    }

    public function index()
    {
        // Generate invoice record for orders created without invoice record
        $ordersWithoutInvoice = Order::doesntHave('invoice')->get();
        foreach ($ordersWithoutInvoice as $order) {
            $taxPercent = 11;
            $total = (float) $order->total_amount;
            $subtotal = round($total / (1 + ($taxPercent / 100)), 2);
            $taxAmount = round($total - $subtotal, 2);

            Invoice::create([
                'order_id' => $order->id,
                'invoice_type' => 'domestik',
                'subtotal' => $subtotal,
                'tax_percent' => $taxPercent,
                'tax_amount' => $taxAmount,
                'dp_amount' => 0,
                'total_amount' => $total,
                'currency' => $order->currency ?? 'IDR',
                'exchange_rate' => (float) ($order->exchange_rate ?? 1),
                'status' => $order->status === 'lunas' ? 'lunas' : ($order->status === 'utang' ? 'utang' : ($order->status === 'Submitted' ? 'Submitted' : 'Pending')),
                'created_at' => $order->date_raised ?? $order->created_at ?? now(),
                'updated_at' => $order->updated_at ?? now(),
            ]);
        }

        $invoices = Invoice::with(['order.customer', 'order.items.product'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($inv) => [
                'id' => 'INV-' . str_pad($inv->id, 5, '0', STR_PAD_LEFT),
                'order_id' => $inv->order_id,
                'customer_name' => $inv->order->customer->name ?? 'Pelanggan',
                'sales_rep' => $inv->order->sales_rep ?? '-',
                'invoice_type' => $inv->invoice_type ?? 'domestik',
                'subtotal' => (double) $inv->subtotal,
                'tax_percent' => (double) $inv->tax_percent,
                'tax_amount' => (double) $inv->tax_amount,
                'dp_amount' => (double) $inv->dp_amount,
                'total_amount' => (double) $inv->total_amount,
                'currency' => $inv->currency ?? 'IDR',
                'exchange_rate' => (double) ($inv->exchange_rate ?? 1),
                'file_path' => $inv->file_path ? asset('storage/' . $inv->file_path) : null,
                'status' => $inv->status,
                'created_at' => $inv->created_at ? $inv->created_at->format('M d, Y H:i') : '-',
                'items' => ($inv->order && $inv->order->items) ? $inv->order->items->map(fn($item) => [
                    'product_name' => $item->product->name ?? 'Produk',
                    'quantity' => (int) $item->quantity,
                    'price' => (double) $item->price,
                ])->values()->all() : [],
            ]);

        return Inertia::render('portal/sales/invoice-rekap', [
            'invoices' => $invoices,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'order_id' => 'required|exists:orders,id',
            'invoice_type' => 'required|in:domestik,international',
            'dp_amount' => 'nullable|numeric|min:0',
            'due_date' => 'nullable|date',
            'delivery_date' => 'nullable|date',
            'tax_percent' => 'nullable|numeric|min:0|max:100',
            'exchange_rate' => 'nullable|numeric|min:0.000001',
        ]);

        $order = Order::with('items')->findOrFail($request->order_id);

        // Check if invoice already exists
        if (Invoice::where('order_id', $order->id)->exists()) {
            return redirect()->back()->with('error', 'Invoice already exists for this order.');
        }

        // Calculate subtotal from order items (in IDR)
        $subtotal = $order->items->sum(fn($item) => $item->price * $item->quantity);
        
        $exchangeRate = (float) $request->input('exchange_rate', $order->exchange_rate ?? 1);
        $taxPercent = $request->has('tax_percent') 
            ? (float) $request->input('tax_percent') 
            : ($request->invoice_type === 'domestik' ? Tax::PERCENT : 0);

        // Input DP is in the order's foreign currency if not IDR. Convert to IDR for DB storage.
        $dpAmountInput = (float) ($request->input('dp_amount', 0) ?? 0);
        $dpAmount = ($order->currency && $order->currency !== 'IDR') 
            ? ($dpAmountInput * $exchangeRate) 
            : $dpAmountInput;

        $taxAmount = $subtotal * ($taxPercent / 100);

        // The down payment can never exceed what is owed.
        if ($dpAmount > $subtotal + $taxAmount) {
            return redirect()->back()->with('error', 'Down payment cannot exceed the invoice total.');
        }

        $totalAmount = $subtotal + $taxAmount - $dpAmount;

        Invoice::create([
            'order_id' => $order->id,
            'invoice_type' => $request->invoice_type,
            'subtotal' => round($subtotal, 2),
            'tax_percent' => $taxPercent,
            'tax_amount' => round($taxAmount, 2),
            'dp_amount' => round($dpAmount, 2),
            'total_amount' => round($totalAmount, 2),
            'currency' => $order->currency ?? 'IDR',
            'exchange_rate' => $exchangeRate,
            'due_date' => $request->due_date,
            'delivery_date' => $request->delivery_date,
            'status' => 'draft',
        ]);

        return redirect()->route('sales.rekap')->with('success', 'Invoice created successfully as Draft.');
    }

    public function submit($id)
    {
        $invoice = Invoice::with('order.customer')->findOrFail($id);

        if ($invoice->status !== 'draft' && $invoice->status !== 'rejected') {
            return redirect()->back()->with('error', 'Only draft or rejected invoices can be submitted.');
        }

        $invoice->update([
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        $invNumber = 'INV-' . str_pad((string) $invoice->id, 5, '0', STR_PAD_LEFT);
        $senderName = Auth::user()?->name ?? 'Staff Sales';
        $customerName = $invoice->order?->customer?->name ?? 'Customer';

        NotificationService::notifyRole(
            UserRole::ACCOUNTING,
            'Invoice Baru Menunggu Validasi (' . $invNumber . ')',
            $senderName . ' mengirim ' . $invNumber . ' untuk customer ' . $customerName . ' senilai Rp ' . number_format((float) $invoice->total_amount, 0, ',', '.') . ' ke Kotak Masuk Validasi.',
            '/accounting/inbox',
            'invoice_submitted',
            Auth::id()
        );

        return redirect()->back()->with('success', 'Invoice submitted to Accounting for validation.');
    }

    public function markAsLunas($id)
    {
        $invoice = Invoice::with('order.customer')->findOrFail($id);
        
        $invoice->update([
            'status' => 'lunas'
        ]);

        if ($invoice->order) {
            $invoice->order->update(['status' => 'lunas']);
        }

        $invNumber = 'INV-' . str_pad((string) $invoice->id, 5, '0', STR_PAD_LEFT);
        $senderName = Auth::user()?->name ?? 'Staff Sales';
        $customerName = $invoice->order?->customer?->name ?? 'Customer';

        NotificationService::notifyRole(
            [UserRole::ACCOUNTING, UserRole::MANAGER],
            'Pembayaran Invoice Lunas (' . $invNumber . ')',
            $senderName . ' menandai pembayaran ' . $invNumber . ' (' . $customerName . ') senilai Rp ' . number_format((float) $invoice->total_amount, 0, ',', '.') . ' telah LUNAS.',
            '/sales/invoice-rekap',
            'invoice_paid',
            Auth::id()
        );

        return redirect()->back()->with('success', 'Invoice marked as Lunas.');
    }

    public function downloadTemplate()
    {
        $headers = [
            'No Referensi',
            'Nama Customer',
            'Tipe Invoice',
            'Kode Produk',
            'Nama Produk',
            'Qty',
            'Harga Satuan',
            'Mata Uang',
            'Kurs',
            'PPN (%)',
            'DP',
            'Jatuh Tempo',
            'Status',
        ];

        $sampleRows = [
            [
                'INV-XLS-001',
                'Acme Corporation Ltd.',
                'domestik',
                'OFF-001',
                'Printer Paper A4 (Ream)',
                20,
                55000,
                'IDR',
                1,
                11,
                0,
                now()->addDays(14)->toDateString(),
                'draft',
            ],
            [
                'INV-XLS-001',
                'Acme Corporation Ltd.',
                'domestik',
                'ELE-001',
                'Mouse Wireless Logitech',
                5,
                185000,
                'IDR',
                1,
                11,
                0,
                now()->addDays(14)->toDateString(),
                'draft',
            ],
            [
                'INV-XLS-002',
                'Globex Inc.',
                'domestik',
                'FUR-001',
                'Office Chair Ergonomic',
                4,
                1250000,
                'IDR',
                1,
                11,
                500000,
                now()->addDays(30)->toDateString(),
                'submitted',
            ],
        ];

        $binary = SpreadsheetReader::generateXlsx($headers, $sampleRows, 'Template Invoice');

        return response($binary, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="Template_Import_Invoice_Metinca.xlsx"',
            'Cache-Control' => 'max-age=0',
        ]);
    }

    public function importExcel(Request $request)
    {
        $request->validate([
            'file' => 'nullable|file|max:10240',
            'excel_file' => 'nullable|file|max:10240',
            'rows' => 'nullable|array',
        ]);

        $assocRows = [];
        $uploaded = $request->file('file') ?? $request->file('excel_file');
        if ($uploaded) {
            $assocRows = SpreadsheetReader::parseFile(
                $uploaded->getRealPath(),
                $uploaded->getClientOriginalExtension()
            );
        } elseif (is_array($request->input('rows'))) {
            $assocRows = $request->input('rows');
        }

        if (empty($assocRows)) {
            return redirect()->back()->with('error', 'File Excel/CSV kosong atau format kolom tidak dikenali. Gunakan Template Excel yang telah disediakan.');
        }

        $defaultStatus = $request->input('default_action') === 'submit' ? 'submitted' : 'draft';

        // Group rows into invoices and detect internal duplicates inside the file
        $invoiceGroups = [];
        $internalDuplicateRowMessages = [];
        $seenRowFingerprints = [];

        foreach ($assocRows as $idx => $row) {
            $rowNum = $row['_row_number'] ?? ($idx + 2);
            $ref = trim((string) ($row['no_referensi'] ?? $row['no_referensi_invoice'] ?? $row['no_invoice'] ?? $row['invoice_no'] ?? $row['order_id'] ?? $row['no_order'] ?? $row['referensi'] ?? $row['ref'] ?? ''));
            $customerName = trim((string) ($row['nama_customer'] ?? $row['nama_pelanggan_customer'] ?? $row['customer'] ?? $row['pelanggan'] ?? $row['nama_pelanggan'] ?? $row['customer_name'] ?? $row['perusahaan'] ?? ''));
            $productCode = trim((string) ($row['kode_produk'] ?? $row['product_code'] ?? $row['code'] ?? $row['kode'] ?? ''));
            $productName = trim((string) ($row['nama_produk'] ?? $row['produk'] ?? $row['product'] ?? $row['product_name'] ?? $row['nama_barang'] ?? $row['barang'] ?? $row['item'] ?? ''));
            $qtyRaw = preg_replace('/[^0-9.-]/', '', (string) ($row['qty'] ?? $row['quantity'] ?? $row['jumlah'] ?? $row['kuantitas'] ?? '1'));
            $qty = max(1, (int) $qtyRaw);

            $priceRaw = preg_replace('/[^0-9.]/', '', (string) ($row['harga_satuan'] ?? $row['price'] ?? $row['harga'] ?? $row['unit_price'] ?? '0'));
            $unitPrice = (float) ($priceRaw !== '' ? $priceRaw : 0);

            $typeRaw = strtolower(trim((string) ($row['tipe_invoice'] ?? $row['tipe_invoice_domestik_international'] ?? $row['invoice_type'] ?? $row['tipe'] ?? $row['jenis'] ?? 'domestik')));
            $invoiceType = in_array($typeRaw, ['international', 'internasional', 'ekspor', 'export'], true) ? 'international' : 'domestik';

            $currency = strtoupper(trim((string) ($row['mata_uang'] ?? $row['mata_uang_idr_usd_eur'] ?? $row['currency'] ?? $row['valuta'] ?? ($invoiceType === 'international' ? 'USD' : 'IDR'))));
            if (! in_array($currency, ['IDR', 'USD', 'EUR'], true)) {
                $currency = 'IDR';
            }

            $exchangeRateRaw = preg_replace('/[^0-9.]/', '', (string) ($row['kurs'] ?? $row['kurs_exchange_rate'] ?? $row['exchange_rate'] ?? $row['rate'] ?? '1'));
            $exchangeRate = max(1.0, (float) ($exchangeRateRaw !== '' ? $exchangeRateRaw : 1));

            $taxPercentRaw = preg_replace('/[^0-9.]/', '', (string) ($row['ppn'] ?? $row['ppn_'] ?? $row['tax_percent'] ?? $row['pajak'] ?? ($invoiceType === 'domestik' ? '11' : '0')));
            $taxPercent = $invoiceType === 'international' ? 0.0 : (float) ($taxPercentRaw !== '' ? $taxPercentRaw : 11);

            $dpRaw = preg_replace('/[^0-9.]/', '', (string) ($row['dp'] ?? $row['uang_muka_dp'] ?? $row['dp_amount'] ?? $row['uang_muka'] ?? '0'));
            $dpAmount = max(0.0, (float) ($dpRaw !== '' ? $dpRaw : 0));

            $dueDate = trim((string) ($row['jatuh_tempo'] ?? $row['due_date'] ?? $row['tgl_jatuh_tempo'] ?? ''));
            $statusRaw = strtolower(trim((string) ($row['status'] ?? $defaultStatus)));
            $status = in_array($statusRaw, ['submitted', 'utang', 'lunas', 'draft'], true) ? $statusRaw : $defaultStatus;

            if ($customerName === '' && $productName === '' && $productCode === '') {
                continue;
            }
            if ($customerName === '') {
                $customerName = 'Customer Umum';
            }
            if ($productName === '' && $productCode !== '') {
                $productName = $productCode;
            }

            // Fingerprint to detect identical duplicate rows inside the same Excel file
            $rowFingerprint = strtolower($ref.'|'.$customerName.'|'.$invoiceType.'|'.($productCode ?: $productName).'|'.$qty);
            if (isset($seenRowFingerprints[$rowFingerprint])) {
                $internalDuplicateRowMessages[] = "Baris #{$rowNum} ({$customerName} - {$productName} x{$qty}) sama persis dengan Baris #{$seenRowFingerprints[$rowFingerprint]}";
                continue;
            }
            $seenRowFingerprints[$rowFingerprint] = $rowNum;

            // Group key: by explicit reference if provided, otherwise per customer+type+dueDate
            $groupKey = $ref !== '' ? 'REF:'.strtoupper($ref) : 'AUTO:'.strtolower($customerName.'|'.$invoiceType.'|'.$dueDate.'|'.$dpAmount);

            if (! isset($invoiceGroups[$groupKey])) {
                $invoiceGroups[$groupKey] = [
                    'ref' => $ref,
                    'customer_name' => $customerName,
                    'invoice_type' => $invoiceType,
                    'currency' => $currency,
                    'exchange_rate' => $exchangeRate,
                    'tax_percent' => $taxPercent,
                    'dp_amount' => $dpAmount,
                    'due_date' => $dueDate !== '' && strtotime($dueDate) !== false ? date('Y-m-d', strtotime($dueDate)) : now()->addDays(14)->toDateString(),
                    'status' => $status,
                    'items' => [],
                ];
            }

            $invoiceGroups[$groupKey]['items'][] = [
                'product_code' => $productCode,
                'product_name' => $productName,
                'quantity' => $qty,
                'unit_price' => $unitPrice,
            ];
        }

        if (empty($invoiceGroups) && ! empty($internalDuplicateRowMessages)) {
            return redirect()->back()->with('error', 'Gagal Import — Semua baris di file Excel terdeteksi duplikat internal: '.implode('; ', $internalDuplicateRowMessages));
        }

        if (empty($invoiceGroups)) {
            return redirect()->back()->with('error', 'Tidak ditemukan data invoice yang valid pada file Excel/CSV.');
        }

        // Load existing invoices from DB to check duplicates
        $existingDbInvoices = Invoice::with(['order.customer', 'order.items.product'])->get();
        $existingSignaturesByName = [];
        $existingSignaturesByCode = [];
        $existingOrderIds = [];

        foreach ($existingDbInvoices as $dbInv) {
            $invLabel = 'INV-'.str_pad((string) $dbInv->id, 5, '0', STR_PAD_LEFT);
            if ($dbInv->order_id) {
                $existingOrderIds[strtoupper((string) $dbInv->order_id)] = $invLabel;
            }
            $existingOrderIds[strtoupper($invLabel)] = $invLabel;

            $cName = $dbInv->order?->customer?->name ?? '';
            $items = ($dbInv->order && $dbInv->order->items) ? $dbInv->order->items->map(fn ($it) => [
                'product_code' => $it->product?->code ?? '',
                'product_name' => $it->product?->name ?? '',
                'quantity' => (int) $it->quantity,
            ])->all() : [];

            $sigName = self::buildSignature($cName, $dbInv->invoice_type ?? 'domestik', array_map(fn ($i) => [
                'product_name' => $i['product_name'],
                'quantity' => $i['quantity'],
            ], $items));
            $sigCode = self::buildSignature($cName, $dbInv->invoice_type ?? 'domestik', array_map(fn ($i) => [
                'product_code' => $i['product_code'] ?: $i['product_name'],
                'quantity' => $i['quantity'],
            ], $items));

            $existingSignaturesByName[$sigName] = $invLabel.' ('.$cName.')';
            $existingSignaturesByCode[$sigCode] = $invLabel.' ('.$cName.')';
        }

        $importedNumbers = [];
        $duplicateReasons = $internalDuplicateRowMessages;

        DB::beginTransaction();
        try {
            foreach ($invoiceGroups as $group) {
                $refUpper = strtoupper($group['ref']);
                if ($refUpper !== '' && isset($existingOrderIds[$refUpper])) {
                    $duplicateReasons[] = "Referensi {$group['ref']} ({$group['customer_name']}) sudah ada di DB ({$existingOrderIds[$refUpper]})";
                    continue;
                }

                // Resolve Customer & Products first so we can check canonical signature accurately
                $customer = Customer::whereRaw('LOWER(name) = ?', [strtolower($group['customer_name'])])->first();
                if (! $customer) {
                    $slug = preg_replace('/[^a-z0-9]+/', '.', strtolower($group['customer_name'])) ?: 'customer';
                    $email = trim($slug, '.').'.'.random_int(100, 999).'@customer-metinca.com';
                    $customer = Customer::create([
                        'name' => $group['customer_name'],
                        'email' => $email,
                    ]);
                }

                $resolvedItems = [];
                foreach ($group['items'] as $rawItem) {
                    $product = null;
                    if ($rawItem['product_code'] !== '') {
                        $product = Product::whereRaw('LOWER(code) = ?', [strtolower($rawItem['product_code'])])->first();
                    }
                    if (! $product && $rawItem['product_name'] !== '') {
                        $product = Product::whereRaw('LOWER(name) = ?', [strtolower($rawItem['product_name'])])->first();
                    }
                    if (! $product) {
                        $newCode = $rawItem['product_code'] !== ''
                            ? strtoupper($rawItem['product_code'])
                            : 'IMP-'.strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $rawItem['product_name']) ?: 'PRD', 0, 3)).'-'.random_int(100, 999);
                        while (Product::where('code', $newCode)->exists()) {
                            $newCode = 'IMP-'.random_int(1000, 9999);
                        }
                        $product = Product::create([
                            'code' => $newCode,
                            'name' => $rawItem['product_name'] ?: $newCode,
                            'category' => 'Imported Excel',
                            'unit' => 'Unit',
                            'stock' => 100,
                            'min' => 10,
                            'location' => 'Gudang A-1',
                            'price' => $rawItem['unit_price'] > 0 ? $rawItem['unit_price'] : 100000,
                        ]);
                    }

                    $priceToUse = $rawItem['unit_price'] > 0 ? $rawItem['unit_price'] : (float) $product->price;
                    $resolvedItems[] = [
                        'product' => $product,
                        'product_code' => $product->code,
                        'product_name' => $product->name,
                        'quantity' => (int) $rawItem['quantity'],
                        'price' => $priceToUse,
                    ];
                }

                $sigByName = self::buildSignature($customer->name, $group['invoice_type'], array_map(fn ($i) => [
                    'product_name' => $i['product_name'],
                    'quantity' => $i['quantity'],
                ], $resolvedItems));

                $sigByCode = self::buildSignature($customer->name, $group['invoice_type'], array_map(fn ($i) => [
                    'product_code' => $i['product_code'],
                    'quantity' => $i['quantity'],
                ], $resolvedItems));

                if (isset($existingSignaturesByName[$sigByName]) || isset($existingSignaturesByCode[$sigByCode])) {
                    $matchedLabel = $existingSignaturesByName[$sigByName] ?? $existingSignaturesByCode[$sigByCode];
                    $duplicateReasons[] = "Data sama dengan {$matchedLabel}";
                    continue;
                }

                // Mark signatures as seen so duplicate groups within the same file are also caught
                $existingSignaturesByName[$sigByName] = $customer->name;
                $existingSignaturesByCode[$sigByCode] = $customer->name;

                $subtotal = 0.0;
                foreach ($resolvedItems as $ri) {
                    $subtotal += $ri['price'] * $ri['quantity'];
                }

                $taxPercent = (float) $group['tax_percent'];
                $taxAmount = round($subtotal * ($taxPercent / 100), 2);
                $dpAmount = min($subtotal + $taxAmount, (float) $group['dp_amount']);
                $totalAmount = round($subtotal + $taxAmount - $dpAmount, 2);

                $orderId = $group['ref'] !== '' && ! Order::whereKey($group['ref'])->exists()
                    ? $group['ref']
                    : null;

                if (! $orderId) {
                    do {
                        $orderId = sprintf('ORD-%03d-%s%d', random_int(100, 999), chr(random_int(65, 90)), random_int(1, 9));
                    } while (Order::whereKey($orderId)->exists());
                }

                $orderStatus = $group['status'] === 'lunas'
                    ? OrderStatus::LUNAS
                    : ($group['status'] === 'utang' ? OrderStatus::UTANG : OrderStatus::SUBMITTED);

                $order = Order::create([
                    'id' => $orderId,
                    'user_id' => $request->user()->id,
                    'sales_rep' => $request->user()->name,
                    'customer_id' => $customer->id,
                    'status' => $orderStatus,
                    'currency' => $group['currency'],
                    'exchange_rate' => $group['exchange_rate'],
                    'total_amount' => $totalAmount,
                    'date_raised' => now(),
                    'submitted_at' => $group['status'] === 'submitted' ? now() : null,
                ]);

                foreach ($resolvedItems as $ri) {
                    $order->items()->create([
                        'product_id' => $ri['product']->id,
                        'quantity' => $ri['quantity'],
                        'price' => $ri['price'],
                    ]);
                }

                $invoice = Invoice::create([
                    'order_id' => $order->id,
                    'invoice_type' => $group['invoice_type'],
                    'subtotal' => round($subtotal, 2),
                    'tax_percent' => $taxPercent,
                    'tax_amount' => $taxAmount,
                    'dp_amount' => round($dpAmount, 2),
                    'total_amount' => $totalAmount,
                    'currency' => $group['currency'],
                    'exchange_rate' => $group['exchange_rate'],
                    'due_date' => $group['due_date'],
                    'delivery_date' => now()->addDays(5)->toDateString(),
                    'status' => $group['status'],
                    'submitted_at' => $group['status'] === 'submitted' ? now() : null,
                ]);

                $invNumber = 'INV-'.str_pad((string) $invoice->id, 5, '0', STR_PAD_LEFT);
                $importedNumbers[] = $invNumber;
                $existingOrderIds[strtoupper($orderId)] = $invNumber;

                if ($group['status'] === 'submitted') {
                    NotificationService::notifyRole(
                        UserRole::ACCOUNTING,
                        'Invoice Import Excel Menunggu Validasi ('.$invNumber.')',
                        ($request->user()?->name ?? 'Staff Sales').' mengimpor '.$invNumber.' dari Excel untuk customer '.$customer->name.' senilai Rp '.number_format($totalAmount, 0, ',', '.').'.',
                        '/accounting/inbox',
                        'invoice_submitted',
                        Auth::id()
                    );
                }
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();

            return redirect()->back()->with('error', 'Gagal mengimpor file Excel: '.$e->getMessage());
        }

        $importedCount = count($importedNumbers);
        $dupCount = count($duplicateReasons);

        if ($importedCount === 0 && $dupCount > 0) {
            return redirect()->back()->with(
                'error',
                "Pengecekan Duplikat: Seluruh data ({$dupCount} invoice) pada file Excel terdeteksi SUDAH ADA / SAMA di database (".implode('; ', array_slice($duplicateReasons, 0, 3)).'). Tidak ada data ganda yang dimasukkan.'
            );
        }

        $msg = "Berhasil mengimpor {$importedCount} invoice baru dari Excel ke database (".implode(', ', $importedNumbers).').';
        if ($dupCount > 0) {
            $msg .= " Pengecekan Duplikat: {$dupCount} data yang sama otomatis dilewati (".implode('; ', array_slice($duplicateReasons, 0, 3)).').';
        } else {
            $msg .= ' Pengecekan Duplikat: Tidak ditemukan data yang sama (0 duplikat).';
        }

        return redirect()->route('sales.invoice_rekap')->with('success', $msg);
    }
}
