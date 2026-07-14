import { Head, useForm } from '@inertiajs/react';
import * as React from 'react';
import InputError from '@/components/input-error';
import { useLanguage } from '@/components/language-context';
import { useCurrency } from '@/components/currency-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CreateProduct() {
    const { t } = useLanguage();
    const { currency, convertToBase } = useCurrency();
    const { data, setData, post, processing, errors, transform } = useForm({
        code: '',
        name: '',
        category: '',
        unit: 'Pcs',
        stock: 0,
        min: 5,
        location: '',
        price: 0,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        transform((data) => ({
            ...data,
            price: convertToBase(data.price),
        }));
        post('/products');
    };

    return (
        <>
            <Head title={t('Tambah Produk', 'Add Product')} />
            <div className="flex flex-1 flex-col gap-6 p-6 max-w-5xl mx-auto w-full">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">{t('Tambah Produk Baru', 'Add New Product')}</h1>
                    <p className="text-muted-foreground">{t('Masukkan informasi detail produk untuk ditambahkan ke inventaris.', 'Enter product details to add to the inventory.')}</p>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Info Card */}
                        <Card className="shadow-sm border-white/20 bg-card/80 backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle>{t('Informasi Dasar', 'Basic Information')}</CardTitle>
                                <CardDescription>{t('Detail utama dari produk yang akan ditambahkan.', 'Main details of the product being added.')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="code">{t('Kode Produk', 'Product Code')}</Label>
                                        <Input
                                            id="code"
                                            value={data.code}
                                            onChange={(e) => setData('code', e.target.value)}
                                            placeholder={t('Contoh: PRD-001', 'e.g. PRD-001')}
                                        />
                                        <InputError message={errors.code} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="name">{t('Nama Produk', 'Product Name')}</Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            placeholder={t('Contoh: Enterprise Cloud', 'e.g. Enterprise Cloud')}
                                        />
                                        <InputError message={errors.name} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="category">{t('Kategori', 'Category')}</Label>
                                        <Select value={data.category} onValueChange={(value) => setData('category', value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Pilih Kategori', 'Select Category')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="SaaS">SaaS</SelectItem>
                                                <SelectItem value="Cloud">Cloud</SelectItem>
                                                <SelectItem value="Hardware">Hardware</SelectItem>
                                                <SelectItem value="Services">Services</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.category} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="unit">{t('Satuan Unit', 'Unit of Measure')}</Label>
                                        <Select value={data.unit} onValueChange={(value) => setData('unit', value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Pilih Satuan', 'Select Unit')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Pcs">Pcs</SelectItem>
                                                <SelectItem value="Box">Box</SelectItem>
                                                <SelectItem value="User/Mo">User/Mo</SelectItem>
                                                <SelectItem value="License">License</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.unit} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Pricing Card */}
                        <Card className="shadow-sm border-white/20 bg-card/80 backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle>{t('Harga', 'Pricing')}</CardTitle>
                                <CardDescription>{t('Tentukan harga jual produk.', 'Set the selling price of the product.')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Label htmlFor="price">{t('Harga Jual', 'Selling Price')} ({currency})</Label>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <span className="text-muted-foreground sm:text-sm">{currency === 'IDR' ? 'Rp' : '$'}</span>
                                        </div>
                                        <Input
                                            id="price"
                                            type="number"
                                            step="0.01"
                                            className="pl-9"
                                            value={data.price || ''}
                                            onChange={(e) => setData('price', Number(e.target.value))}
                                        />
                                    </div>
                                    <InputError message={errors.price} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        {/* Inventory Card */}
                        <Card className="shadow-sm border-white/20 bg-card/80 backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle>{t('Inventaris', 'Inventory')}</CardTitle>
                                <CardDescription>{t('Atur stok dan lokasi.', 'Set stock and storage.')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="stock">{t('Stok Awal', 'Initial Stock')}</Label>
                                    <Input
                                        id="stock"
                                        type="number"
                                        value={data.stock}
                                        onChange={(e) => setData('stock', Number(e.target.value))}
                                    />
                                    <InputError message={errors.stock} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="min">{t('Stok Minimum', 'Min Stock Threshold')}</Label>
                                    <Input
                                        id="min"
                                        type="number"
                                        value={data.min}
                                        onChange={(e) => setData('min', Number(e.target.value))}
                                    />
                                    <InputError message={errors.min} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location">{t('Lokasi', 'Location')}</Label>
                                    <Input
                                        id="location"
                                        value={data.location}
                                        onChange={(e) => setData('location', e.target.value)}
                                        placeholder={t('Contoh: Rak A-3', 'e.g. Shelf A-3')}
                                    />
                                    <InputError message={errors.location} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        <div className="flex flex-col gap-3">
                            <Button type="submit" size="lg" className="w-full shadow-md" disabled={processing}>
                                {t('Simpan Produk', 'Save Product')}
                            </Button>
                            <Button type="button" size="lg" variant="outline" className="w-full" onClick={() => window.history.back()}>
                                {t('Batal', 'Cancel')}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}

CreateProduct.layout = {
    breadcrumbs: [
        { title: 'Products', href: '/products' },
        { title: 'Add', href: '/products/create' },
    ],
};
