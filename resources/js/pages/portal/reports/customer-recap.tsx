import { Head, router } from '@inertiajs/react';
import { FileBarChart2, Search } from 'lucide-react';
import * as React from 'react';
import { useCurrency } from '@/components/currency-context';
import { useLanguage } from '@/components/language-context';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Customer {
    id: number;
    name: string;
}

interface InvoicePenalty {
    id: number;
    invoice_type: string;
    total_amount: number;
    due_date: string | null;
    delivery_date: string | null;
    deadline_date: string | null;
    days_late: number;
    penalty_amount: number;
    status: string;
}

interface CustomerRecapProps {
    customers: Customer[];
    selectedCustomerId: string | null;
    invoices: InvoicePenalty[];
}

export default function CustomerRecap({ customers, selectedCustomerId, invoices }: CustomerRecapProps) {
    const { formatPrice } = useCurrency();
    const { t } = useLanguage();

    const handleCustomerChange = (val: string) => {
        router.get('/reports/customer-recap', { customer_id: val }, { preserveState: true });
    };

    const totalInvoiceAmount = React.useMemo(() => {
        return invoices.reduce((sum, item) => sum + Number(item.total_amount), 0);
    }, [invoices]);

    const totalPenalty = React.useMemo(() => {
        return invoices.reduce((sum, item) => sum + Number(item.penalty_amount), 0);
    }, [invoices]);

    return (
        <>
            <Head title={t('Rekapan per PT', 'Customer Statement')} />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('Rekapan per PT (Pelanggan)', 'Customer Statement')}</h1>
                    <p className="text-muted-foreground text-sm">
                        {t('Rekapan tagihan per pelanggan beserta perhitungan denda keterlambatan bayar.', 'Customer statement recap including late payment penalty calculation.')}
                    </p>
                </div>

                <Card className="border border-sidebar-border/70">
                    <CardHeader className="bg-muted/30 border-b pb-4">
                        <CardTitle className="text-lg">{t('Filter Rekapan', 'Report Filter')}</CardTitle>
                        <CardDescription>{t('Pilih pelanggan untuk melihat rincian tagihan.', 'Select a customer to view their statement details.')}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="max-w-md space-y-2">
                            <Label>{t('Pilih Pelanggan (PT)', 'Select Customer')}</Label>
                            <Select value={selectedCustomerId || ''} onValueChange={handleCustomerChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('--- Pilih Pelanggan ---', '--- Select Customer ---')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {customers.map(c => (
                                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {selectedCustomerId && (
                    <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <Card className="shadow-xs border-sidebar-border/70">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-muted-foreground">{t('Total Tagihan Aktif', 'Total Active Invoices')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-slate-800 dark:text-zinc-200">
                                        {formatPrice(totalInvoiceAmount)}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="shadow-xs border-sidebar-border/70 border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/10">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-red-600 dark:text-red-400">{t('Estimasi Denda Terkumpul', 'Estimated Total Penalty')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                        {formatPrice(totalPenalty)}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="rounded-md border border-sidebar-border/70 bg-card">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Invoice ID</TableHead>
                                        <TableHead>{t('Tipe', 'Type')}</TableHead>
                                        <TableHead>{t('Tgl Jatuh Tempo / Pengiriman', 'Due / Delivery Date')}</TableHead>
                                        <TableHead>{t('Batas Bayar', 'Deadline')}</TableHead>
                                        <TableHead className="text-right">{t('Total Tagihan', 'Total Amount')}</TableHead>
                                        <TableHead className="text-center">{t('Telat (Hari)', 'Days Late')}</TableHead>
                                        <TableHead className="text-right">{t('Pinalty / Denda', 'Penalty')}</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <Search className="size-8 opacity-30" />
                                                    {t('Tidak ada tagihan untuk pelanggan ini.', 'No invoices found for this customer.')}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        invoices.map((inv) => (
                                            <TableRow key={inv.id}>
                                                <TableCell className="font-semibold text-blue-600 dark:text-blue-400">INV-{String(inv.id).padStart(5, '0')}</TableCell>
                                                <TableCell>
                                                    {inv.invoice_type === 'tua_lokal' ? (
                                                        <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">Lokal</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Expor</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground space-y-1">
                                                    <div>Due: {inv.due_date || '-'}</div>
                                                    <div>Del: {inv.delivery_date || '-'}</div>
                                                </TableCell>
                                                <TableCell className="font-medium text-xs">
                                                    {inv.deadline_date || '-'}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatPrice(inv.total_amount)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {inv.days_late > 0 ? (
                                                        <span className="text-red-500 font-bold">{inv.days_late} Hari</span>
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-red-600">
                                                    {inv.penalty_amount > 0 ? formatPrice(inv.penalty_amount) : '-'}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="secondary">{inv.status}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

CustomerRecap.layout = {
    breadcrumbs: [
        {
            title: 'Reports',
            href: '#',
        },
        {
            title: 'Customer Recap',
            href: '/reports/customer-recap',
        },
    ],
};
