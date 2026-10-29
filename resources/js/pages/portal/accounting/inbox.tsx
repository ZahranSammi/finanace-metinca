import { Head, useForm, router } from '@inertiajs/react';
import { ClipboardList, Check, X, Eye, Clock, Send, BarChart, FileText } from 'lucide-react';
import * as React from 'react';
import { useCurrency } from '@/components/currency-context';
import { useLanguage } from '@/components/language-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface InvoiceItemDetail {
    product_name: string;
    quantity: number;
    price: number;
}

interface InvoiceItem {
    id: number;
    invoice_number: string;
    date_raised: string;
    submitted_at: string | null;
    file_path?: string | null;
    customer_name: string;
    sales_rep: string;
    status: string;
    total_amount: number;
    currency: string;
    exchange_rate: number;
    items: InvoiceItemDetail[];
}

interface ReportItem {
    id: number;
    type: string;
    period_start: string;
    period_end: string;
    status: string;
    created_at: string;
    validation_notes: string | null;
}

interface InboxProps {
    invoices: InvoiceItem[];
    reports: ReportItem[];
}

export default function Inbox({ invoices, reports }: InboxProps) {
    const { formatPrice } = useCurrency();
    const { t } = useLanguage();
    
    // Invoice Validation Form
    const { data, setData, post, processing, reset } = useForm({
        notes: '',
    });

    // Report Generation Form
    const { data: reportData, setData: setReportData, post: postReport, processing: processingReport, reset: resetReport } = useForm({
        type: 'monthly',
        period: new Date().toISOString().slice(0, 7) + '-01', // YYYY-MM-01
    });

    const [selectedInvoice, setSelectedInvoice] = React.useState<InvoiceItem | null>(null);
    const [isRejecting, setIsRejecting] = React.useState(false);

    const handleValidate = (invoiceId: number) => {
        if (confirm(t('Apakah Anda yakin ingin menyetujui invoice ini?', 'Are you sure you want to validate this invoice?'))) {
            post(`/accounting/invoices/${invoiceId}/validate`, {
                onSuccess: () => {
                    setSelectedInvoice(null);
                    reset('notes');
                }
            });
        }
    };

    const handleReject = (e: React.FormEvent, invoiceId: number) => {
        e.preventDefault();

        if (!data.notes.trim()) {
            alert(t('Catatan penolakan harus diisi.', 'Rejection notes are required.'));
            return;
        }

        post(`/accounting/invoices/${invoiceId}/reject`, {
            onSuccess: () => {
                setSelectedInvoice(null);
                setIsRejecting(false);
                reset('notes');
            }
        });
    };

    const handleGenerateReport = (e: React.FormEvent) => {
        e.preventDefault();
        postReport('/accounting/reports/generate', {
            onSuccess: () => {
                alert('Laporan berhasil dikirim ke Manager!');
                resetReport();
            }
        });
    }

    return (
        <>
            <Head title={t('Kotak Masuk Validasi', 'Validation Inbox')} />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('Validasi Invoice & Pelaporan', 'Invoice Validation & Reporting')}</h1>
                    <p className="text-muted-foreground text-sm">
                        {t('Periksa invoice dari tim sales dan buat laporan bulanan/tahunan untuk Manager.', 'Review invoices from sales reps and generate reports for the Manager.')}
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Invoices List */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <div className="rounded-md border border-sidebar-border/70 bg-card">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Nomor Invoice', 'Invoice No')}</TableHead>
                                        <TableHead>{t('Sales Rep', 'Sales Rep')}</TableHead>
                                        <TableHead>{t('Pelanggan', 'Customer')}</TableHead>
                                        <TableHead>{t('Tanggal Kirim', 'Date Submitted')}</TableHead>
                                        <TableHead className="text-right">{t('Total Nilai', 'Total Amount')}</TableHead>
                                        <TableHead className="text-center w-[100px]">{t('Aksi', 'Actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <ClipboardList className="size-8 opacity-30" />
                                                    {t('Tidak ada invoice masuk untuk divalidasi.', 'No pending invoices in the validation queue.')}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        invoices.map((invoice) => (
                                            <TableRow 
                                                key={invoice.id} 
                                                className={`cursor-pointer transition-colors ${selectedInvoice?.id === invoice.id ? 'bg-muted/80' : ''}`}
                                                onClick={() => {
                                                    setSelectedInvoice(invoice);
                                                    setIsRejecting(false);
                                                    reset('notes');
                                                }}
                                            >
                                                <TableCell className="font-semibold">{invoice.invoice_number}</TableCell>
                                                <TableCell>{invoice.sales_rep}</TableCell>
                                                <TableCell className="font-medium">{invoice.customer_name}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="size-3 text-blue-500" />
                                                        {invoice.submitted_at}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-slate-800 dark:text-zinc-200">
                                                    {formatPrice(invoice.total_amount)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8 text-neutral-600 hover:text-neutral-900"
                                                        title={t('Lihat Detail', 'View Details')}
                                                        aria-label={t('Lihat Detail', 'View Details')}
                                                    >
                                                        <Eye className="size-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Generate Report Section */}
                        <Card className="border border-sidebar-border/70 shadow-sm">
                            <CardHeader className="bg-muted/20 border-b pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <BarChart className="size-5 text-primary" />
                                    {t('Kirim Laporan ke Manager', 'Send Report to Manager')}
                                </CardTitle>
                                <CardDescription>
                                    {t('Buat rekapitulasi data penjualan berdasarkan invoice yang sudah divalidasi.', 'Generate sales recap based on validated invoices.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <form onSubmit={handleGenerateReport} className="flex flex-col sm:flex-row gap-4 items-end">
                                    <div className="flex-1 sm:max-w-[240px] space-y-2 w-full">
                                        <label className="text-xs font-semibold uppercase">{t('Tipe Laporan', 'Report Type')}</label>
                                        <select 
                                            value={reportData.type}
                                            onChange={e => setReportData('type', e.target.value)}
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <option value="monthly">Bulanan (Monthly)</option>
                                            <option value="yearly">Tahunan (Yearly)</option>
                                        </select>
                                    </div>
                                    <div className="flex-1 sm:max-w-[240px] space-y-2 w-full">
                                        <label className="text-xs font-semibold uppercase">{t('Periode', 'Period')}</label>
                                        <Input 
                                            type={reportData.type === 'monthly' ? "month" : "date"}
                                            value={reportData.type === 'monthly' ? reportData.period.slice(0, 7) : reportData.period}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setReportData('period', val.length === 7 ? val + '-01' : val);
                                            }}
                                            required
                                        />
                                    </div>
                                    <Button type="submit" disabled={processingReport} className="w-full sm:w-auto">
                                        <Send className="size-4 mr-2" />
                                        {t('Kirim Laporan', 'Send Report')}
                                    </Button>
                                </form>

                                {/* List of previously sent reports */}
                                {reports.length > 0 && (
                                    <div className="mt-6 pt-6 border-t">
                                        <h4 className="text-sm font-semibold mb-3">{t('Riwayat Laporan', 'Report History')}</h4>
                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                            {reports.map(rep => (
                                                <div key={rep.id} className="flex items-center justify-between p-3 bg-muted/40 border rounded-md text-sm">
                                                    <div>
                                                        <span className="font-semibold">
                                                            {rep.type === 'monthly'
                                                                ? 'Bulanan'
                                                                : rep.type === 'neraca'
                                                                  ? 'Laporan Neraca'
                                                                  : 'Tahunan'}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground ml-2">({rep.period_start} - {rep.period_end})</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-muted-foreground">{rep.created_at}</span>
                                                        <Badge variant="outline" className={
                                                            rep.status === 'validated' ? 'bg-green-50 text-green-700 border-green-200' :
                                                            rep.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                                            'bg-blue-50 text-blue-700 border-blue-200'
                                                        }>
                                                            {rep.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Invoice Details and Action Panel */}
                    <div className="lg:col-span-1">
                        {selectedInvoice ? (
                            <Card className="border border-sidebar-border/80 sticky top-6 shadow-sm">
                                <CardHeader className="border-b pb-4 bg-muted/20">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg font-bold">{selectedInvoice.invoice_number}</CardTitle>
                                        <Badge variant="outline" className="border-blue-500 text-blue-500 bg-blue-50 dark:bg-blue-950/20">
                                            {t('Menunggu Validasi', 'Submitted')}
                                        </Badge>
                                    </div>
                                    <CardDescription>
                                        {t('Dibuat pada', 'Raised on')} {selectedInvoice.date_raised} &bull; {selectedInvoice.sales_rep}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    {/* Customer & Document info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('Pelanggan', 'Customer')}</div>
                                            <div className="text-sm font-semibold">{selectedInvoice.customer_name}</div>
                                        </div>
                                        {selectedInvoice.file_path && (
                                            <div>
                                                <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">{t('Dokumen EXIM', 'EXIM Document')}</div>
                                                <a 
                                                    href={selectedInvoice.file_path} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-1 rounded-md font-medium border border-blue-200"
                                                >
                                                    <FileText className="size-3" /> Unduh Dokumen
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {/* Order Items */}
                                    <div>
                                        <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">{t('Detail Item', 'Invoice Items')}</div>
                                        <div className="max-h-[180px] overflow-y-auto space-y-2 border rounded-md p-2 bg-muted/10">
                                            {selectedInvoice.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-xs border-b pb-1 last:border-b-0 last:pb-0">
                                                    <div>
                                                        <div className="font-medium">{item.product_name}</div>
                                                        <div className="text-muted-foreground">{item.quantity} x {formatPrice(item.price)}</div>
                                                    </div>
                                                    <div className="font-semibold self-center">{formatPrice(item.price * item.quantity)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Subtotal */}
                                    <div className="flex justify-between items-start border-t pt-3 font-bold text-sm">
                                        <span>Total Tagihan (Inc. Tax)</span>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-base text-primary">{formatPrice(selectedInvoice.total_amount)}</span>
                                            {selectedInvoice.currency && selectedInvoice.currency !== 'IDR' && selectedInvoice.exchange_rate > 0 && (
                                                <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md flex items-center gap-1 border border-sidebar-border/50">
                                                    ≈ {new Intl.NumberFormat('id-ID', {
                                                        style: 'currency',
                                                        currency: selectedInvoice.currency
                                                    }).format(selectedInvoice.total_amount / selectedInvoice.exchange_rate)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    {!isRejecting ? (
                                        <div className="flex gap-2 pt-2">
                                            <Button 
                                                variant="default" 
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-1.5"
                                                onClick={() => handleValidate(selectedInvoice.id)}
                                                disabled={processing}
                                            >
                                                <Check className="size-4" /> {t('Setujui', 'Approve')}
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                className="flex-1 text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/10 flex items-center justify-center gap-1.5"
                                                onClick={() => setIsRejecting(true)}
                                                disabled={processing}
                                            >
                                                <X className="size-4" /> {t('Tolak', 'Reject')}
                                            </Button>
                                        </div>
                                    ) : (
                                        <form onSubmit={(e) => handleReject(e, selectedInvoice.id)} className="space-y-3 pt-2">
                                            <Textarea 
                                                placeholder={t('Berikan alasan penolakan...', 'Provide rejection reason...')}
                                                value={data.notes}
                                                onChange={(e) => setData('notes', e.target.value)}
                                                className="min-h-[80px] text-sm"
                                            />
                                            <div className="flex gap-2">
                                                <Button 
                                                    type="submit" 
                                                    variant="destructive"
                                                    className="flex-1 text-xs"
                                                    disabled={processing}
                                                >
                                                    {t('Kirim Tolak', 'Confirm Reject')}
                                                </Button>
                                                <Button 
                                                    type="button" 
                                                    variant="outline"
                                                    className="flex-1 text-xs"
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
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="border border-dashed border-sidebar-border/120 flex flex-col items-center justify-center text-center p-8 h-[250px] text-muted-foreground">
                                <ClipboardList className="size-10 opacity-30 mb-2" />
                                <CardTitle className="text-sm font-medium">{t('Pilih Invoice', 'Select an Invoice')}</CardTitle>
                                <CardDescription className="text-xs">
                                    {t('Pilih invoice di tabel sebelah kiri untuk meninjau rincian detailnya.', 'Click on an invoice in the list to view items and take validation action.')}
                                </CardDescription>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

Inbox.layout = {
    breadcrumbs: [
        {
            title: 'Validation Inbox',
            href: '/accounting/inbox',
        },
    ],
};
