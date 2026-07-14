import { Head, useForm } from '@inertiajs/react';
import * as React from 'react';
import InputError from '@/components/input-error';
import { useLanguage } from '@/components/language-context';
import { useCurrency } from '@/components/currency-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Product {
    id: number;
    code: string;
    name: string;
    category: string;
    unit: string;
    stock: number;
    min: number;
    location: string | null;
    price: number;
}

interface EditProductProps {
    product: Product;
}

export default function EditProduct({ product }: EditProductProps) {
    const { t } = useLanguage();
    const { currency, convertToBase, convertFromBase } = useCurrency();
    const { data, setData, put, processing, errors, transform } = useForm({
        code: product.code,
        name: product.name,
        category: product.category,
        unit: product.unit,
        stock: product.stock,
        min: product.min,
        location: product.location || '',
        price: convertFromBase(product.price),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        transform((data) => ({
            ...data,
            price: convertToBase(data.price),
        }));
        put(`/products/${product.id}`);
    };

    return (
        <>
            <Head title={t('Ubah Produk', 'Edit Product')} />
            <div className="flex flex-1 flex-col gap-6 p-6 max-w-2xl mx-auto w-full">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('Ubah Data Produk', 'Edit Product Data')}</h1>
                    <p className="text-muted-foreground text-sm">{t('Perbarui detail informasi produk yang terdaftar di inventaris.', 'Update details of the product registered in the inventory.')}</p>
                </div>

                <Card className="shadow-sm border-white/20 bg-card/80 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle>{t('Informasi Produk', 'Product Information')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="category">{t('Kategori', 'Category')}</Label>
                                    <Input
                                        id="category"
                                        value={data.category}
                                        onChange={(e) => setData('category', e.target.value)}
                                        placeholder={t('Contoh: SaaS, Cloud, Hardware', 'e.g. SaaS, Cloud, Hardware')}
                                    />
                                    <InputError message={errors.category} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="unit">{t('Satuan Unit', 'Unit of Measure')}</Label>
                                    <Input
                                        id="unit"
                                        value={data.unit}
                                        onChange={(e) => setData('unit', e.target.value)}
                                        placeholder={t('Contoh: Pcs, Box, User/Mo', 'e.g. Pcs, Box, User/Mo')}
                                    />
                                    <InputError message={errors.unit} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                                    <Label htmlFor="location">{t('Lokasi Penyimpanan', 'Storage Location')}</Label>
                                    <Input
                                        id="location"
                                        value={data.location}
                                        onChange={(e) => setData('location', e.target.value)}
                                        placeholder={t('Contoh: Rak A-3, Cloud-US', 'e.g. Shelf A-3, Cloud-US')}
                                    />
                                    <InputError message={errors.location} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="price">{t('Harga Jual', 'Selling Price')} ({currency})</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    value={data.price || ''}
                                    onChange={(e) => setData('price', Number(e.target.value))}
                                />
                                <InputError message={errors.price} />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={() => window.history.back()}>
                                    {t('Batal', 'Cancel')}
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {t('Perbarui Produk', 'Update Product')}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

EditProduct.layout = {
    breadcrumbs: [
        { title: 'Products', href: '/products' },
        { title: 'Edit', href: '' },
    ],
};
