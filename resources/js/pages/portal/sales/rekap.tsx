import { Head } from '@inertiajs/react';
import { FileText, ClipboardList } from 'lucide-react';
import * as React from 'react';
import { useCurrency } from '@/components/currency-context';
import { useLanguage } from '@/components/language-context';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface OrderItem {
    id: number;
    date_raised: string;
    validated_at: string | null;
    validated_by_name: string;
    customer_name: string;
    sales_rep: string;
    total_amount: number;
    currency: string;
    exchange_rate: number;
    has_invoice: boolean;
    invoice_id: string | null;
}

interface RekapProps {
    orders: OrderItem[];
}

export default function Rekap({ orders }: RekapProps) {
    const { formatPrice } = useCurrency();
    const { t } = useLanguage();

    return (
        <>
            <Head title={t('Rekap Penjualan Valid', 'Validated Sales Recap')} />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('Rekap Penjualan Valid', 'Validated Sales Recap')}</h1>
                    <p className="text-muted-foreground text-sm">
                        {t('Daftar seluruh pesanan penjualan yang telah valid.', 'List of all validated sales orders.')}
                    </p>
                </div>

                <div className="rounded-md border border-sidebar-border/70 bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>No. Invoice</TableHead>
                                <TableHead>{t('Nama Customer', 'Customer Name')}</TableHead>
                                <TableHead>{t('Tanggal Pembuatan', 'Date Raised')}</TableHead>
                                <TableHead>{t('Tanggal Validasi', 'Date Validated')}</TableHead>
                                <TableHead>{t('Sales Rep', 'Sales Rep')}</TableHead>
                                <TableHead className="text-right">{t('Total Harga', 'Total Price')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <ClipboardList className="size-8 opacity-30" />
                                            {t('Belum ada data penjualan valid.', 'No validated sales data yet.')}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                orders.map((o) => (
                                    <TableRow key={o.id}>
                                        <TableCell className="font-semibold">
                                            {o.has_invoice ? o.invoice_id : '-'}
                                        </TableCell>
                                        <TableCell className="font-semibold">{o.customer_name}</TableCell>
                                        <TableCell>{o.date_raised}</TableCell>
                                        <TableCell>
                                            {o.validated_at ? o.validated_at : '-'}
                                        </TableCell>
                                        <TableCell>{o.sales_rep}</TableCell>
                                        <TableCell className="text-right font-bold text-primary">
                                            {formatPrice(o.total_amount)}
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
