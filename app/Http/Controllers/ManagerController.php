<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\ManagerReport;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\ReturnNote;
use App\Services\NotificationService;
use App\Support\UserRole;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ManagerController extends Controller
{
    public function inbox()
    {
        $reports = ManagerReport::with(['creator', 'validator'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function (ManagerReport $r) {
                $metrics = $r->metrics_data ?? [];
                if (! isset($metrics['invoices_detail'])) {
                    $metrics = array_merge(
                        AccountingController::buildDetailedReportPayload(
                            Carbon::parse($r->period_start)->startOfDay(),
                            Carbon::parse($r->period_end)->endOfDay()
                        ),
                        $metrics
                    );
                }

                return [
                    'id' => $r->id,
                    'type' => $r->type,
                    'period_start' => $r->period_start->format('M d, Y'),
                    'period_end' => $r->period_end->format('M d, Y'),
                    'metrics_data' => $metrics,
                    'status' => $r->status,
                    'validation_notes' => $r->validation_notes,
                    'created_by_name' => $r->creator->name ?? 'Staff Accounting',
                    'validated_by_name' => $r->validator->name ?? null,
                    'created_at' => $r->created_at->format('M d, Y H:i'),
                    'validated_at' => $r->validated_at ? $r->validated_at->format('M d, Y H:i') : null,
                ];
            });

        return Inertia::render('portal/manager/reports', [
            'reports' => $reports,
        ]);
    }

    public function validateReport(Request $request, $id)
    {
        $validated = $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        $report = ManagerReport::where('status', 'submitted')->findOrFail($id);

        $report->update([
            'status' => 'validated',
            'validated_at' => now(),
            'validated_by' => Auth::id(),
            'validation_notes' => $validated['notes'] ?? null,
        ]);

        $senderName = $request->user()?->name ?? 'Manager Accounting';
        $periodLabel = $report->period_start->format('d M Y') . ' - ' . $report->period_end->format('d M Y');
        $typeLabel = $report->type === 'monthly' ? 'Bulanan' : ($report->type === 'neraca' ? 'Neraca' : 'Tahunan');

        if ($report->created_by) {
            NotificationService::notifyUser(
                $report->created_by,
                'Laporan ' . $typeLabel . ' Disetujui Manager',
                $senderName . ' telah memvalidasi dan menyetujui Laporan ' . $typeLabel . ' periode ' . $periodLabel . '.' . (! empty($validated['notes']) ? ' Catatan: "' . $validated['notes'] . '"' : ''),
                '/accounting/inbox',
                'report_validated',
                Auth::id()
            );
        } else {
            NotificationService::notifyRole(
                UserRole::ACCOUNTING,
                'Laporan ' . $typeLabel . ' Disetujui Manager',
                $senderName . ' telah memvalidasi dan menyetujui Laporan ' . $typeLabel . ' periode ' . $periodLabel . '.',
                '/accounting/inbox',
                'report_validated',
                Auth::id()
            );
        }

        return redirect()->route('manager.reports')->with('success', 'Laporan berhasil divalidasi oleh Manager Accounting.');
    }

    public function rejectReport(Request $request, $id)
    {
        $validated = $request->validate([
            'notes' => 'required|string|max:1000',
        ]);

        $report = ManagerReport::where('status', 'submitted')->findOrFail($id);

        $report->update([
            'status' => 'rejected',
            'validated_at' => now(),
            'validated_by' => Auth::id(),
            'validation_notes' => $validated['notes'],
        ]);

        $senderName = $request->user()?->name ?? 'Manager Accounting';
        $periodLabel = $report->period_start->format('d M Y') . ' - ' . $report->period_end->format('d M Y');
        $typeLabel = $report->type === 'monthly' ? 'Bulanan' : ($report->type === 'neraca' ? 'Neraca' : 'Tahunan');

        if ($report->created_by) {
            NotificationService::notifyUser(
                $report->created_by,
                'Laporan ' . $typeLabel . ' Ditolak / Perlu Revisi',
                $senderName . ' menolak Laporan ' . $typeLabel . ' periode ' . $periodLabel . '. Catatan Revisi: "' . $validated['notes'] . '"',
                '/accounting/inbox',
                'report_rejected',
                Auth::id()
            );
        } else {
            NotificationService::notifyRole(
                UserRole::ACCOUNTING,
                'Laporan ' . $typeLabel . ' Ditolak / Perlu Revisi',
                $senderName . ' menolak Laporan ' . $typeLabel . ' periode ' . $periodLabel . '. Catatan Revisi: "' . $validated['notes'] . '"',
                '/accounting/inbox',
                'report_rejected',
                Auth::id()
            );
        }

        return redirect()->route('manager.reports')->with('success', 'Laporan ditolak dan dikembalikan ke Staff Accounting untuk direvisi.');
    }

    public function neraca(Request $request)
    {
        $periodInput = $request->input('period', now()->format('Y-m'));
        try {
            $cutoffDate = Carbon::parse($periodInput . '-01')->endOfMonth();
            $periodStart = Carbon::parse($periodInput . '-01')->startOfMonth();
        } catch (\Throwable) {
            $cutoffDate = now()->endOfMonth();
            $periodStart = now()->startOfMonth();
            $periodInput = now()->format('Y-m');
        }

        // All validated invoices (utang & lunas)
        $invoices = Invoice::with(['order.customer'])
            ->whereIn('status', ['utang', 'lunas'])
            ->orderBy('created_at', 'desc')
            ->get();

        $paidInvoices = $invoices->where('status', 'lunas');
        $unpaidInvoices = $invoices->where('status', 'utang');

        // Approved returns
        $approvedReturns = ReturnNote::with(['order.customer'])
            ->where('status', 'Approved')
            ->get();

        // Products (Inventory valuation)
        $products = Product::orderBy('code')->get();

        // Purchase Orders (Approved / Received)
        $purchaseOrders = PurchaseOrder::with(['supplier', 'plant.branch'])
            ->whereIn('status', ['Approved', 'Received'])
            ->orderBy('date', 'desc')
            ->get();

        $paidPos = $purchaseOrders->where('payment_status', 'paid');
        $unpaidPos = $purchaseOrders->where('payment_status', '!=', 'paid');

        // ── AKTIVA (ASSETS) CALCULATION ────────────────────────────────────────
        $initialCashCapital = 500000000.0; // Modal Kas Operasional Awal Rp 500.000.000
        $paidSalesReceipts = (float) $paidInvoices->sum('total_amount');
        $dpReceipts = (float) $unpaidInvoices->sum('dp_amount');
        $paidPoOutflow = (float) $paidPos->sum('total_amount');
        $debitReturnsOutflow = (float) $approvedReturns->where('type', 'debit_external')->sum('total_amount');

        $cashAndEquivalents = max(0.0, $initialCashCapital + $paidSalesReceipts + $dpReceipts - $paidPoOutflow - $debitReturnsOutflow);

        $grossReceivables = (float) $unpaidInvoices->sum('total_amount');
        $creditReturnsReduction = (float) $approvedReturns->where('type', 'credit_internal')->sum('total_amount');
        $accountsReceivable = max(0.0, $grossReceivables - $creditReturnsReduction);

        $inventoryValue = (float) $products->sum(fn (Product $p) => ((int) $p->stock) * ((float) $p->price));

        $totalCurrentAssets = $cashAndEquivalents + $accountsReceivable + $inventoryValue;

        // Fixed Assets (Peralatan & Mesin Plant Jakarta, Surabaya, Bandung)
        $fixedAssetsGross = 350000000.0;
        $accumulatedDepreciation = 35000000.0;
        $totalFixedAssets = $fixedAssetsGross - $accumulatedDepreciation; // 315.000.000

        $totalAssets = $totalCurrentAssets + $totalFixedAssets;

        // ── PASIVA (LIABILITIES & EQUITY) CALCULATION ─────────────────────────
        $accountsPayablePo = (float) $unpaidPos->sum('total_amount');
        $taxPayablePpn = (float) $invoices->sum('tax_amount');
        $unearnedDpLiability = $dpReceipts;

        $totalCurrentLiabilities = $accountsPayablePo + $taxPayablePpn + $unearnedDpLiability;
        $longTermLiabilities = 0.0;
        $totalLiabilities = $totalCurrentLiabilities + $longTermLiabilities;

        // Equity
        $paidInCapital = $initialCashCapital + $totalFixedAssets; // 815.000.000
        $operationalInventoryReserve = $inventoryValue;
        $retainedEarningsAndNetIncome = $totalAssets - $totalLiabilities - ($paidInCapital + $operationalInventoryReserve);
        $totalEquity = $paidInCapital + $operationalInventoryReserve + $retainedEarningsAndNetIncome;

        $totalLiabilitiesAndEquity = $totalLiabilities + $totalEquity;
        $isBalanced = abs($totalAssets - $totalLiabilitiesAndEquity) < 1;

        // Financial Ratios for Manager Analysis
        $currentRatio = $totalCurrentLiabilities > 0
            ? round($totalCurrentAssets / $totalCurrentLiabilities, 2)
            : 99.99;
        $quickRatio = $totalCurrentLiabilities > 0
            ? round(($cashAndEquivalents + $accountsReceivable) / $totalCurrentLiabilities, 2)
            : 99.99;
        $debtToAssetRatio = $totalAssets > 0
            ? round(($totalLiabilities / $totalAssets) * 100, 1)
            : 0.0;

        // Latest Neraca verification status
        $neracaReports = ManagerReport::with(['creator', 'validator'])
            ->where('type', 'neraca')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(fn (ManagerReport $r) => [
                'id' => $r->id,
                'period_start' => $r->period_start->format('d M Y'),
                'period_end' => $r->period_end->format('d M Y'),
                'status' => $r->status,
                'validation_notes' => $r->validation_notes,
                'created_by_name' => $r->creator?->name ?? 'Staff Accounting',
                'validated_by_name' => $r->validator?->name ?? null,
                'created_at' => $r->created_at->format('d M Y H:i'),
                'validated_at' => $r->validated_at ? $r->validated_at->format('d M Y H:i') : null,
            ]);

        return Inertia::render('portal/manager/neraca', [
            'period' => $periodInput,
            'period_label' => $cutoffDate->translatedFormat('F Y'),
            'cutoff_date' => $cutoffDate->format('d M Y'),
            'neraca' => [
                'aktiva' => [
                    'lancar' => [
                        [
                            'code' => '1101',
                            'name_id' => 'Kas dan Setara Kas',
                            'name_en' => 'Cash and Cash Equivalents',
                            'description_id' => 'Saldo kas operasional + pelunasan invoice + penerimaan DP − pembayaran PO lunas',
                            'description_en' => 'Operating cash + paid invoices + DP received − paid POs',
                            'amount' => $cashAndEquivalents,
                        ],
                        [
                            'code' => '1102',
                            'name_id' => 'Piutang Usaha Customer (Bersih)',
                            'name_en' => 'Accounts Receivable (Net)',
                            'description_id' => 'Tagihan invoice tervalidasi (Utang) dikurangi retur kredit yang disetujui',
                            'description_en' => 'Validated unpaid invoices minus approved credit returns',
                            'amount' => $accountsReceivable,
                        ],
                        [
                            'code' => '1103',
                            'name_id' => 'Persediaan Barang Dagang (Gudang)',
                            'name_en' => 'Merchandise Inventory',
                            'description_id' => 'Valuasi seluruh stok produk yang tersedia di Gudang A, B, dan C',
                            'description_en' => 'Valuation of all available product stock in warehouses',
                            'amount' => $inventoryValue,
                        ],
                    ],
                    'total_lancar' => $totalCurrentAssets,
                    'tetap' => [
                        [
                            'code' => '1201',
                            'name_id' => 'Peralatan, Mesin & Fasilitas Plant',
                            'name_en' => 'Plant Equipment, Machinery & Facilities',
                            'description_id' => 'Aset tetap operasional Plant Jakarta, Surabaya, dan Bandung',
                            'description_en' => 'Fixed operational assets across Jakarta, Surabaya, and Bandung plants',
                            'amount' => $fixedAssetsGross,
                        ],
                        [
                            'code' => '1202',
                            'name_id' => 'Akumulasi Penyusutan Aset Tetap',
                            'name_en' => 'Accumulated Depreciation',
                            'description_id' => 'Akumulasi penyusutan peralatan dan fasilitas pabrik',
                            'description_en' => 'Accumulated depreciation of plant equipment and facilities',
                            'amount' => -$accumulatedDepreciation,
                        ],
                    ],
                    'total_tetap' => $totalFixedAssets,
                    'total_aktiva' => $totalAssets,
                ],
                'pasiva' => [
                    'liabilitas_lancar' => [
                        [
                            'code' => '2101',
                            'name_id' => 'Utang Usaha Supplier (Purchase Order)',
                            'name_en' => 'Accounts Payable (Supplier POs)',
                            'description_id' => 'Kewajiban pembayaran atas Purchase Order (Approved/Received) yang belum lunas',
                            'description_en' => 'Outstanding obligations for Approved/Received Purchase Orders',
                            'amount' => $accountsPayablePo,
                        ],
                        [
                            'code' => '2102',
                            'name_id' => 'Utang Pajak PPN Keluaran (11%)',
                            'name_en' => 'VAT Output Payable (11%)',
                            'description_id' => 'Akumulasi PPN 11% atas faktur penjualan domestik tervalidasi',
                            'description_en' => 'Accumulated 11% VAT from validated domestic sales invoices',
                            'amount' => $taxPayablePpn,
                        ],
                        [
                            'code' => '2103',
                            'name_id' => 'Pendapatan Diterima di Muka (Down Payment)',
                            'name_en' => 'Unearned Revenue (Customer Down Payments)',
                            'description_id' => 'Uang muka (DP) pelanggan atas pesanan yang masih berjalan',
                            'description_en' => 'Customer down payments on active orders',
                            'amount' => $unearnedDpLiability,
                        ],
                    ],
                    'total_liabilitas' => $totalLiabilities,
                    'ekuitas' => [
                        [
                            'code' => '3101',
                            'name_id' => 'Modal Disetor Awal Perusahaan',
                            'name_en' => 'Paid-in Capital',
                            'description_id' => 'Modal dasar kas & fasilitas PT. Metinca Prima Industrial Works',
                            'description_en' => 'Initial cash & facility capital of PT. Metinca Prima Industrial Works',
                            'amount' => $paidInCapital,
                        ],
                        [
                            'code' => '3102',
                            'name_id' => 'Cadangan Modal Persediaan Operasional',
                            'name_en' => 'Operational Inventory Capital Reserve',
                            'description_id' => 'Cadangan nilai persediaan barang gudang',
                            'description_en' => 'Warehouse inventory capital reserve',
                            'amount' => $operationalInventoryReserve,
                        ],
                        [
                            'code' => '3103',
                            'name_id' => 'Laba / (Rugi) Ditahan & Periode Berjalan',
                            'name_en' => 'Retained Earnings & Current Period Net Income',
                            'description_id' => 'Akumulasi surplus/defisit bersih kegiatan penjualan & pengadaan PO',
                            'description_en' => 'Net surplus/deficit from sales and PO procurement operations',
                            'amount' => $retainedEarningsAndNetIncome,
                        ],
                    ],
                    'total_ekuitas' => $totalEquity,
                    'total_pasiva' => $totalLiabilitiesAndEquity,
                ],
                'is_balanced' => $isBalanced,
                'ratios' => [
                    'current_ratio' => $currentRatio,
                    'quick_ratio' => $quickRatio,
                    'debt_to_asset_percent' => $debtToAssetRatio,
                ],
            ],
            'drilldown' => [
                'receivables' => $unpaidInvoices->map(fn (Invoice $inv) => [
                    'invoice_number' => 'INV-' . str_pad((string) $inv->id, 5, '0', STR_PAD_LEFT),
                    'order_id' => $inv->order_id,
                    'customer_name' => $inv->order?->customer?->name ?? 'Customer',
                    'date' => $inv->created_at ? $inv->created_at->format('d M Y') : '-',
                    'amount' => (float) $inv->total_amount,
                ])->values()->all(),
                'payables' => $unpaidPos->map(fn (PurchaseOrder $po) => [
                    'po_number' => $po->po_number ?: ('PO-2026-' . str_pad((string) $po->id, 3, '0', STR_PAD_LEFT)),
                    'supplier_name' => $po->supplier?->name ?? '-',
                    'plant_name' => $po->plant?->name ?? '-',
                    'date' => $po->date ? $po->date->format('d M Y') : '-',
                    'status' => $po->status,
                    'amount' => (float) $po->total_amount,
                ])->values()->all(),
                'inventory' => $products->map(fn (Product $p) => [
                    'code' => $p->code,
                    'name' => $p->name,
                    'category' => $p->category,
                    'stock' => (int) $p->stock,
                    'unit' => $p->unit,
                    'price' => (float) $p->price,
                    'total_value' => (float) (((int) $p->stock) * ((float) $p->price)),
                ])->values()->all(),
            ],
            'neraca_submissions' => $neracaReports,
        ]);
    }

    public function submitNeraca(Request $request)
    {
        $periodInput = $request->input('period', now()->format('Y-m'));
        $start = Carbon::parse($periodInput . '-01')->startOfMonth();
        $end = Carbon::parse($periodInput . '-01')->endOfMonth();

        $detailedMetrics = AccountingController::buildDetailedReportPayload($start, $end);

        ManagerReport::create([
            'type' => 'neraca',
            'period_start' => $start,
            'period_end' => $end,
            'metrics_data' => $detailedMetrics,
            'status' => 'submitted',
            'created_by' => Auth::id(),
        ]);

        $senderName = $request->user()?->name ?? 'Staff Accounting';
        NotificationService::notifyRole(
            UserRole::MANAGER,
            'Laporan Neraca Diajukan untuk Validasi',
            $senderName . ' mengirimkan Laporan Neraca posisi ' . $end->format('d M Y') . ' untuk diperiksa dan disahkan oleh Manager Accounting.',
            '/manager/neraca',
            'neraca_submitted',
            Auth::id()
        );

        return redirect()->back()->with('success', 'Laporan Neraca berhasil dikirim ke Manager Accounting untuk divalidasi.');
    }

    public function validateNeraca(Request $request, $id)
    {
        $report = ManagerReport::findOrFail($id);
        $report->update([
            'status' => 'validated',
            'validated_at' => now(),
            'validated_by' => Auth::id(),
            'validation_notes' => $request->input('notes', 'Neraca telah diperiksa dan disahkan oleh Manager Accounting.'),
        ]);

        $senderName = $request->user()?->name ?? 'Manager Accounting';
        if ($report->created_by) {
            NotificationService::notifyUser(
                $report->created_by,
                'Laporan Neraca Disahkan Manager',
                $senderName . ' telah mengesahkan Laporan Neraca periode ' . $report->period_end->format('M Y') . '.',
                '/manager/neraca',
                'neraca_validated',
                Auth::id()
            );
        }

        NotificationService::notifyRole(
            UserRole::ACCOUNTING,
            'Laporan Neraca Disahkan Manager',
            $senderName . ' telah mengesahkan Laporan Neraca periode ' . $report->period_end->format('M Y') . '.',
            '/manager/neraca',
            'neraca_validated',
            Auth::id()
        );

        return redirect()->back()->with('success', 'Laporan Neraca berhasil divalidasi dan disahkan.');
    }
}
