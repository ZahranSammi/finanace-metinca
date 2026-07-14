import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import * as React from 'react';
import { useCurrency } from '@/components/currency-context';
import { useLanguage } from '@/components/language-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Customer {
    id: number;
    name: string;
    email: string;
}

interface Product {
    id: number;
    name: string;
    category: string;
    price: number;
    stock: number;
}

interface CreateOrderProps {
    customers: Customer[];
    products: Product[];
}

interface OrderLineItem {
    productId: number;
    quantity: number;
    price: number;
}

export default function CreateOrder({ customers, products }: CreateOrderProps) {
    const { formatPrice } = useCurrency();
    const { t } = useLanguage();
    const { auth } = usePage().props as any;

    const { data, setData, post, processing, errors } = useForm({
        customerId: customers[0]?.id || 0,
        salesRep: auth?.user?.name || '',
        items: [] as OrderLineItem[],
    });

    const [selectedProductId, setSelectedProductId] = React.useState<number>(products[0]?.id || 0);
    const [selectedQty, setSelectedQty] = React.useState<number>(1);

    const handleAddItem = () => {
        const product = products.find(p => p.id === selectedProductId);

        if (!product) {
return;
}

        // Check if item already exists
        const existingIdx = data.items.findIndex(item => item.productId === selectedProductId);

        if (existingIdx > -1) {
            const updatedItems = [...data.items];
            updatedItems[existingIdx].quantity += selectedQty;
            setData('items', updatedItems);
        } else {
            setData('items', [
                ...data.items,
                {
                    productId: selectedProductId,
                    quantity: selectedQty,
                    price: product.price
                }
            ]);
        }
    };

    const handleRemoveItem = (index: number) => {
        const updatedItems = data.items.filter((_, i) => i !== index);
        setData('items', updatedItems);
    };

    // Calculate invoice totals
    const subtotal = React.useMemo(() => {
        return data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }, [data.items]);

    const taxAmount = React.useMemo(() => {
        return subtotal * 0.11; // 11% VAT
    }, [subtotal]);

    const grandTotal = React.useMemo(() => {
        return subtotal + taxAmount;
    }, [subtotal, taxAmount]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/orders', {
            onError: () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            },
        });
    };

    return (
        <>
            <Head title={t('Buat Pesanan Baru', 'Create New Order')} />
            <div className="flex flex-1 flex-col gap-6 p-6 max-w-5xl mx-auto">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/orders" aria-label={t('Kembali ke Pesanan', 'Back to Orders')}>
                            <ArrowLeft className="size-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{t('Buat Pesanan Baru', 'Create New Order')}</h1>
                        <p className="text-muted-foreground text-sm">{t('Tambahkan informasi pelanggan dan item produk untuk membuat pesanan baru.', 'Add customer information and product lines to submit a new order.')}</p>
                    </div>
                </div>

                {Object.keys(errors).length > 0 && (
                    <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                        <p className="font-semibold">{t('Gagal menyimpan pesanan. Periksa kembali isian berikut:', 'Failed to save order. Please check the following:')}</p>
                        <ul className="mt-1 list-disc list-inside">
                            {Object.values(errors).map((message, idx) => (
                                <li key={idx}>{message}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-3">
                    {/* Left 2 Columns: Order Details & Products */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Customer Information */}
                        <Card className="border border-sidebar-border/70">
                            <CardHeader>
                                <CardTitle>{t('Detail Pelanggan', 'Customer Details')}</CardTitle>
                                <CardDescription>{t('Pilih pelanggan dan sales representative yang bertugas.', 'Select the client and responsible sales representative.')}</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="customer">{t('Pelanggan', 'Customer')}</Label>
                                    <Select
                                        value={String(data.customerId)}
                                        onValueChange={(value) => setData('customerId', Number(value))}
                                    >
                                        <SelectTrigger id="customer" className="w-full">
                                            <SelectValue placeholder={t('Pilih Pelanggan', 'Select Customer')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {customers.map((c) => (
                                                <SelectItem key={c.id} value={String(c.id)}>{c.name} ({c.email})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.customerId && (
                                        <p className="text-sm text-red-600">{errors.customerId}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sales-rep">Sales Representative</Label>
                                    <Input
                                        id="sales-rep"
                                        value={auth?.user?.name || ''}
                                        readOnly
                                        disabled
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t('Otomatis diisi dari akun Anda.', 'Automatically set from your account.')}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Add Line Item Form */}
                        <Card className="border border-sidebar-border/70">
                            <CardHeader>
                                <CardTitle>{t('Tambah Produk', 'Add Products')}</CardTitle>
                                <CardDescription>{t('Pilih produk dan jumlah kuantitas untuk dimasukkan ke pesanan.', 'Choose products and quantities to add to the purchase order.')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="sm:col-span-2 space-y-2">
                                        <Label htmlFor="product">{t('Produk', 'Product')}</Label>
                                        <Select
                                            value={String(selectedProductId)}
                                            onValueChange={(value) => setSelectedProductId(Number(value))}
                                        >
                                            <SelectTrigger id="product" className="w-full">
                                                <SelectValue placeholder={t('Pilih Produk', 'Select Product')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {products.map((p) => (
                                                    <SelectItem key={p.id} value={String(p.id)}>{p.name} - {formatPrice(p.price)} ({t('Stok', 'Stock')}: {p.stock})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="qty">{t('Jumlah', 'Quantity')}</Label>
                                        <Input
                                            id="qty"
                                            type="number"
                                            min="1"
                                            value={selectedQty}
                                            onChange={(e) => setSelectedQty(Math.max(1, Number(e.target.value)))}
                                        />
                                    </div>
                                </div>
                                <Button type="button" onClick={handleAddItem} variant="secondary" className="w-full flex items-center justify-center gap-1">
                                    <Plus className="size-4" /> {t('Tambah Baris Item', 'Add Item Line')}
                                </Button>
                                {errors.items && (
                                    <p className="text-sm text-red-600">{errors.items}</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Order Lines Table */}
                        <Card className="border border-sidebar-border/70">
                            <CardHeader>
                                <CardTitle>{t('Barang Pesanan', 'Order Items')}</CardTitle>
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
                                                    {t('Belum ada produk ditambahkan. Pilih produk dan klik "Tambah Baris Item".', 'No items added yet. Choose a product and click "Add Item Line".')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            data.items.map((item, index) => {
                                                const product = products.find(p => p.id === item.productId);

                                                return (
                                                    <TableRow key={index}>
                                                        <TableCell className="font-medium">{product?.name || 'Unknown'}</TableCell>
                                                        <TableCell className="text-right">{formatPrice(item.price)}</TableCell>
                                                        <TableCell className="text-center">{item.quantity}</TableCell>
                                                        <TableCell className="text-right font-semibold">
                                                            {formatPrice(item.price * item.quantity)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-red-500 hover:text-red-700"
                                                                title={t('Hapus Item', 'Remove Item')}
                                                                aria-label={t('Hapus Item', 'Remove Item')}
                                                                onClick={() => handleRemoveItem(index)}
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right 1 Column: Invoice summary & Submit action */}
                    <div className="space-y-6">
                        <Card className="border border-sidebar-border/70 sticky top-6 bg-neutral-50 dark:bg-neutral-900/50">
                            <CardHeader>
                                <CardTitle>{t('Ringkasan Pesanan', 'Order Summary')}</CardTitle>
                                <CardDescription>{t('Kalkulasi rincian biaya dan total akhir pesanan.', 'Financial summary and final total calculation.')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2 border-b pb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span>{formatPrice(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{t('Pajak (11%)', 'Tax (11%)')}</span>
                                        <span>{formatPrice(taxAmount)}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between font-bold text-lg pt-2">
                                    <span>{t('Total Akhir', 'Grand Total')}</span>
                                    <span className="text-primary">{formatPrice(grandTotal)}</span>
                                </div>

                                <Button 
                                    type="submit" 
                                    className="w-full mt-4 flex items-center justify-center gap-1 font-semibold"
                                    disabled={data.items.length === 0 || processing}
                                >
                                    <Save className="size-4" /> {t('Simpan Pesanan Pembelian', 'Submit Purchase Order')}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </form>
            </div>
        </>
    );
}

CreateOrder.layout = {
    breadcrumbs: [
        {
            title: 'Order Entry',
            href: '/orders',
        },
        {
            title: 'New Order',
            href: '/orders/create',
        },
    ],
};
