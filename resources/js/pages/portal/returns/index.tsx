import { Head, Link } from '@inertiajs/react';
import { Undo2, Plus } from 'lucide-react';
import * as React from 'react';
import { useCurrency } from '@/components/currency-context';
import { useLanguage } from '@/components/language-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ReturnNote {
    id: number;
    order_id: string;
    customer_name: string;
    type: 'credit_internal' | 'debit_external';
    total_amount: number;
    status: string;
    date: string;
}

interface ReturnIndexProps {
    returns: ReturnNote[];
}

export default function ReturnsIndex({ returns }: ReturnIndexProps) {
    const { formatPrice } = useCurrency();
    const { t } = useLanguage();

    return (
        <>
            <Head title={t('Barang Reject / Return', 'Return / Rejected Items')} />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{t('Retur Barang', 'Item Returns')}</h1>
                        <p className="text-muted-foreground text-sm">
                            {t('Kelola pengembalian barang (Kredit Internal & Debit Eksternal).', 'Manage item returns (Internal Credit & External Debit).')}
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <Button asChild>
                            <Link href="/returns/create" className="flex items-center gap-2">
                                <Plus className="size-4" /> {t('Buat Retur', 'Create Return')}
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="rounded-md border border-sidebar-border/70 bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>{t('Pesanan / PO', 'Order / PO')}</TableHead>
                                <TableHead>{t('Pelanggan', 'Customer')}</TableHead>
                                <TableHead>{t('Tipe Retur', 'Return Type')}</TableHead>
                                <TableHead>{t('Tanggal', 'Date')}</TableHead>
                                <TableHead className="text-right">{t('Total Nilai', 'Total Amount')}</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {returns.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Undo2 className="size-8 opacity-30" />
                                            {t('Belum ada data retur barang.', 'No item returns logged yet.')}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                returns.map((rtn) => (
                                    <TableRow key={rtn.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-semibold">{rtn.id}</TableCell>
                                        <TableCell className="font-medium text-xs">{rtn.order_id}</TableCell>
                                        <TableCell>{rtn.customer_name}</TableCell>
                                        <TableCell>
                                            {rtn.type === 'credit_internal' ? (
                                                <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                                                    Kredit Internal
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50">
                                                    Debit Eksternal
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{rtn.date}</TableCell>
                                        <TableCell className="text-right font-bold text-slate-800 dark:text-zinc-200">
                                            {formatPrice(rtn.total_amount)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary">{rtn.status}</Badge>
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

ReturnsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Returns',
            href: '/returns',
        },
    ],
};
