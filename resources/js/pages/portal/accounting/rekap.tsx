import { Head, useForm } from '@inertiajs/react';
import { Package, Award, Clock, FileText, CheckCircle2 } from 'lucide-react';
import * as React from 'react';
import { useCurrency } from '@/components/currency-context';
import { useLanguage } from '@/components/language-context';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface RecapItem {
    id: string;
    date_raised: string;
    validated_at: string | null;
    validated_by_name: string;
    customer_name: string;
    sales_rep: string;
    total_amount: number;
    has_invoice: boolean;
    invoice_id: string | null;
}

interface RekapProps {
    orders: RecapItem[];
}

export default function Rekap({ orders }: RekapProps) {
    const { formatPrice } = useCurrency();
    const { t } = useLanguage();

    const [isOpen, setIsOpen] = React.useState(false);
    const [activeOrder, setActiveOrder] = React.useState<RecapItem | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        order_id: '',
        invoice_type: 'tua_lokal',
        dp_amount: 0,
    });

    const grandTotalSales = React.useMemo(() => {
        return orders.reduce((sum, item) => sum + Number(item.total_amount), 0);
    }, [orders]);

    // Live calculation for the modal
    const calculation = React.useMemo(() => {
        if (!activeOrder) return { subtotal: 0, tax: 0, total: 0 };
        // Since orders.total_amount is stored as subtotal * 1.11, the base subtotal is:
        const subtotal = Number(activeOrder.total_amount) / 1.11;
        const tax = data.invoice_type === 'tua_lokal' ? subtotal * 0.11 : 0;
        const total = subtotal + tax - (Number(data.dp_amount) || 0);
        return { subtotal, tax, total };
    }, [activeOrder, data.invoice_type, data.dp_amount]);

    const handleSubmitInvoice = (e: React.FormEvent) => {
        e.preventDefault();
        post('/accounting/invoices', {
            onSuccess: () => {
                setIsOpen(false);
                reset();
                setActiveOrder(null);
            }
        });
    };

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
                            <div className="text-lg font-bold text-primary">{formatPrice(grandTotalSales)}</div>
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
                                <TableHead className="text-right">{t('Aksi / Invoice', 'Action / Invoice')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
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
                                        <TableCell className="text-right">
                                            {order.has_invoice ? (
                                                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50 flex items-center gap-1 w-fit ml-auto">
                                                    <CheckCircle2 className="size-3" />
                                                    {order.invoice_id}
                                                </Badge>
                                            ) : (
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="text-xs h-7 px-2 flex items-center gap-1 ml-auto"
                                                    onClick={() => {
                                                        setActiveOrder(order);
                                                        setData({
                                                            order_id: order.id,
                                                            invoice_type: 'tua_lokal',
                                                            dp_amount: 0,
                                                        });
                                                        setIsOpen(true);
                                                    }}
                                                >
                                                    <FileText className="size-3.5" />
                                                    {t('Buat Invoice', 'Create Invoice')}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Modal Create Invoice */}
            <Dialog open={isOpen} onOpenChange={(open) => {
                setIsOpen(open);
                if (!open) {
                    reset();
                    setActiveOrder(null);
                }
            }}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t('Buat Invoice Baru', 'Create New Invoice')}</DialogTitle>
                        <DialogDescription>
                            {t('Isi detail untuk membuat invoice dari PO ', 'Fill in the details to generate an invoice from PO ')} 
                            <span className="font-semibold text-foreground">{activeOrder?.id}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmitInvoice} className="space-y-4 py-2">
                        {/* Tipe Invoice */}
                        <div className="grid gap-2">
                            <Label htmlFor="invoice_type">{t('Jenis Invoice', 'Invoice Type')}</Label>
                            <select
                                id="invoice_type"
                                value={data.invoice_type}
                                onChange={(e) => setData('invoice_type', e.target.value as any)}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="tua_lokal">{t('Tua Lokal (Accounting) - PPN 11%', 'Tua Lokal (Accounting) - VAT 11%')}</option>
                                <option value="inter_expor">{t('Inter Expor (Exim) - Tanpa PPN', 'Inter Expor (Exim) - No VAT')}</option>
                            </select>
                        </div>

                        {/* DP (Down Payment) */}
                        <div className="grid gap-2">
                            <Label htmlFor="dp_amount">{t('Uang Muka / DP (Opsional)', 'Down Payment (Optional)')}</Label>
                            <Input
                                id="dp_amount"
                                type="number"
                                min="0"
                                value={data.dp_amount === 0 ? '' : data.dp_amount}
                                onChange={(e) => setData('dp_amount', Number(e.target.value))}
                                placeholder="Masukkan nominal DP jika ada"
                            />
                        </div>

                        {/* Summary Perhitungan */}
                        <div className="border-t pt-3 mt-4 space-y-2 text-xs">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Subtotal</span>
                                <span>{formatPrice(calculation.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>PPN ({data.invoice_type === 'tua_lokal' ? '11%' : '0%'})</span>
                                <span>{formatPrice(calculation.tax)}</span>
                            </div>
                            {Number(data.dp_amount) > 0 && (
                                <div className="flex justify-between text-red-500 font-medium">
                                    <span>Uang Muka (DP)</span>
                                    <span>-{formatPrice(data.dp_amount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm font-bold border-t pt-2 mt-1">
                                <span>Total Tagihan (Grand Total)</span>
                                <span className="text-primary">{formatPrice(calculation.total)}</span>
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => {
                                    setIsOpen(false);
                                    reset();
                                    setActiveOrder(null);
                                }}
                            >
                                {t('Batal', 'Cancel')}
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {t('Simpan Invoice', 'Save Invoice')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
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
