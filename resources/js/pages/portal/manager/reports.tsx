import { Head, useForm } from '@inertiajs/react';
import {
    ClipboardList,
    Check,
    X,
    FileSpreadsheet,
    FileText,
    Calendar,
    Printer,
    Download,
    Users,
    Package,
    ShoppingCart,
    Undo2,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import * as React from 'react';
import { useCurrency } from '@/components/currency-context';
import { useLanguage } from '@/components/language-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

interface InvoiceLineDetail {
    product_code: string;
    product_name: string;
    unit: string;
    quantity: number;
    price: number;
    subtotal: number;
}

interface DetailedInvoiceRow {
    id: number;
    invoice_number: string;
    order_id: string;
    customer_name: string;
    sales_rep: string;
    invoice_type: string;
    currency: string;
    exchange_rate: number;
    subtotal: number;
    tax_percent: number;
    tax_amount: number;
    dp_amount: number;
    total_amount: number;
    status: string;
    date_raised: string;
    validated_at: string;
    due_date: string;
    items: InvoiceLineDetail[];
}

interface CustomerBreakdownRow {
    customer_name: string;
    customer_email: string;
    invoices_count: number;
    subtotal: number;
    tax_amount: number;
    dp_amount: number;
    total_amount: number;
    paid_amount: number;
    unpaid_amount: number;
}

interface ProductBreakdownRow {
    product_code: string;
    product_name: string;
    category: string;
    unit: string;
    quantity_sold: number;
    unit_price: number;
    total_revenue: number;
}

interface ReturnDetailRow {
    id: number;
    return_number: string;
    order_id: string;
    customer_name: string;
    type: string;
    reason: string;
    date: string;
    status: string;
    total_amount: number;
}

interface PurchaseOrderDetailRow {
    id: number;
    po_number: string;
    supplier_name: string;
    plant_name: string;
    date: string;
    status: string;
    payment_status: string;
    items_count: number;
    total_amount: number;
}

interface ReportMetrics {
    gross_sales?: number;
    total_tax?: number;
    total_dp?: number;
    total_returns?: number;
    total_sales: number;
    net_revenue?: number;
    total_invoices: number;
    paid_invoices: number;
    unpaid_invoices: number;
    paid_sales: number;
    unpaid_sales: number;
    domestic_invoices?: number;
    international_invoices?: number;
    domestic_sales?: number;
    international_sales?: number;
    returns_count?: number;
    po_count?: number;
    total_po_amount?: number;
    invoices_detail?: DetailedInvoiceRow[];
    customer_breakdown?: CustomerBreakdownRow[];
    product_breakdown?: ProductBreakdownRow[];
    returns_detail?: ReturnDetailRow[];
    purchase_orders_detail?: PurchaseOrderDetailRow[];
}

interface ReportItem {
    id: number;
    type: string;
    period_start: string;
    period_end: string;
    metrics_data: ReportMetrics;
    status: string;
    validation_notes: string | null;
    created_by_name: string;
    validated_by_name?: string | null;
    created_at: string;
    validated_at: string | null;
}

interface ReportsProps {
    reports: ReportItem[];
}

export default function ReportsInbox({ reports }: ReportsProps) {
    const { formatPrice } = useCurrency();
    const { t } = useLanguage();
    const { data, setData, post, processing, reset } = useForm({
        notes: '',
    });

    const [selectedReport, setSelectedReport] =
        React.useState<ReportItem | null>(reports[0] ?? null);
    const [activeTab, setActiveTab] = React.useState<
        'invoices' | 'customers' | 'products' | 'returns_po'
    >('invoices');
    const [expandedInvoices, setExpandedInvoices] = React.useState<
        Record<number, boolean>
    >({});
    const [isRejecting, setIsRejecting] = React.useState(false);

    React.useEffect(() => {
        if (selectedReport) {
            const updated = reports.find((r) => r.id === selectedReport.id);
            if (updated) {
                setSelectedReport(updated);
            }
        } else if (reports.length > 0) {
            setSelectedReport(reports[0]);
        }
    }, [reports]);

    const toggleInvoiceExpand = (id: number) => {
        setExpandedInvoices((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleValidate = (reportId: number) => {
        if (
            confirm(
                t(
                    'Apakah Anda yakin ingin menyetujui dan mengesahkan laporan detail ini?',
                    'Are you sure you want to approve and validate this detailed report?',
                ),
            )
        ) {
            post(`/manager/reports/${reportId}/validate`, {
                onSuccess: () => {
                    reset('notes');
                },
            });
        }
    };

    const handleReject = (e: React.FormEvent, reportId: number) => {
        e.preventDefault();

        if (!data.notes.trim()) {
            alert(
                t(
                    'Catatan penolakan/revisi wajib diisi.',
                    'Rejection notes are required.',
                ),
            );
            return;
        }

        post(`/manager/reports/${reportId}/reject`, {
            onSuccess: () => {
                setIsRejecting(false);
                reset('notes');
            },
        });
    };

    const handleExportCsv = () => {
        if (!selectedReport) return;
        const invoices = selectedReport.metrics_data.invoices_detail ?? [];
        const headers = [
            'No Invoice',
            'ID Order',
            'Tanggal Validasi',
            'Nama Customer',
            'Sales Rep',
            'Tipe',
            'Subtotal',
            'PPN',
            'DP',
            'Total Tagihan',
            'Status Pembayaran',
        ];
        const rows = invoices.map((inv) => [
            inv.invoice_number,
            inv.order_id,
            inv.validated_at,
            inv.customer_name,
            inv.sales_rep,
            inv.invoice_type,
            inv.subtotal,
            inv.tax_amount,
            inv.dp_amount,
            inv.total_amount,
            inv.status.toUpperCase(),
        ]);

        const csvContent = [headers, ...rows]
            .map((r) =>
                r
                    .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
                    .join(','),
            )
            .join('\n');

        const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `laporan_detail_${selectedReport.type}_${selectedReport.id}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrintReport = () => {
        if (!selectedReport) return;
        const m = selectedReport.metrics_data;
        const invoices = m.invoices_detail ?? [];
        const customers = m.customer_breakdown ?? [];
        const products = m.product_breakdown ?? [];

        const printWindow = window.open('', '_blank', 'width=1000,height=900');
        if (!printWindow) return;

        const formatIdr = (val: number) =>
            new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
            }).format(val || 0);

        const invoiceRowsHtml = invoices
            .map(
                (inv, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${inv.invoice_number}</strong><br/><small>${inv.order_id}</small></td>
                <td>${inv.validated_at}</td>
                <td><strong>${inv.customer_name}</strong><br/><small>Sales: ${inv.sales_rep}</small></td>
                <td>${inv.invoice_type.toUpperCase()}</td>
                <td style="text-align:right">${formatIdr(inv.subtotal)}</td>
                <td style="text-align:right">${formatIdr(inv.tax_amount)}</td>
                <td style="text-align:right">${formatIdr(inv.dp_amount)}</td>
                <td style="text-align:right"><strong>${formatIdr(inv.total_amount)}</strong></td>
                <td style="text-align:center">${inv.status.toUpperCase()}</td>
            </tr>
        `,
            )
            .join('');

        const customerRowsHtml = customers
            .map(
                (c, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${c.customer_name}</strong></td>
                <td style="text-align:center">${c.invoices_count}</td>
                <td style="text-align:right">${formatIdr(c.subtotal)}</td>
                <td style="text-align:right">${formatIdr(c.tax_amount)}</td>
                <td style="text-align:right">${formatIdr(c.paid_amount)}</td>
                <td style="text-align:right">${formatIdr(c.unpaid_amount)}</td>
                <td style="text-align:right"><strong>${formatIdr(c.total_amount)}</strong></td>
            </tr>
        `,
            )
            .join('');

        const productRowsHtml = products
            .map(
                (p, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${p.product_code}</td>
                <td><strong>${p.product_name}</strong></td>
                <td>${p.category}</td>
                <td style="text-align:center">${p.quantity_sold} ${p.unit}</td>
                <td style="text-align:right">${formatIdr(p.unit_price)}</td>
                <td style="text-align:right"><strong>${formatIdr(p.total_revenue)}</strong></td>
            </tr>
        `,
            )
            .join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8" />
                <title>Laporan Detail Keuangan & Penjualan #${selectedReport.id}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 28px; color: #0f172a; font-size: 11px; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px; }
                    .title { font-size: 18px; font-weight: 900; margin: 0; }
                    .subtitle { font-size: 11px; color: #475569; margin-top: 4px; }
                    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
                    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background: #f8fafc; }
                    .box-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; }
                    .box-val { font-size: 13px; font-weight: bold; margin-top: 4px; color: #0f172a; }
                    h3 { font-size: 12px; text-transform: uppercase; margin: 18px 0 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10.5px; }
                    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
                    th { background: #f1f5f9; font-weight: bold; text-transform: uppercase; font-size: 9.5px; }
                    .sign { display: flex; justify-content: space-between; margin-top: 36px; padding: 0 32px; }
                    .sign-box { text-align: center; width: 220px; }
                    .sign-space { height: 60px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div style="display:flex;align-items:center;gap:14px;">
                        <img src="/Logo-metinca.webp" alt="Logo Metinca" style="height:48px;width:auto;object-fit:contain;" />
                        <div>
                            <div class="title">PT. METINCA PRIMA INDUSTRIAL WORKS</div>
                            <div class="subtitle">Laporan Detail Keuangan, Penjualan, Customer & Pengadaan</div>
                        </div>
                    </div>
                    <div style="text-align:right">
                        <div style="font-size:14px;font-weight:bold;color:#2563eb;">LAPORAN ${selectedReport.type === 'monthly' ? 'BULANAN' : 'TAHUNAN'}</div>
                        <div>Periode: ${selectedReport.period_start} s/d ${selectedReport.period_end}</div>
                        <div>Status: <strong>${selectedReport.status.toUpperCase()}</strong></div>
                    </div>
                </div>

                <div class="grid">
                    <div class="box"><div class="box-label">Penjualan Kotor (Subtotal)</div><div class="box-val">${formatIdr(m.gross_sales ?? m.total_sales)}</div></div>
                    <div class="box"><div class="box-label">Total PPN (11%)</div><div class="box-val">${formatIdr(m.total_tax ?? 0)}</div></div>
                    <div class="box"><div class="box-label">Total Uang Muka (DP)</div><div class="box-val">${formatIdr(m.total_dp ?? 0)}</div></div>
                    <div class="box"><div class="box-label">Total Tagihan Penjualan</div><div class="box-val">${formatIdr(m.total_sales)}</div></div>
                    <div class="box"><div class="box-label">Penjualan Lunas (${m.paid_invoices} Inv)</div><div class="box-val" style="color:#15803d">${formatIdr(m.paid_sales)}</div></div>
                    <div class="box"><div class="box-label">Piutang Customer (${m.unpaid_invoices} Inv)</div><div class="box-val" style="color:#b45309">${formatIdr(m.unpaid_sales)}</div></div>
                    <div class="box"><div class="box-label">Total Retur Disetujui</div><div class="box-val" style="color:#dc2626">${formatIdr(m.total_returns ?? 0)}</div></div>
                    <div class="box"><div class="box-label">Total Pengadaan PO</div><div class="box-val">${formatIdr(m.total_po_amount ?? 0)}</div></div>
                </div>

                <h3>I. Rincian Transaksi Faktur Invoice</h3>
                <table>
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>No. Invoice / Order</th>
                            <th>Tgl Validasi</th>
                            <th>Customer & Sales</th>
                            <th>Tipe</th>
                            <th style="text-align:right">Subtotal</th>
                            <th style="text-align:right">PPN</th>
                            <th style="text-align:right">DP</th>
                            <th style="text-align:right">Total Tagihan</th>
                            <th style="text-align:center">Status</th>
                        </tr>
                    </thead>
                    <tbody>${invoiceRowsHtml}</tbody>
                </table>

                <h3>II. Rekapitulasi Penjualan per Customer</h3>
                <table>
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Nama Customer</th>
                            <th style="text-align:center">Jml Invoice</th>
                            <th style="text-align:right">Subtotal</th>
                            <th style="text-align:right">PPN</th>
                            <th style="text-align:right">Nilai Lunas</th>
                            <th style="text-align:right">Sisa Piutang (Utang)</th>
                            <th style="text-align:right">Total Transaksi</th>
                        </tr>
                    </thead>
                    <tbody>${customerRowsHtml}</tbody>
                </table>

                <h3>III. Rekapitulasi Penjualan per Produk</h3>
                <table>
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Kode</th>
                            <th>Nama Produk</th>
                            <th>Kategori</th>
                            <th style="text-align:center">Qty Terjual</th>
                            <th style="text-align:right">Harga Satuan</th>
                            <th style="text-align:right">Total Pendapatan</th>
                        </tr>
                    </thead>
                    <tbody>${productRowsHtml}</tbody>
                </table>

                <div class="sign">
                    <div class="sign-box">
                        <div>Disusun Oleh,</div>
                        <div class="sign-space"></div>
                        <div><strong>${selectedReport.created_by_name}</strong></div>
                        <div>Staff Accounting</div>
                    </div>
                    <div class="sign-box">
                        <div>Diperiksa & Disahkan Oleh,</div>
                        <div class="sign-space"></div>
                        <div><strong>${selectedReport.validated_by_name || 'Manager Accounting'}</strong></div>
                        <div>Manager Accounting</div>
                    </div>
                </div>
                <script>window.onload = function() { window.print(); };</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const m = selectedReport?.metrics_data;
    const invoicesList = m?.invoices_detail ?? [];
    const customerList = m?.customer_breakdown ?? [];
    const productList = m?.product_breakdown ?? [];
    const returnsList = m?.returns_detail ?? [];
    const poList = m?.purchase_orders_detail ?? [];

    return (
        <>
            <Head
                title={t(
                    'Inbox Laporan Detail - Manager Accounting',
                    'Detailed Report Inbox - Manager Accounting',
                )}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:gap-6 sm:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {t(
                                'Inbox Laporan Detail Keuangan & Penjualan',
                                'Detailed Financial & Sales Report Inbox',
                            )}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {t(
                                'Tinjau rincian lengkap faktur invoice, item produk, rekap per customer, retur, dan pengadaan PO sebelum memvalidasi laporan.',
                                'Review complete invoice transactions, product items, customer recaps, returns, and POs before validating reports.',
                            )}
                        </p>
                    </div>

                    {selectedReport && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePrintReport}
                                className="gap-1.5"
                            >
                                <Printer className="size-4" />
                                {t('Cetak Laporan PDF', 'Print Detailed PDF')}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportCsv}
                                className="gap-1.5 border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100/70"
                            >
                                <FileSpreadsheet className="size-4 text-emerald-600" />
                                {t('Export CSV', 'Export CSV')}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Daftar Laporan Masuk */}
                <Card className="border border-sidebar-border/70">
                    <CardHeader className="pb-3 bg-muted/20 border-b">
                        <CardTitle className="text-base flex items-center gap-2">
                            <ClipboardList className="size-4 text-primary" />
                            {t(
                                'Daftar Laporan dari Staff Accounting',
                                'Submitted Reports from Staff Accounting',
                            )}
                        </CardTitle>
                        <CardDescription>
                            {t(
                                'Pilih salah satu laporan di bawah untuk membuka rincian lengkap transaksi pada periode tersebut.',
                                'Click a report row below to inspect its complete transaction details.',
                            )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('ID', 'ID')}</TableHead>
                                    <TableHead>
                                        {t('Tipe Laporan', 'Report Type')}
                                    </TableHead>
                                    <TableHead>
                                        {t('Periode Laporan', 'Period')}
                                    </TableHead>
                                    <TableHead>
                                        {t('Disusun Oleh', 'Prepared By')}
                                    </TableHead>
                                    <TableHead>
                                        {t('Tanggal Kirim', 'Date Submitted')}
                                    </TableHead>
                                    <TableHead className="text-right">
                                        {t('Total Penjualan', 'Total Sales')}
                                    </TableHead>
                                    <TableHead className="text-center">
                                        {t('Jml Invoice', 'Invoices')}
                                    </TableHead>
                                    <TableHead className="text-center">
                                        {t('Status', 'Status')}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reports.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={8}
                                            className="h-28 text-center text-muted-foreground"
                                        >
                                            {t(
                                                'Belum ada laporan masuk dari Staff Accounting.',
                                                'No reports in the inbox.',
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    reports.map((rep) => (
                                        <TableRow
                                            key={rep.id}
                                            className={`cursor-pointer transition-colors ${
                                                selectedReport?.id === rep.id
                                                    ? 'bg-blue-50/70 dark:bg-blue-950/30 font-medium'
                                                    : 'hover:bg-muted/50'
                                            }`}
                                            onClick={() => {
                                                setSelectedReport(rep);
                                                setIsRejecting(false);
                                                reset('notes');
                                            }}
                                        >
                                            <TableCell className="font-mono text-xs font-bold">
                                                #RPT-
                                                {String(rep.id).padStart(
                                                    3,
                                                    '0',
                                                )}
                                            </TableCell>
                                            <TableCell className="font-semibold flex items-center gap-2">
                                                <FileText className="size-4 text-blue-600" />
                                                {rep.type === 'monthly'
                                                    ? t(
                                                          'Laporan Bulanan',
                                                          'Monthly Report',
                                                      )
                                                    : rep.type === 'neraca'
                                                      ? t(
                                                            'Laporan Neraca',
                                                            'Balance Sheet',
                                                        )
                                                      : t(
                                                            'Laporan Tahunan',
                                                            'Yearly Report',
                                                        )}
                                            </TableCell>
                                            <TableCell className="text-xs font-medium">
                                                {rep.period_start} &ndash;{' '}
                                                {rep.period_end}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {rep.created_by_name}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {rep.created_at}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-primary">
                                                {formatPrice(
                                                    rep.metrics_data
                                                        .total_sales || 0,
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center font-semibold">
                                                {
                                                    rep.metrics_data
                                                        .total_invoices
                                                }{' '}
                                                Inv
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        rep.status ===
                                                        'validated'
                                                            ? 'bg-green-50 text-green-700 border-green-200'
                                                            : rep.status ===
                                                                'rejected'
                                                              ? 'bg-red-50 text-red-700 border-red-200'
                                                              : 'bg-blue-50 text-blue-700 border-blue-200'
                                                    }
                                                >
                                                    {rep.status === 'submitted'
                                                        ? t(
                                                              'Menunggu Validasi',
                                                              'Pending Review',
                                                          )
                                                        : rep.status ===
                                                            'validated'
                                                          ? t(
                                                                'Disetujui',
                                                                'Validated',
                                                            )
                                                          : t(
                                                                'Ditolak',
                                                                'Rejected',
                                                            )}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Rincian Laporan Detail */}
                {selectedReport && m && (
                    <div className="space-y-6">
                        {/* Header & Keputusan Validasi Manager */}
                        <Card className="border-2 border-primary/20 shadow-sm">
                            <CardHeader className="bg-muted/20 border-b pb-4">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="size-5 text-primary" />
                                            <CardTitle className="text-xl font-bold">
                                                {t('Rincian Lengkap', 'Full Detail')}{' '}
                                                {selectedReport.type ===
                                                'monthly'
                                                    ? t(
                                                          'Laporan Bulanan',
                                                          'Monthly Report',
                                                      )
                                                    : t(
                                                          'Laporan Tahunan',
                                                          'Yearly Report',
                                                      )}{' '}
                                                (#RPT-
                                                {String(
                                                    selectedReport.id,
                                                ).padStart(3, '0')}
                                                )
                                            </CardTitle>
                                        </div>
                                        <CardDescription className="mt-1">
                                            {t('Periode:', 'Period:')}{' '}
                                            <strong>
                                                {selectedReport.period_start} s/d{' '}
                                                {selectedReport.period_end}
                                            </strong>{' '}
                                            &bull;{' '}
                                            {t(
                                                'Disusun oleh:',
                                                'Prepared by:',
                                            )}{' '}
                                            <strong>
                                                {selectedReport.created_by_name}
                                            </strong>{' '}
                                            ({selectedReport.created_at})
                                        </CardDescription>
                                    </div>

                                    {/* Panel Aksi Validasi / Status */}
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                        {selectedReport.status ===
                                            'validated' ||
                                        selectedReport.status === 'rejected' ? (
                                            <div className="flex flex-col items-end gap-1 bg-muted/40 px-4 py-2 rounded-lg border">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        selectedReport.status ===
                                                        'validated'
                                                            ? 'bg-green-100 text-green-800 border-green-300'
                                                            : 'bg-red-100 text-red-800 border-red-300'
                                                    }
                                                >
                                                    {selectedReport.status ===
                                                    'validated'
                                                        ? 'Disahkan oleh Manager Accounting'
                                                        : 'Ditolak / Perlu Revisi'}{' '}
                                                    ({selectedReport.validated_at})
                                                </Badge>
                                                {selectedReport.validation_notes && (
                                                    <span className="text-xs italic text-muted-foreground">
                                                        "
                                                        {
                                                            selectedReport.validation_notes
                                                        }
                                                        "
                                                    </span>
                                                )}
                                            </div>
                                        ) : !isRejecting ? (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="default"
                                                    className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                                                    onClick={() =>
                                                        handleValidate(
                                                            selectedReport.id,
                                                        )
                                                    }
                                                    disabled={processing}
                                                >
                                                    <Check className="size-4" />
                                                    {t(
                                                        'Setujui & Sahkan Laporan',
                                                        'Approve & Validate Report',
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
                                                    onClick={() =>
                                                        setIsRejecting(true)
                                                    }
                                                    disabled={processing}
                                                >
                                                    <X className="size-4" />
                                                    {t(
                                                        'Minta Revisi / Tolak',
                                                        'Request Revision / Reject',
                                                    )}
                                                </Button>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                {isRejecting &&
                                    selectedReport.status === 'submitted' && (
                                        <form
                                            onSubmit={(e) =>
                                                handleReject(
                                                    e,
                                                    selectedReport.id,
                                                )
                                            }
                                            className="mt-4 pt-4 border-t flex flex-col sm:flex-row gap-3 items-end"
                                        >
                                            <div className="flex-1 w-full">
                                                <label className="text-xs font-bold uppercase text-red-600 mb-1 block">
                                                    {t(
                                                        'Catatan Revisi untuk Staff Accounting:',
                                                        'Revision Notes for Staff Accounting:',
                                                    )}
                                                </label>
                                                <Textarea
                                                    placeholder={t(
                                                        'Tuliskan bagian laporan yang perlu diperbaiki oleh Staff Accounting...',
                                                        'Write what needs to be revised by Staff Accounting...',
                                                    )}
                                                    value={data.notes}
                                                    onChange={(e) =>
                                                        setData(
                                                            'notes',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="min-h-[68px] text-sm bg-background"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="submit"
                                                    variant="destructive"
                                                    disabled={processing}
                                                >
                                                    {t(
                                                        'Kirim Penolakan',
                                                        'Confirm Reject',
                                                    )}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setIsRejecting(false);
                                                        reset('notes');
                                                    }}
                                                    disabled={processing}
                                                >
                                                    {t('Batal', 'Cancel')}
                                                </Button>
                                            </div>
                                        </form>
                                    )}
                            </CardHeader>

                            {/* 8 Detailed Financial Breakdown Cards */}
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
                                    <div className="p-3.5 rounded-lg border bg-muted/20">
                                        <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                                            {t(
                                                'Penjualan Kotor (Subtotal)',
                                                'Gross Sales (Subtotal)',
                                            )}
                                        </div>
                                        <div className="text-lg font-bold mt-1">
                                            {formatPrice(
                                                m.gross_sales ?? m.total_sales,
                                            )}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground mt-0.5">
                                            {m.total_invoices}{' '}
                                            {t(
                                                'Faktur Tervalidasi',
                                                'Validated Invoices',
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-3.5 rounded-lg border bg-muted/20">
                                        <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                                            {t(
                                                'Total Pajak PPN (11%)',
                                                'Total VAT (11%)',
                                            )}
                                        </div>
                                        <div className="text-lg font-bold mt-1 text-blue-600 dark:text-blue-400">
                                            {formatPrice(m.total_tax ?? 0)}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground mt-0.5">
                                            Domestik: {m.domestic_invoices ?? 0}{' '}
                                            | Ekspor:{' '}
                                            {m.international_invoices ?? 0}
                                        </div>
                                    </div>

                                    <div className="p-3.5 rounded-lg border bg-muted/20">
                                        <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                                            {t(
                                                'Uang Muka (DP) & Retur',
                                                'Down Payment & Returns',
                                            )}
                                        </div>
                                        <div className="text-lg font-bold mt-1 text-rose-600 dark:text-rose-400">
                                            DP: {formatPrice(m.total_dp ?? 0)}
                                        </div>
                                        <div className="text-[11px] text-rose-600/80 mt-0.5">
                                            Retur ({m.returns_count ?? 0}): -
                                            {formatPrice(m.total_returns ?? 0)}
                                        </div>
                                    </div>

                                    <div className="p-3.5 rounded-lg border bg-primary/5 border-primary/30">
                                        <div className="text-[11px] font-semibold uppercase text-primary">
                                            {t(
                                                'Total Tagihan Bersih',
                                                'Net Invoice Total',
                                            )}
                                        </div>
                                        <div className="text-lg font-extrabold mt-1 text-primary">
                                            {formatPrice(
                                                m.net_revenue ?? m.total_sales,
                                            )}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground mt-0.5">
                                            Gross Tagihan:{' '}
                                            {formatPrice(m.total_sales)}
                                        </div>
                                    </div>

                                    <div className="p-3.5 rounded-lg border border-green-200 bg-green-50/60 dark:bg-green-950/20 dark:border-green-900/50">
                                        <div className="text-[11px] font-semibold uppercase text-green-700 dark:text-green-400">
                                            {t(
                                                'Penerimaan Kas Lunas',
                                                'Paid Invoice Receipts',
                                            )}
                                        </div>
                                        <div className="text-lg font-bold mt-1 text-green-700 dark:text-green-400">
                                            {formatPrice(m.paid_sales || 0)}
                                        </div>
                                        <div className="text-[11px] text-green-700/80 dark:text-green-400/80 mt-0.5">
                                            {m.paid_invoices}{' '}
                                            {t(
                                                'Invoice Lunas',
                                                'Paid Invoices',
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900/50">
                                        <div className="text-[11px] font-semibold uppercase text-amber-700 dark:text-amber-400">
                                            {t(
                                                'Piutang Usaha Customer (Utang)',
                                                'Outstanding Customer Receivables',
                                            )}
                                        </div>
                                        <div className="text-lg font-bold mt-1 text-amber-700 dark:text-amber-400">
                                            {formatPrice(m.unpaid_sales || 0)}
                                        </div>
                                        <div className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                                            {m.unpaid_invoices}{' '}
                                            {t(
                                                'Invoice Belum Lunas',
                                                'Unpaid Invoices',
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-3.5 rounded-lg border bg-muted/20">
                                        <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                                            {t(
                                                'Domestik vs Ekspor',
                                                'Domestic vs Export',
                                            )}
                                        </div>
                                        <div className="text-xs font-bold mt-1">
                                            Domestik:{' '}
                                            {formatPrice(
                                                m.domestic_sales ??
                                                    m.total_sales,
                                            )}
                                        </div>
                                        <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mt-0.5">
                                            Ekspor:{' '}
                                            {formatPrice(
                                                m.international_sales ?? 0,
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-3.5 rounded-lg border bg-muted/20">
                                        <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                                            {t(
                                                'Total Pengadaan (Purchase Order)',
                                                'Total PO Procurement',
                                            )}
                                        </div>
                                        <div className="text-lg font-bold mt-1">
                                            {formatPrice(
                                                m.total_po_amount ?? 0,
                                            )}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground mt-0.5">
                                            {m.po_count ?? 0}{' '}
                                            {t(
                                                'Dokumen PO Aktif',
                                                'Active PO Documents',
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Navigation Tabs for Detailed Tables */}
                                <div className="flex flex-wrap gap-2 mt-6 border-b pb-3">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={
                                            activeTab === 'invoices'
                                                ? 'default'
                                                : 'outline'
                                        }
                                        onClick={() => setActiveTab('invoices')}
                                        className="gap-1.5 text-xs"
                                    >
                                        <FileText className="size-3.5" />
                                        {t(
                                            '1. Rincian Transaksi Invoice & Barang',
                                            '1. Detailed Invoices & Line Items',
                                        )}{' '}
                                        ({invoicesList.length})
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={
                                            activeTab === 'customers'
                                                ? 'default'
                                                : 'outline'
                                        }
                                        onClick={() =>
                                            setActiveTab('customers')
                                        }
                                        className="gap-1.5 text-xs"
                                    >
                                        <Users className="size-3.5" />
                                        {t(
                                            '2. Rekap Penjualan per Customer',
                                            '2. Breakdown per Customer',
                                        )}{' '}
                                        ({customerList.length})
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={
                                            activeTab === 'products'
                                                ? 'default'
                                                : 'outline'
                                        }
                                        onClick={() => setActiveTab('products')}
                                        className="gap-1.5 text-xs"
                                    >
                                        <Package className="size-3.5" />
                                        {t(
                                            '3. Rekap Produk Terjual',
                                            '3. Product Sales Breakdown',
                                        )}{' '}
                                        ({productList.length})
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={
                                            activeTab === 'returns_po'
                                                ? 'default'
                                                : 'outline'
                                        }
                                        onClick={() =>
                                            setActiveTab('returns_po')
                                        }
                                        className="gap-1.5 text-xs"
                                    >
                                        <ShoppingCart className="size-3.5" />
                                        {t(
                                            '4. Rincian Retur & Purchase Order',
                                            '4. Returns & Purchase Orders',
                                        )}{' '}
                                        ({returnsList.length + poList.length})
                                    </Button>
                                </div>

                                {/* TAB 1: DETAILED INVOICES & LINE ITEMS */}
                                {activeTab === 'invoices' && (
                                    <div className="mt-4 rounded-md border overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-muted/40">
                                                <TableRow>
                                                    <TableHead className="w-8"></TableHead>
                                                    <TableHead>
                                                        {t(
                                                            'No. Invoice / Order',
                                                            'Invoice / Order ID',
                                                        )}
                                                    </TableHead>
                                                    <TableHead>
                                                        {t(
                                                            'Tgl Validasi',
                                                            'Validated Date',
                                                        )}
                                                    </TableHead>
                                                    <TableHead>
                                                        {t(
                                                            'Nama Customer',
                                                            'Customer Name',
                                                        )}
                                                    </TableHead>
                                                    <TableHead>
                                                        {t(
                                                            'Sales Rep',
                                                            'Sales Rep',
                                                        )}
                                                    </TableHead>
                                                    <TableHead>
                                                        {t('Tipe', 'Type')}
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        {t(
                                                            'Subtotal',
                                                            'Subtotal',
                                                        )}
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        {t('PPN', 'VAT')}
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        {t('DP', 'DP')}
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        {t(
                                                            'Total Tagihan',
                                                            'Total Amount',
                                                        )}
                                                    </TableHead>
                                                    <TableHead className="text-center">
                                                        {t('Status', 'Status')}
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {invoicesList.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell
                                                            colSpan={11}
                                                            className="h-24 text-center text-muted-foreground"
                                                        >
                                                            {t(
                                                                'Tidak ada transaksi invoice pada periode ini.',
                                                                'No invoice transactions found.',
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    invoicesList.map((inv) => {
                                                        const isExpanded =
                                                            !!expandedInvoices[
                                                                inv.id
                                                            ];
                                                        return (
                                                            <React.Fragment
                                                                key={inv.id}
                                                            >
                                                                <TableRow
                                                                    className="cursor-pointer hover:bg-muted/40"
                                                                    onClick={() =>
                                                                        toggleInvoiceExpand(
                                                                            inv.id,
                                                                        )
                                                                    }
                                                                >
                                                                    <TableCell>
                                                                        {isExpanded ? (
                                                                            <ChevronDown className="size-4 text-muted-foreground" />
                                                                        ) : (
                                                                            <ChevronRight className="size-4 text-muted-foreground" />
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="font-bold text-blue-600 dark:text-blue-400">
                                                                            {
                                                                                inv.invoice_number
                                                                            }
                                                                        </div>
                                                                        <div className="text-[11px] text-muted-foreground">
                                                                            {
                                                                                inv.order_id
                                                                            }
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-xs">
                                                                        {
                                                                            inv.validated_at
                                                                        }
                                                                    </TableCell>
                                                                    <TableCell className="font-semibold text-xs">
                                                                        {
                                                                            inv.customer_name
                                                                        }
                                                                    </TableCell>
                                                                    <TableCell className="text-xs">
                                                                        {
                                                                            inv.sales_rep
                                                                        }
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Badge
                                                                            variant="outline"
                                                                            className={
                                                                                inv.invoice_type ===
                                                                                'domestik'
                                                                                    ? 'bg-sky-50 text-sky-700 border-sky-200 text-[10px]'
                                                                                    : 'bg-purple-50 text-purple-700 border-purple-200 text-[10px]'
                                                                            }
                                                                        >
                                                                            {inv.invoice_type ===
                                                                            'domestik'
                                                                                ? 'Domestik'
                                                                                : 'Ekspor'}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell className="text-right text-xs">
                                                                        {formatPrice(
                                                                            inv.subtotal,
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-right text-xs">
                                                                        {formatPrice(
                                                                            inv.tax_amount,
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-right text-xs text-rose-600">
                                                                        {inv.dp_amount >
                                                                        0
                                                                            ? `-${formatPrice(inv.dp_amount)}`
                                                                            : '-'}
                                                                    </TableCell>
                                                                    <TableCell className="text-right font-bold text-xs">
                                                                        {formatPrice(
                                                                            inv.total_amount,
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-center">
                                                                        <Badge
                                                                            variant="outline"
                                                                            className={
                                                                                inv.status ===
                                                                                'lunas'
                                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                                                            }
                                                                        >
                                                                            {inv.status ===
                                                                            'lunas'
                                                                                ? 'Lunas'
                                                                                : 'Utang'}
                                                                        </Badge>
                                                                    </TableCell>
                                                                </TableRow>
                                                                {isExpanded && (
                                                                    <TableRow className="bg-muted/20">
                                                                        <TableCell
                                                                            colSpan={
                                                                                11
                                                                            }
                                                                            className="p-4"
                                                                        >
                                                                            <div className="text-xs font-bold uppercase text-muted-foreground mb-2">
                                                                                {t(
                                                                                    'Rincian Item Barang pada Invoice',
                                                                                    'Product Line Items in Invoice',
                                                                                )}{' '}
                                                                                {
                                                                                    inv.invoice_number
                                                                                }
                                                                                :
                                                                            </div>
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                                                {inv.items.map(
                                                                                    (
                                                                                        item,
                                                                                        idx,
                                                                                    ) => (
                                                                                        <div
                                                                                            key={
                                                                                                idx
                                                                                            }
                                                                                            className="flex items-center justify-between p-2.5 rounded border bg-background text-xs"
                                                                                        >
                                                                                            <div>
                                                                                                <div className="font-semibold">
                                                                                                    {
                                                                                                        item.product_name
                                                                                                    }
                                                                                                </div>
                                                                                                <div className="text-muted-foreground">
                                                                                                    {
                                                                                                        item.product_code
                                                                                                    }{' '}
                                                                                                    &bull;{' '}
                                                                                                    {
                                                                                                        item.quantity
                                                                                                    }{' '}
                                                                                                    {
                                                                                                        item.unit
                                                                                                    }{' '}
                                                                                                    &times;{' '}
                                                                                                    {formatPrice(
                                                                                                        item.price,
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="font-bold text-primary">
                                                                                                {formatPrice(
                                                                                                    item.subtotal,
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    ),
                                                                                )}
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )}
                                                            </React.Fragment>
                                                        );
                                                    })
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}

                                {/* TAB 2: BREAKDOWN PER CUSTOMER */}
                                {activeTab === 'customers' && (
                                    <div className="mt-4 rounded-md border overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-muted/40">
                                                <TableRow>
                                                    <TableHead>No</TableHead>
                                                    <TableHead>
                                                        {t(
                                                            'Nama Customer',
                                                            'Customer Name',
                                                        )}
                                                    </TableHead>
                                                    <TableHead className="text-center">
                                                        {t(
                                                            'Jumlah Invoice',
                                                            'Invoices Count',
                                                        )}
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        {t(
                                                            'Subtotal',
                                                            'Subtotal',
                                                        )}
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        {t('PPN', 'VAT')}
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        {t(
                                                            'Sudah Dibayar (Lunas)',
                                                            'Paid Amount',
                                                        )}
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        {t(
                                                            'Piutang (Utang)',
                                                            'Unpaid Receivable',
                                                        )}
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        {t(
                                                            'Total Nilai Penjualan',
                                                            'Total Sales Amount',
                                                        )}
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {customerList.map((c, idx) => (
                                                    <TableRow
                                                        key={c.customer_name}
                                                    >
                                                        <TableCell className="text-xs text-muted-foreground">
                                                            {idx + 1}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-semibold text-sm">
                                                                {
                                                                    c.customer_name
                                                                }
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {
                                                                    c.customer_email
                                                                }
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center font-semibold">
                                                            {c.invoices_count}
                                                        </TableCell>
                                                        <TableCell className="text-right text-xs">
                                                            {formatPrice(
                                                                c.subtotal,
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right text-xs">
                                                            {formatPrice(
                                                                c.tax_amount,
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right text-xs font-semibold text-green-600">
                                                            {formatPrice(
                                                                c.paid_amount,
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right text-xs font-semibold text-amber-600">
                                                            {formatPrice(
                                                                c.unpaid_amount,
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-primary">
                                                            {formatPrice(
                                                                c.total_amount,
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}

                                {/* TAB 3: PRODUCT BREAKDOWN */}
                                {activeTab === 'products' && (
                                    <div className="mt-4 rounded-md border overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-muted/40">
                                                <TableRow>
                                                    <TableHead>
                                                        {t(
                                                            'Kode Produk',
                                                            'Product Code',
                                                        )}
                                                    </TableHead>
                                                    <TableHead>
                                                        {t(
                                                            'Nama Produk',
                                                            'Product Name',
                                                        )}
                                                    </TableHead>
                                                    <TableHead>
                                                        {t(
                                                            'Kategori',
                                                            'Category',
                                                        )}
                                                    </TableHead>
                                                    <TableHead className="text-center">
                                                        {t(
                                                            'Kuantitas Terjual',
                                                            'Qty Sold',
                                                        )}
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        {t(
                                                            'Harga Satuan',
                                                            'Unit Price',
                                                        )}
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        {t(
                                                            'Total Kontribusi Pendapatan',
                                                            'Total Revenue',
                                                        )}
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {productList.map((p) => (
                                                    <TableRow
                                                        key={p.product_code}
                                                    >
                                                        <TableCell className="font-mono text-xs font-semibold">
                                                            {p.product_code}
                                                        </TableCell>
                                                        <TableCell className="font-semibold">
                                                            {p.product_name}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">
                                                            {p.category}
                                                        </TableCell>
                                                        <TableCell className="text-center font-bold">
                                                            {p.quantity_sold}{' '}
                                                            {p.unit}
                                                        </TableCell>
                                                        <TableCell className="text-right text-xs">
                                                            {formatPrice(
                                                                p.unit_price,
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-primary">
                                                            {formatPrice(
                                                                p.total_revenue,
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}

                                {/* TAB 4: RETURNS & PURCHASE ORDERS */}
                                {activeTab === 'returns_po' && (
                                    <div className="mt-4 grid gap-6 lg:grid-cols-2">
                                        <div className="rounded-md border overflow-hidden">
                                            <div className="bg-muted/40 px-4 py-2.5 border-b font-semibold text-xs uppercase flex items-center gap-2">
                                                <Undo2 className="size-4 text-rose-500" />
                                                {t(
                                                    'Rincian Retur Barang Disetujui',
                                                    'Approved Item Returns',
                                                )}
                                            </div>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>
                                                            No. Retur / Order
                                                        </TableHead>
                                                        <TableHead>
                                                            Customer
                                                        </TableHead>
                                                        <TableHead>
                                                            Alasan
                                                        </TableHead>
                                                        <TableHead className="text-right">
                                                            Nilai Retur
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {returnsList.length ===
                                                    0 ? (
                                                        <TableRow>
                                                            <TableCell
                                                                colSpan={4}
                                                                className="h-20 text-center text-xs text-muted-foreground"
                                                            >
                                                                Tidak ada retur
                                                                pada periode
                                                                ini.
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        returnsList.map((r) => (
                                                            <TableRow
                                                                key={r.id}
                                                            >
                                                                <TableCell className="text-xs font-semibold">
                                                                    <div>
                                                                        {
                                                                            r.return_number
                                                                        }
                                                                    </div>
                                                                    <div className="text-muted-foreground">
                                                                        {
                                                                            r.order_id
                                                                        }
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-xs">
                                                                    {
                                                                        r.customer_name
                                                                    }
                                                                </TableCell>
                                                                <TableCell className="text-xs text-muted-foreground">
                                                                    {r.reason}
                                                                </TableCell>
                                                                <TableCell className="text-right text-xs font-bold text-rose-600">
                                                                    -
                                                                    {formatPrice(
                                                                        r.total_amount,
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>

                                        <div className="rounded-md border overflow-hidden">
                                            <div className="bg-muted/40 px-4 py-2.5 border-b font-semibold text-xs uppercase flex items-center gap-2">
                                                <ShoppingCart className="size-4 text-blue-600" />
                                                {t(
                                                    'Rincian Pengadaan Purchase Order (PO)',
                                                    'Purchase Order (PO) Procurement',
                                                )}
                                            </div>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>
                                                            No. PO
                                                        </TableHead>
                                                        <TableHead>
                                                            Supplier & Plant
                                                        </TableHead>
                                                        <TableHead>
                                                            Status
                                                        </TableHead>
                                                        <TableHead className="text-right">
                                                            Nilai PO
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {poList.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell
                                                                colSpan={4}
                                                                className="h-20 text-center text-xs text-muted-foreground"
                                                            >
                                                                Tidak ada PO
                                                                pada periode
                                                                ini.
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        poList.map((po) => (
                                                            <TableRow
                                                                key={po.id}
                                                            >
                                                                <TableCell className="text-xs font-bold text-blue-600">
                                                                    {
                                                                        po.po_number
                                                                    }
                                                                </TableCell>
                                                                <TableCell className="text-xs">
                                                                    <div className="font-semibold">
                                                                        {
                                                                            po.supplier_name
                                                                        }
                                                                    </div>
                                                                    <div className="text-muted-foreground">
                                                                        {
                                                                            po.plant_name
                                                                        }
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="text-[10px]"
                                                                    >
                                                                        {
                                                                            po.status
                                                                        }{' '}
                                                                        (
                                                                        {po.payment_status ===
                                                                        'paid'
                                                                            ? 'Lunas'
                                                                            : 'Utang'}
                                                                        )
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right text-xs font-bold">
                                                                    {formatPrice(
                                                                        po.total_amount,
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </>
    );
}

ReportsInbox.layout = {
    breadcrumbs: [
        {
            title: 'Detailed Report Inbox',
            href: '/manager/reports',
        },
    ],
};
