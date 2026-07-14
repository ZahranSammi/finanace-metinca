import { Head, useForm } from '@inertiajs/react';
import { ClipboardList, Check, X, Eye, Clock } from 'lucide-react';
import * as React from 'react';
import { useCurrency } from '@/components/currency-context';
import { useLanguage } from '@/components/language-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

interface OrderItemDetail {
    product_name: string;
    quantity: number;
    price: number;
}

interface OrderItem {
    id: string;
    date_raised: string;
    submitted_at: string | null;
    customer_name: string;
    sales_rep: string;
    status: string;
    total_amount: number;
    items: OrderItemDetail[];
}

interface InboxProps {
    orders: OrderItem[];
}

export default function Inbox({ orders }: InboxProps) {
    const { formatPrice } = useCurrency();
    const { t } = useLanguage();
    const { data, setData, post, processing, reset } = useForm({
        notes: '',
    });

    const [selectedOrder, setSelectedOrder] = React.useState<OrderItem | null>(null);
    const [isRejecting, setIsRejecting] = React.useState(false);

    const handleValidate = (orderId: string) => {
        if (confirm(t('Apakah Anda yakin ingin menyetujui pesanan ini?', 'Are you sure you want to validate this order?'))) {
            post(`/accounting/orders/${orderId}/validate`, {
                onSuccess: () => {
                    setSelectedOrder(null);
                    reset('notes');
                }
            });
        }
    };

    const handleReject = (e: React.FormEvent, orderId: string) => {
        e.preventDefault();

        if (!data.notes.trim()) {
            alert(t('Catatan penolakan harus diisi.', 'Rejection notes are required.'));

            return;
        }

        post(`/accounting/orders/${orderId}/reject`, {
            onSuccess: () => {
                setSelectedOrder(null);
                setIsRejecting(false);
                reset('notes');
            }
        });
    };

    return (
        <>
            <Head title={t('Kotak Masuk Validasi', 'Validation Inbox')} />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('Validasi Transaksi', 'Transaction Validation')}</h1>
                    <p className="text-muted-foreground text-sm">
                        {t('Periksa pesanan masuk dari tim sales dan setujui atau tolak transaksi.', 'Review incoming orders from sales reps to approve or reject transactions.')}
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Orders List */}
                    <div className="lg:col-span-2 rounded-md border border-sidebar-border/70 bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('ID Pesanan', 'Order ID')}</TableHead>
                                    <TableHead>{t('Sales Rep', 'Sales Rep')}</TableHead>
                                    <TableHead>{t('Pelanggan', 'Customer')}</TableHead>
                                    <TableHead>{t('Tanggal Kirim', 'Date Submitted')}</TableHead>
                                    <TableHead className="text-right">{t('Total Nilai', 'Total Amount')}</TableHead>
                                    <TableHead className="text-center w-[100px]">{t('Aksi', 'Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <ClipboardList className="size-8 opacity-30" />
                                                {t('Tidak ada pesanan masuk untuk divalidasi.', 'No pending orders in the validation queue.')}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    orders.map((order) => (
                                        <TableRow 
                                            key={order.id} 
                                            className={`cursor-pointer transition-colors ${selectedOrder?.id === order.id ? 'bg-muted/80' : ''}`}
                                            onClick={() => {
                                                setSelectedOrder(order);
                                                setIsRejecting(false);
                                                reset('notes');
                                            }}
                                        >
                                            <TableCell className="font-semibold">{order.id}</TableCell>
                                            <TableCell>{order.sales_rep}</TableCell>
                                            <TableCell className="font-medium">{order.customer_name}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="size-3 text-blue-500" />
                                                    {order.submitted_at}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-slate-800 dark:text-zinc-200">
                                                {formatPrice(order.total_amount)}
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

                    {/* Order Details and Action Panel */}
                    <div className="lg:col-span-1">
                        {selectedOrder ? (
                            <Card className="border border-sidebar-border/80 sticky top-6 shadow-sm">
                                <CardHeader className="border-b pb-4 bg-muted/20">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg font-bold">{selectedOrder.id}</CardTitle>
                                        <Badge variant="outline" className="border-blue-500 text-blue-500 bg-blue-50 dark:bg-blue-950/20">
                                            {t('Menunggu Validasi', 'Submitted')}
                                        </Badge>
                                    </div>
                                    <CardDescription>
                                        {t('Dibuat pada', 'Raised on')} {selectedOrder.date_raised} &bull; {selectedOrder.sales_rep}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    {/* Customer info */}
                                    <div>
                                        <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('Pelanggan', 'Customer')}</div>
                                        <div className="text-sm font-semibold">{selectedOrder.customer_name}</div>
                                    </div>

                                    {/* Order Items */}
                                    <div>
                                        <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">{t('Detail Item', 'Order Items')}</div>
                                        <div className="max-h-[180px] overflow-y-auto space-y-2 border rounded-md p-2 bg-muted/10">
                                            {selectedOrder.items.map((item, idx) => (
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
                                    <div className="flex justify-between items-center border-t pt-3 font-bold text-sm">
                                        <span>Total (inc. tax/fees)</span>
                                        <span className="text-base text-primary">{formatPrice(selectedOrder.total_amount)}</span>
                                    </div>

                                    {/* Action Buttons */}
                                    {!isRejecting ? (
                                        <div className="flex gap-2 pt-2">
                                            <Button 
                                                variant="default" 
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-1.5"
                                                onClick={() => handleValidate(selectedOrder.id)}
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
                                        <form onSubmit={(e) => handleReject(e, selectedOrder.id)} className="space-y-3 pt-2">
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
                                <CardTitle className="text-sm font-medium">{t('Pilih Pesanan', 'Select an Order')}</CardTitle>
                                <CardDescription className="text-xs">
                                    {t('Pilih pesanan di tabel sebelah kiri untuk meninjau rincian detailnya.', 'Click on an order in the list to view items and take validation action.')}
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
