import { Head, Link, useForm } from '@inertiajs/react';
import { Undo2, Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import * as React from 'react';
import { useCurrency } from '@/components/currency-context';
import { useLanguage } from '@/components/language-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

interface Product {
    id: number;
    name: string;
    price: number;
}

interface OrderItem {
    id: number;
    product_id: number;
    quantity: number;
    price: number;
    product: Product;
}

interface Order {
    id: string;
    customer_id: number;
    customer: { name: string; email: string };
    items: OrderItem[];
}

interface ReturnCreateProps {
    orders: Order[];
}

interface ReturnLineItem {
    product_id: number;
    product_name: string;
    quantity: number;
    price: number;
    max_qty: number;
}

export default function CreateReturn({ orders }: ReturnCreateProps) {
    const { formatPrice } = useCurrency();
    const { t } = useLanguage();

    const { data, setData, post, processing, errors } = useForm({
        order_id: orders[0]?.id || '',
        type: 'credit_internal',
        reason: '',
        items: [] as ReturnLineItem[],
    });

    const selectedOrder = React.useMemo(() => {
        return orders.find(o => o.id === data.order_id);
    }, [orders, data.order_id]);

    const [selectedProductId, setSelectedProductId] = React.useState<number>(0);
    const [selectedQty, setSelectedQty] = React.useState<number>(1);

    // Update selected product default when order changes
    React.useEffect(() => {
        if (selectedOrder && selectedOrder.items.length > 0) {
            setSelectedProductId(selectedOrder.items[0].product_id);
            setData('items', []); // clear items when order changes
        }
    }, [selectedOrder]);

    const handleAddItem = () => {
        if (!selectedOrder) return;
        
        const orderItem = selectedOrder.items.find(i => i.product_id === selectedProductId);
        if (!orderItem) return;

        const existingIdx = data.items.findIndex(item => item.product_id === selectedProductId);

        if (existingIdx > -1) {
            const updatedItems = [...data.items];
            const newQty = updatedItems[existingIdx].quantity + selectedQty;
            if (newQty <= orderItem.quantity) {
                updatedItems[existingIdx].quantity = newQty;
                setData('items', updatedItems);
            } else {
                alert(`Cannot return more than ordered quantity (${orderItem.quantity})`);
            }
        } else {
            if (selectedQty <= orderItem.quantity) {
                setData('items', [
                    ...data.items,
                    {
                        product_id: selectedProductId,
                        product_name: orderItem.product.name,
                        quantity: selectedQty,
                        price: orderItem.price,
                        max_qty: orderItem.quantity,
                    }
                ]);
            } else {
                alert(`Cannot return more than ordered quantity (${orderItem.quantity})`);
            }
        }
    };

    const handleRemoveItem = (index: number) => {
        const updatedItems = data.items.filter((_, i) => i !== index);
        setData('items', updatedItems);
    };

    const subtotal = React.useMemo(() => {
        return data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }, [data.items]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/returns', {
            onError: () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            },
        });
    };

    return (
        <>
            <Head title={t('Buat Retur Baru', 'Create New Return')} />
            <div className="flex flex-1 flex-col gap-6 p-6 max-w-5xl mx-auto">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/returns" aria-label={t('Kembali ke Retur', 'Back to Returns')}>
                            <ArrowLeft className="size-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{t('Buat Retur Barang', 'Create Item Return')}</h1>
                        <p className="text-muted-foreground text-sm">{t('Proses pengembalian barang atau barang reject.', 'Process item return or reject notes.')}</p>
                    </div>
                </div>

                {Object.keys(errors).length > 0 && (
                    <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                        <p className="font-semibold">{t('Gagal menyimpan retur. Periksa kembali isian berikut:', 'Failed to save return. Please check the following:')}</p>
                        <ul className="mt-1 list-disc list-inside">
                            {Object.values(errors).map((message, idx) => (
                                <li key={idx}>{message}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-3">
                    {/* Left 2 Columns */}
                    <div className="md:col-span-2 space-y-6">
                        <Card className="border border-sidebar-border/70">
                            <CardHeader>
                                <CardTitle>{t('Detail Retur', 'Return Details')}</CardTitle>
                                <CardDescription>{t('Pilih pesanan dan jenis retur.', 'Select the order and return type.')}</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="order">{t('Pesanan / PO', 'Order / PO')}</Label>
                                    <Select
                                        value={data.order_id}
                                        onValueChange={(value) => setData('order_id', value)}
                                    >
                                        <SelectTrigger id="order" className="w-full">
                                            <SelectValue placeholder={t('Pilih Pesanan', 'Select Order')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {orders.map((o) => (
                                                <SelectItem key={o.id} value={o.id}>{o.id} - {o.customer.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="type">{t('Jenis Retur', 'Return Type')}</Label>
                                    <Select
                                        value={data.type}
                                        onValueChange={(value) => setData('type', value as any)}
                                    >
                                        <SelectTrigger id="type" className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="credit_internal">{t('Kredit Internal', 'Internal Credit')}</SelectItem>
                                            <SelectItem value="debit_external">{t('Debit Eksternal (Cust)', 'External Debit (Cust)')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="reason">{t('Alasan Retur', 'Reason')}</Label>
                                    <Textarea
                                        id="reason"
                                        placeholder={t('Jelaskan alasan barang diretur...', 'Explain why the items are returned...')}
                                        value={data.reason}
                                        onChange={(e) => setData('reason', e.target.value)}
                                        className="h-20"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Add Line Item Form */}
                        <Card className="border border-sidebar-border/70">
                            <CardHeader>
                                <CardTitle>{t('Pilih Barang', 'Select Items')}</CardTitle>
                                <CardDescription>{t('Pilih barang yang diretur dari pesanan ini.', 'Select the returned items from this order.')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="sm:col-span-2 space-y-2">
                                        <Label htmlFor="product">{t('Produk', 'Product')}</Label>
                                        <Select
                                            value={String(selectedProductId)}
                                            onValueChange={(value) => setSelectedProductId(Number(value))}
                                            disabled={!selectedOrder}
                                        >
                                            <SelectTrigger id="product" className="w-full">
                                                <SelectValue placeholder={t('Pilih Produk', 'Select Product')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {selectedOrder?.items.map((i) => (
                                                    <SelectItem key={i.product_id} value={String(i.product_id)}>
                                                        {i.product.name} (Max {i.quantity})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="qty">{t('Jumlah Diretur', 'Return Qty')}</Label>
                                        <Input
                                            id="qty"
                                            type="number"
                                            min="1"
                                            value={selectedQty}
                                            onChange={(e) => setSelectedQty(Math.max(1, Number(e.target.value)))}
                                        />
                                    </div>
                                </div>
                                <Button type="button" onClick={handleAddItem} variant="secondary" className="w-full flex items-center justify-center gap-1" disabled={!selectedOrder}>
                                    <Plus className="size-4" /> {t('Tambahkan ke Retur', 'Add to Return')}
                                </Button>
                                {errors.items && (
                                    <p className="text-sm text-red-600">{errors.items}</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Return Lines Table */}
                        <Card className="border border-sidebar-border/70">
                            <CardHeader>
                                <CardTitle>{t('Barang Retur', 'Returned Items')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Nama Produk', 'Product Name')}</TableHead>
                                            <TableHead className="w-[100px] text-right">{t('Harga', 'Price')}</TableHead>
                                            <TableHead className="w-[80px] text-center">{t('Kuantitas', 'Qty')}</TableHead>
                                            <TableHead className="w-[120px] text-right">Total</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.items.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                    {t('Belum ada barang yang diretur.', 'No items added yet.')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            data.items.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">{item.product_name}</TableCell>
                                                    <TableCell className="text-right">{formatPrice(item.price)}</TableCell>
                                                    <TableCell className="text-center">{item.quantity} / {item.max_qty}</TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {formatPrice(item.price * item.quantity)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-500 hover:text-red-700"
                                                            onClick={() => handleRemoveItem(index)}
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        <Card className="border border-sidebar-border/70 sticky top-6 bg-neutral-50 dark:bg-neutral-900/50">
                            <CardHeader>
                                <CardTitle>{t('Ringkasan Retur', 'Return Summary')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between font-bold text-lg pt-2 border-b pb-4">
                                    <span>{t('Total Retur', 'Total Return')}</span>
                                    <span className="text-red-500">{formatPrice(subtotal)}</span>
                                </div>
                                <Button 
                                    type="submit" 
                                    className="w-full mt-4 flex items-center justify-center gap-1 font-semibold"
                                    disabled={data.items.length === 0 || processing}
                                >
                                    <Save className="size-4" /> {t('Simpan Retur', 'Submit Return')}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </form>
            </div>
        </>
    );
}

CreateReturn.layout = {
    breadcrumbs: [
        {
            title: 'Returns',
            href: '/returns',
        },
        {
            title: 'Create Return',
            href: '/returns/create',
        },
    ],
};
