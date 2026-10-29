import { Head, router, Link, usePage } from '@inertiajs/react';
import {
    FileText,
    Plus,
    Eye,
    Printer,
    Download,
    FileSpreadsheet,
    Upload,
    CheckCircle2,
    AlertTriangle,
} from 'lucide-react';
import * as React from 'react';
import { useCurrency } from '@/components/currency-context';
import { useLanguage } from '@/components/language-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface InvoiceDetailItem {
    product_name: string;
    quantity: number;
    price: number;
}

interface InvoiceItem {
    id: string;
    order_id: string;
    customer_name: string;
    sales_rep?: string;
    invoice_type: 'domestik' | 'international';
    subtotal: number;
    tax_percent: number;
    tax_amount: number;
    dp_amount: number;
    total_amount: number;
    status: string;
    created_at: string;
    currency: string;
    exchange_rate: number;
    file_path?: string | null;
    items?: InvoiceDetailItem[];
}

interface InvoiceRekapProps {
    invoices: InvoiceItem[];
}

export default function InvoiceRekap({ invoices }: InvoiceRekapProps) {
    const { formatPrice } = useCurrency();
    const { t } = useLanguage();
    const { props } = usePage<{
        flash?: { success?: string; error?: string };
    }>();
    const [selectedInvoice, setSelectedInvoice] = React.useState<InvoiceItem | null>(null);
    const [isImporting, setIsImporting] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const handleExportCsv = () => {
        const headers = [
            'ID Invoice',
            'ID Order / PO',
            'Tanggal',
            'Nama Pelanggan (Customer)',
            'Sales Rep',
            'Jenis Invoice',
            'Mata Uang',
            'Kurs (Rate)',
            'Subtotal (IDR)',
            'PPN (%)',
            'Nilai PPN (IDR)',
            'DP / Uang Muka (IDR)',
            'Total Tagihan (IDR)',
            'Status',
        ];
        const rows = invoices.map((inv) => [
            inv.id,
            inv.order_id,
            inv.created_at,
            inv.customer_name,
            inv.sales_rep || '-',
            inv.invoice_type,
            inv.currency,
            inv.exchange_rate,
            inv.subtotal,
            inv.tax_percent,
            inv.tax_amount,
            inv.dp_amount,
            inv.total_amount,
            inv.status,
        ]);

        const csvContent =
            'data:text/csv;charset=utf-8,' +
            [
                headers.join(','),
                ...rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')),
            ].join('\n');

        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', `Riwayat_Invoice_Metinca_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleQuickImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        router.post(
            '/invoices/import',
            {
                excel_file: file,
                default_action: 'submit',
            },
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => {
                    setIsImporting(false);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                },
            },
        );
    };

    const formatPriceWithCurrency = (amount: number, currencyCode: string) => {
        if (currencyCode === 'USD') {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
            }).format(amount);
        } else if (currencyCode === 'EUR') {
            return new Intl.NumberFormat('de-DE', {
                style: 'currency',
                currency: 'EUR',
            }).format(amount);
        }
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const handlePrintWindow = () => {
        if (!selectedInvoice) return;
        
        const printWindow = window.open('', '_blank', 'width=850,height=1100');
        if (!printWindow) return;

        const itemsRows = (selectedInvoice.items && selectedInvoice.items.length > 0)
            ? selectedInvoice.items.map(item => `
                <tr>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; font-weight: 500;">${item.product_name}</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatPriceWithCurrency(item.price, selectedInvoice.currency)}</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">${formatPriceWithCurrency(item.price * item.quantity, selectedInvoice.currency)}</td>
                </tr>
            `).join('')
            : `<tr><td colspan="4" style="padding: 20px; text-align: center; color: #64748b;">Tidak ada rincian item produk.</td></tr>`;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <title>Faktur Invoice ${selectedInvoice.id} - PT METINCA PRIMA INDUSTRIAL WORKS</title>
                <style>
                    * { box-sizing: border-box; }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        margin: 0;
                        padding: 32px;
                        color: #0f172a;
                        background: #ffffff;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .header-box {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-bottom: 3px solid #0f172a;
                        padding-bottom: 16px;
                        margin-bottom: 24px;
                    }
                    .header-left {
                        display: flex;
                        align-items: center;
                        gap: 16px;
                    }
                    .logo-img {
                        height: 56px;
                        width: auto;
                        object-fit: contain;
                    }
                    .company-title {
                        font-size: 18px;
                        font-weight: 900;
                        text-transform: uppercase;
                        letter-spacing: -0.3px;
                        margin: 0;
                        color: #0f172a;
                        line-height: 1.2;
                    }
                    .company-sub {
                        font-size: 11px;
                        color: #64748b;
                        margin-top: 3px;
                        font-weight: 500;
                    }
                    .header-right {
                        text-align: right;
                    }
                    .doc-title {
                        font-size: 22px;
                        font-weight: 900;
                        color: #2563eb;
                        margin: 0;
                        letter-spacing: 0.5px;
                    }
                    .doc-id {
                        font-size: 14px;
                        font-weight: 700;
                        color: #1e293b;
                        margin-top: 2px;
                    }
                    .doc-po {
                        font-size: 11px;
                        color: #64748b;
                        margin-top: 2px;
                    }
                    .badge {
                        display: inline-block;
                        padding: 3px 8px;
                        border-radius: 4px;
                        font-size: 10px;
                        font-weight: 700;
                        text-transform: uppercase;
                        border: 1px solid #cbd5e1;
                    }
                    .badge-lunas { background: #dcfce7; color: #15803d; border-color: #86efac; }
                    .badge-utang { background: #fef3c7; color: #b45309; border-color: #fde68a; }
                    
                    .info-card {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                        background: #f8fafc;
                        padding: 16px;
                        border-radius: 8px;
                        border: 1px solid #e2e8f0;
                        margin-bottom: 24px;
                    }
                    .info-group label {
                        font-size: 10px;
                        font-weight: 700;
                        text-transform: uppercase;
                        color: #64748b;
                        display: block;
                        margin-bottom: 4px;
                        letter-spacing: 0.5px;
                    }
                    .cust-name {
                        font-size: 16px;
                        font-weight: 800;
                        color: #0f172a;
                    }
                    .info-group p {
                        font-size: 12px;
                        margin: 3px 0;
                        color: #334155;
                    }
                    
                    .section-label {
                        font-size: 11px;
                        font-weight: 700;
                        text-transform: uppercase;
                        color: #64748b;
                        margin-bottom: 8px;
                        letter-spacing: 0.5px;
                    }
                    .items-table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 12px;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        overflow: hidden;
                        margin-bottom: 24px;
                    }
                    .items-table th {
                        background: #f1f5f9;
                        padding: 10px 12px;
                        text-align: left;
                        font-size: 11px;
                        font-weight: 700;
                        text-transform: uppercase;
                        color: #475569;
                        border-bottom: 1px solid #cbd5e1;
                    }
                    
                    .summary-box {
                        display: flex;
                        flex-direction: column;
                        align-items: flex-end;
                        gap: 6px;
                        font-size: 12px;
                        border-top: 1px solid #e2e8f0;
                        padding-top: 16px;
                        margin-bottom: 32px;
                    }
                    .summary-row {
                        display: flex;
                        justify-content: space-between;
                        width: 280px;
                    }
                    .grand-total-row {
                        font-size: 16px;
                        font-weight: 900;
                        color: #0f172a;
                        border-top: 2px solid #0f172a;
                        padding-top: 8px;
                        margin-top: 4px;
                    }
                    .grand-total-val {
                        color: #2563eb;
                    }

                    .footer-thanks {
                        text-align: center;
                        margin-top: 48px;
                        border-top: 1px dashed #cbd5e1;
                        padding-top: 16px;
                        font-size: 11px;
                        color: #64748b;
                    }
                </style>
            </head>
            <body>
                <div class="header-box">
                    <div class="header-left">
                        <img src="/Logo-metinca.webp" alt="Metinca Logo" class="logo-img" />
                        <div>
                            <h2 class="company-title">PT. METINCA PRIMA INDUSTRIAL WORKS</h2>
                            <div class="company-sub">Enterprise Industrial Manufacturing & Order Management System</div>
                        </div>
                    </div>
                    <div class="header-right">
                        <h1 class="doc-title">FAKTUR INVOICE</h1>
                        <div class="doc-id">${selectedInvoice.id}</div>
                        <div class="doc-po">
                            PO #${selectedInvoice.order_id} &nbsp;&bull;&nbsp; 
                            <span class="badge ${selectedInvoice.status === 'lunas' ? 'badge-lunas' : 'badge-utang'}">${selectedInvoice.status.toUpperCase()}</span>
                        </div>
                    </div>
                </div>

                <div class="info-card">
                    <div class="info-group">
                        <label>Pelanggan / Customer</label>
                        <div class="cust-name">${selectedInvoice.customer_name}</div>
                        <p>Jenis Invoice: <strong>${selectedInvoice.invoice_type.toUpperCase()}</strong></p>
                    </div>
                    <div class="info-group">
                        <label>Informasi Transaksi</label>
                        <p>Tanggal Diterbitkan: <strong>${selectedInvoice.created_at}</strong></p>
                        <p>Sales Representative: <strong>${selectedInvoice.sales_rep || '-'}</strong></p>
                        <p>Valuta / Exchange Rate: <strong>${selectedInvoice.currency} ${selectedInvoice.currency !== 'IDR' ? '(Rate: ' + selectedInvoice.exchange_rate + ')' : ''}</strong></p>
                    </div>
                </div>

                <div class="section-label">Rincian Produk / Barang (Line Items)</div>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Nama Produk</th>
                            <th style="text-align: center;">Jumlah</th>
                            <th style="text-align: right;">Harga Satuan</th>
                            <th style="text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>

                <div class="summary-box">
                    <div class="summary-row">
                        <span style="color: #64748b;">Subtotal:</span>
                        <strong style="margin-left: auto;">${formatPriceWithCurrency(selectedInvoice.subtotal, selectedInvoice.currency)}</strong>
                    </div>
                    ${selectedInvoice.tax_amount > 0 ? `
                    <div class="summary-row">
                        <span style="color: #64748b;">Pajak PPN (${selectedInvoice.tax_percent}%):</span>
                        <strong style="margin-left: auto;">${formatPriceWithCurrency(selectedInvoice.tax_amount, selectedInvoice.currency)}</strong>
                    </div>` : ''}
                    ${selectedInvoice.dp_amount > 0 ? `
                    <div class="summary-row" style="color: #dc2626;">
                        <span>Uang Muka (DP):</span>
                        <strong style="margin-left: auto;">-${formatPriceWithCurrency(selectedInvoice.dp_amount, selectedInvoice.currency)}</strong>
                    </div>` : ''}
                    <div class="summary-row grand-total-row">
                        <span>TOTAL TAGIHAN:</span>
                        <span class="grand-total-val" style="margin-left: auto;">${formatPriceWithCurrency(selectedInvoice.total_amount, selectedInvoice.currency)}</span>
                    </div>
                </div>

                <div class="footer-thanks">
                    Terima kasih atas kepercayaan Anda kepada <strong>PT. METINCA PRIMA INDUSTRIAL WORKS</strong>.<br/>
                    Dokumen ini resmi dicetak secara otomatis dari Sistem Enterprise Metinca Monitoring.
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const stats = React.useMemo(() => {
        let totalRevenue = 0;
        let localCount = 0;
        let exportCount = 0;

        invoices.forEach(inv => {
            totalRevenue += Number(inv.total_amount);

            if (inv.invoice_type === 'domestik') {
                localCount++;
            } else {
                exportCount++;
            }
        });

        return { totalRevenue, localCount, exportCount };
    }, [invoices]);

    return (
        <>
            <Head title={t('Riwayat Invoice', 'Invoice History')} />
            <div className="flex flex-1 flex-col gap-6 p-6">
                {props.flash?.success && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-xs dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        <span>{props.flash.success}</span>
                    </div>
                )}
                {props.flash?.error && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 shadow-xs dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-600" />
                        <span>{props.flash.error}</span>
                    </div>
                )}

                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-3xl font-bold tracking-tight">{t('Riwayat Invoice', 'Invoice History')}</h1>
                        <p className="text-muted-foreground text-sm">
                            {t('Kelola dan lihat rincian invoice yang telah Anda masukkan, baik Domestik maupun Ekspor.', 'Manage and view details of invoices you have entered, both Domestic and Export.')}
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleQuickImportExcel}
                            className="hidden"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleExportCsv}
                            className="gap-1.5 border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100/70 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                        >
                            <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
                            Export CSV
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isImporting}
                            onClick={() => fileInputRef.current?.click()}
                            className="gap-1.5 border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100/70 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300"
                        >
                            <Upload className="size-4 text-blue-600 dark:text-blue-400" />
                            {isImporting
                                ? t('Mengimpor Excel...', 'Importing Excel...')
                                : t('Import Excel ke DB', 'Import Excel to DB')}
                        </Button>
                        <Button asChild className="flex items-center justify-center gap-1.5">
                            <Link href="/invoices/create">
                                <Plus className="size-4" /> {t('Input / Import Invoice Baru', 'New / Import Invoice')}
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border bg-card text-card-foreground p-5 flex flex-col gap-1 shadow-xs">
                        <span className="text-sm font-medium text-muted-foreground">{t('Invoice Domestik', 'Domestic Invoices')}</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold">{stats.localCount}</span>
                            <span className="text-xs text-muted-foreground">{t('Dengan PPN 11%', 'With 11% VAT')}</span>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card text-card-foreground p-5 flex flex-col gap-1 shadow-xs">
                        <span className="text-sm font-medium text-muted-foreground">{t('Invoice Internasional', 'International Invoices')}</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold">{stats.exportCount}</span>
                            <span className="text-xs text-muted-foreground">{t('Tanpa PPN', 'VAT Exempt')}</span>
                        </div>
                    </div>
                </div>

                <div className="rounded-md border border-sidebar-border/70 bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('ID Invoice', 'Invoice ID')}</TableHead>
                                <TableHead>{t('ID Pesanan / PO', 'Order / PO ID')}</TableHead>
                                <TableHead>{t('Tanggal', 'Date Created')}</TableHead>
                                <TableHead>{t('Pelanggan', 'Customer')}</TableHead>
                                <TableHead>{t('Jenis', 'Type')}</TableHead>
                                <TableHead>{t('Valuta / Rate', 'Currency / Rate')}</TableHead>
                                <TableHead className="text-right">{t('Subtotal', 'Subtotal')}</TableHead>
                                <TableHead className="text-right">{t('Pajak / PPN', 'Tax / VAT')}</TableHead>
                                <TableHead className="text-right">{t('DP / Uang Muka', 'Down Payment')}</TableHead>
                                <TableHead className="text-right">{t('Total Tagihan', 'Grand Total')}</TableHead>
                                <TableHead className="text-center">{t('Status', 'Status')}</TableHead>
                                <TableHead className="text-center">{t('Aksi', 'Actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={12} className="h-32 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <FileText className="size-8 opacity-30" />
                                            {t('Belum ada invoice yang diterbitkan.', 'No invoices have been issued yet.')}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                invoices.map((inv) => (
                                    <TableRow key={inv.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-bold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                            <FileText className="size-3.5" />
                                            {inv.id}
                                        </TableCell>
                                        <TableCell className="font-semibold text-xs">{inv.order_id}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{inv.created_at}</TableCell>
                                        <TableCell className="font-medium text-xs">{inv.customer_name}</TableCell>
                                        <TableCell>
                                            {inv.invoice_type === 'domestik' ? (
                                                <Badge variant="default" className="bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-50 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/50">
                                                    Domestik
                                                </Badge>
                                            ) : (
                                                <Badge variant="default" className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50">
                                                    Internasional
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs font-medium">
                                            {inv.currency === 'IDR' ? (
                                                <span className="text-muted-foreground">IDR</span>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-foreground">{inv.currency}</span>
                                                    <span className="text-[10px] text-muted-foreground/80">
                                                        Rate: {new Intl.NumberFormat('id-ID').format(inv.exchange_rate)}
                                                    </span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right text-xs">
                                            <div className="flex flex-col text-right">
                                                <span className="font-medium">
                                                    {formatPriceWithCurrency(inv.currency === 'IDR' ? inv.subtotal : inv.subtotal / inv.exchange_rate, inv.currency)}
                                                </span>
                                                {inv.currency !== 'IDR' && (
                                                    <span className="text-[10px] text-muted-foreground/80">
                                                        {formatPriceWithCurrency(inv.subtotal, 'IDR')}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right text-xs">
                                            {inv.tax_amount > 0 ? (
                                                <div className="flex flex-col text-right">
                                                    <span className="font-medium">
                                                        {formatPriceWithCurrency(inv.currency === 'IDR' ? inv.tax_amount : inv.tax_amount / inv.exchange_rate, inv.currency)}
                                                    </span>
                                                    <div className="text-[10px] text-muted-foreground/80 flex items-center justify-end gap-1">
                                                        {inv.currency !== 'IDR' && (
                                                            <span>{formatPriceWithCurrency(inv.tax_amount, 'IDR')}</span>
                                                        )}
                                                        <span className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 px-1 py-0.25 rounded text-[9px] font-semibold">
                                                            {inv.tax_percent}%
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right text-xs">
                                            {inv.dp_amount > 0 ? (
                                                <div className="flex flex-col text-right text-red-500 font-medium">
                                                    <span>
                                                        -{formatPriceWithCurrency(inv.currency === 'IDR' ? inv.dp_amount : inv.dp_amount / inv.exchange_rate, inv.currency)}
                                                    </span>
                                                    {inv.currency !== 'IDR' && (
                                                        <span className="text-[10px] text-red-400">
                                                            -{formatPriceWithCurrency(inv.dp_amount, 'IDR')}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-col text-right font-bold text-slate-800 dark:text-zinc-200">
                                                <span>
                                                    {formatPriceWithCurrency(inv.currency === 'IDR' ? inv.total_amount : inv.total_amount / inv.exchange_rate, inv.currency)}
                                                </span>
                                                {inv.currency !== 'IDR' && (
                                                    <span className="text-[10px] text-muted-foreground/80 font-normal">
                                                        {formatPriceWithCurrency(inv.total_amount, 'IDR')}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {inv.status === 'draft' || inv.status === 'rejected' ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <Badge variant="outline" className={inv.status === 'rejected' ? "bg-red-50 text-red-700 border-red-200" : "bg-slate-50 text-slate-700 border-slate-200"}>
                                                        {inv.status === 'draft' ? 'Draft' : 'Ditolak'}
                                                    </Badge>
                                                    <button 
                                                        onClick={() => router.post(`/sales/invoices/${parseInt(inv.id.replace('INV-', ''), 10)}/submit`)}
                                                        className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors border border-blue-200 font-semibold"
                                                    >
                                                        Kirim (Validasi)
                                                    </button>
                                                </div>
                                            ) : inv.status === 'utang' ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50">
                                                        Utang (Tervalidasi)
                                                    </Badge>
                                                    <button 
                                                        onClick={() => router.post(`/sales/invoices/${parseInt(inv.id.replace('INV-', ''), 10)}/pay`)}
                                                        className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors border border-green-200 font-semibold"
                                                    >
                                                        Tandai Lunas
                                                    </button>
                                                </div>
                                            ) : inv.status === 'submitted' ? (
                                                <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/50">
                                                    Menunggu Validasi
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50">
                                                    {inv.status === 'lunas' ? 'Lunas' : inv.status}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedInvoice(inv)}
                                                className="h-8 gap-1 text-xs text-blue-600 dark:text-blue-400 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                            >
                                                <Eye className="size-3.5" />
                                                {t('Lihat', 'View')}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Modal Detail Invoice */}
            <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    {selectedInvoice && (
                        <div className="space-y-6 p-2">
                            {/* Kop Surat Header with Metinca Logo & Full Title */}
                            <div className="flex justify-between items-center border-b-2 border-slate-800 pb-4">
                                <div className="flex items-center gap-3">
                                    <img 
                                        src="/Logo-metinca.webp" 
                                        alt="PT. METINCA PRIMA INDUSTRIAL WORKS" 
                                        className="h-14 w-auto object-contain" 
                                    />
                                    <div>
                                        <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase leading-tight">
                                            PT. METINCA PRIMA INDUSTRIAL WORKS
                                        </h2>
                                        <p className="text-xs text-muted-foreground font-medium">
                                            Enterprise Industrial Manufacturing & Order Management System
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h3 className="text-xl font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                                        FAKTUR INVOICE
                                    </h3>
                                    <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">{selectedInvoice.id}</p>
                                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                        <span className="text-xs text-muted-foreground">PO #{selectedInvoice.order_id}</span>
                                        <Badge 
                                            variant="outline" 
                                            className={
                                                selectedInvoice.status === 'lunas' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]' :
                                                selectedInvoice.status === 'utang' ? 'bg-amber-100 text-amber-800 border-amber-300 text-[10px]' :
                                                'bg-slate-100 text-slate-800 border-slate-300 text-[10px]'
                                            }
                                        >
                                            {selectedInvoice.status.toUpperCase()}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg border">
                                <div>
                                    <div className="text-xs text-muted-foreground font-semibold uppercase">{t('Pelanggan', 'Customer')}</div>
                                    <div className="font-bold text-base text-foreground mt-0.5">{selectedInvoice.customer_name}</div>
                                    <div className="text-xs text-muted-foreground mt-1">Jenis Invoice: <span className="font-medium text-foreground capitalize">{selectedInvoice.invoice_type}</span></div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground font-semibold uppercase">{t('Informasi Transaksi', 'Transaction Info')}</div>
                                    <div className="text-xs mt-1"><span className="text-muted-foreground">Tanggal:</span> <span className="font-medium">{selectedInvoice.created_at}</span></div>
                                    <div className="text-xs"><span className="text-muted-foreground">Sales Representative:</span> <span className="font-medium">{selectedInvoice.sales_rep || '-'}</span></div>
                                    <div className="text-xs"><span className="text-muted-foreground">Valuta:</span> <span className="font-medium">{selectedInvoice.currency} {selectedInvoice.currency !== 'IDR' ? `(Rate: ${selectedInvoice.exchange_rate})` : ''}</span></div>
                                </div>
                            </div>

                            {/* Rincian Items */}
                            <div>
                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('Rincian Produk / Barang', 'Line Items')}</h4>
                                <div className="border rounded-md overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead>Nama Produk</TableHead>
                                                <TableHead className="text-center">Jumlah</TableHead>
                                                <TableHead className="text-right">Harga Satuan</TableHead>
                                                <TableHead className="text-right">Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(!selectedInvoice.items || selectedInvoice.items.length === 0) ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center text-muted-foreground text-xs py-6">
                                                        Tidak ada rincian item produk.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                selectedInvoice.items.map((item, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-medium text-xs">{item.product_name}</TableCell>
                                                        <TableCell className="text-center text-xs">{item.quantity}</TableCell>
                                                        <TableCell className="text-right text-xs">{formatPriceWithCurrency(item.price, selectedInvoice.currency)}</TableCell>
                                                        <TableCell className="text-right text-xs font-semibold">{formatPriceWithCurrency(item.price * item.quantity, selectedInvoice.currency)}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            {/* Ringkasan Subtotal & Total */}
                            <div className="flex flex-col items-end gap-1.5 border-t pt-4 text-sm">
                                <div className="flex justify-between w-64 text-xs">
                                    <span className="text-muted-foreground">Subtotal:</span>
                                    <span className="font-medium">{formatPriceWithCurrency(selectedInvoice.subtotal, selectedInvoice.currency)}</span>
                                </div>
                                {selectedInvoice.tax_amount > 0 && (
                                    <div className="flex justify-between w-64 text-xs">
                                        <span className="text-muted-foreground">Pajak PPN ({selectedInvoice.tax_percent}%):</span>
                                        <span className="font-medium">{formatPriceWithCurrency(selectedInvoice.tax_amount, selectedInvoice.currency)}</span>
                                    </div>
                                )}
                                {selectedInvoice.dp_amount > 0 && (
                                    <div className="flex justify-between w-64 text-xs text-red-500">
                                        <span>Uang Muka (DP):</span>
                                        <span className="font-medium">-{formatPriceWithCurrency(selectedInvoice.dp_amount, selectedInvoice.currency)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between w-64 text-base font-extrabold border-t pt-2 mt-1 text-slate-800 dark:text-zinc-100">
                                    <span>Total Tagihan:</span>
                                    <span className="text-primary">{formatPriceWithCurrency(selectedInvoice.total_amount, selectedInvoice.currency)}</span>
                                </div>
                            </div>

                            {/* Footer / Action Buttons */}
                            <div className="flex justify-between items-center border-t pt-4">
                                {selectedInvoice.file_path ? (
                                    <a 
                                        href={selectedInvoice.file_path} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-md font-medium border border-blue-200"
                                    >
                                        <Download className="size-3.5" /> Unduh Lampiran EXIM
                                    </a>
                                ) : (
                                    <div />
                                )}
                                <div className="flex gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={handlePrintWindow}
                                        className="flex items-center gap-1.5 text-xs"
                                    >
                                        <Printer className="size-3.5" /> Cetak / Print Invoice
                                    </Button>
                                    <Button 
                                        variant="default" 
                                        size="sm" 
                                        onClick={() => setSelectedInvoice(null)}
                                        className="text-xs"
                                    >
                                        Tutup
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

InvoiceRekap.layout = {
    breadcrumbs: [
        {
            titleId: 'Rekap Invoice PO',
            href: '/sales/invoice-rekap',
        },
    ],
};
