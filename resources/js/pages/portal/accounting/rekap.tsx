import { Head } from '@inertiajs/react';
import { Package, Award, Clock } from 'lucide-react';
import * as React from 'react';
import { useCurrency } from '@/components/currency-context';
import { useLanguage } from '@/components/language-context';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RecapItem {
    id: string;
    date_raised: string;
    validated_at: string | null;
    validated_by_name: string;
    customer_name: string;
    sales_rep: string;
    total_amount: number;
}

interface RekapProps {
    orders: RecapItem[];
}

export default function Rekap({ orders }: RekapProps) {
    const { formatPrice } = useCurrency();
    const { t } = useLanguage();

    const grandTotal = React.useMemo(() => {
        return orders.reduce((sum, item) => sum + Number(item.total_amount), 0);
    }, [orders]);

    return (
        <>
            <Head title={t('Rekap Penjualan', 'Sales Recap')} />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{t('Rekap Penjualan', 'Sales Recap')}</h1>
                        <p className="text-muted-foreground text-sm">
                            {t('Log transaksi pesanan tervalidasi yang sah untuk pembukuan.', 'Log of approved and validated sales orders for accounting records.')}
                        </p>
                    </div>
                    <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 flex items-center gap-3 self-start">
                        <Package className="text-primary size-5" />
                        <div>
                            <div className="text-xs text-muted-foreground">{t('Total Nilai Validasi', 'Validated Value')}</div>
                            <div className="text-lg font-bold text-primary">{formatPrice(grandTotal)}</div>
                        </div>
                    </div>
                </div>

                <div className="rounded-md border border-sidebar-border/70 bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('ID Pesanan', 'Order ID')}</TableHead>
                                <TableHead>{t('Tanggal Buat', 'Date Raised')}</TableHead>
                                <TableHead>{t('Tanggal Validasi', 'Date Approved')}</TableHead>
                                <TableHead>{t('Sales Rep', 'Sales Rep')}</TableHead>
                                <TableHead>{t('Pelanggan', 'Customer')}</TableHead>
                                <TableHead>{t('Divalidasi Oleh', 'Approved By')}</TableHead>
                                <TableHead className="text-right">{t('Total Nilai', 'Total Amount')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        {t('Belum ada transaksi tervalidasi.', 'No validated transactions logged yet.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                orders.map((order) => (
                                    <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-semibold">{order.id}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{order.date_raised}</TableCell>
                                        <TableCell className="text-xs">
                                            <div className="flex items-center gap-1.5 font-medium text-green-600 dark:text-green-400">
                                                <Clock className="size-3" />
                                                {order.validated_at}
                                            </div>
                                        </TableCell>
                                        <TableCell>{order.sales_rep}</TableCell>
                                        <TableCell className="font-medium">{order.customer_name}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-xs">
                                                <Award className="size-3.5 text-yellow-500" />
                                                {order.validated_by_name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-slate-800 dark:text-zinc-200">
                                            {formatPrice(order.total_amount)}
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

Rekap.layout = {
    breadcrumbs: [
        {
            title: 'Sales Recap',
            href: '/accounting/rekap',
        },
    ],
};
