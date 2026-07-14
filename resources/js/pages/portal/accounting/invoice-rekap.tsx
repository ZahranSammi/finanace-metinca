import { Head } from '@inertiajs/react';
import { FileText, ClipboardList, TrendingUp } from 'lucide-react';
import * as React from 'react';
import { useCurrency } from '@/components/currency-context';
import { useLanguage } from '@/components/language-context';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface InvoiceItem {
    id: string;
    order_id: string;
    customer_name: string;
    invoice_type: 'tua_lokal' | 'inter_expor';
    subtotal: number;
    tax_percent: number;
    tax_amount: number;
    dp_amount: number;
    total_amount: number;
    status: string;
    created_at: string;
}

interface InvoiceRekapProps {
    invoices: InvoiceItem[];
}

export default function InvoiceRekap({ invoices }: InvoiceRekapProps) {
    const { formatPrice } = useCurrency();
    const { t } = useLanguage();

    const stats = React.useMemo(() => {
        let totalRevenue = 0;
        let localCount = 0;
        let exportCount = 0;

        invoices.forEach(inv => {
            totalRevenue += Number(inv.total_amount);

            if (inv.invoice_type === 'tua_lokal') {
                localCount++;
            } else {
                exportCount++;
            }
        });

        return { totalRevenue, localCount, exportCount };
    }, [invoices]);

    return (
        <>
            <Head title={t('Rekap Invoice PO', 'PO Invoice Recap')} />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{t('Rekap Invoice PO', 'PO Invoice Recap')}</h1>
                        <p className="text-muted-foreground text-sm">
                            {t('Daftar invoice penjualan terbit berdasarkan jenis (Tua Lokal & Inter Expor).', 'List of issued sales invoices grouped by type (Tua Lokal & Inter Expor).')}
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 flex items-center gap-3">
                            <TrendingUp className="text-primary size-5" />
                            <div>
                                <div className="text-xs text-muted-foreground">{t('Total Tagihan', 'Total Invoiced')}</div>
                                <div className="text-lg font-bold text-primary">{formatPrice(stats.totalRevenue)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border bg-card text-card-foreground p-5 flex flex-col gap-1 shadow-xs">
                        <span className="text-sm font-medium text-muted-foreground">{t('Invoice Tua Lokal (Accounting)', 'Tua Lokal Invoices (Accounting)')}</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold">{stats.localCount}</span>
                            <span className="text-xs text-muted-foreground">{t('Dengan PPN 11%', 'With 11% VAT')}</span>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card text-card-foreground p-5 flex flex-col gap-1 shadow-xs">
                        <span className="text-sm font-medium text-muted-foreground">{t('Invoice Inter Expor (Exim)', 'Inter Expor Invoices (Exim)')}</span>
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
                                <TableHead className="text-right">{t('Subtotal', 'Subtotal')}</TableHead>
                                <TableHead className="text-right">{t('PPN (11%)', 'VAT (11%)')}</TableHead>
                                <TableHead className="text-right">{t('DP / Uang Muka', 'Down Payment')}</TableHead>
                                <TableHead className="text-right">{t('Total Tagihan', 'Grand Total')}</TableHead>
                                <TableHead className="text-center">{t('Status', 'Status')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
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
                                            {inv.invoice_type === 'tua_lokal' ? (
                                                <Badge variant="default" className="bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-50 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/50">
                                                    Tua Lokal
                                                </Badge>
                                            ) : (
                                                <Badge variant="default" className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50">
                                                    Inter Expor
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right text-xs">
                                            {formatPrice(inv.subtotal)}
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">
                                            {inv.tax_amount > 0 ? formatPrice(inv.tax_amount) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-red-500 font-medium">
                                            {inv.dp_amount > 0 ? `-${formatPrice(inv.dp_amount)}` : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-slate-800 dark:text-zinc-200">
                                            {formatPrice(inv.total_amount)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50">
                                                {inv.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </>
    );
}

InvoiceRekap.layout = {
    breadcrumbs: [
        {
            title: 'Invoice Recap',
            href: '/accounting/invoice-rekap',
        },
    ],
};
