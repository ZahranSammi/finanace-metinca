import { Head, Link, router, usePage } from '@inertiajs/react';
import { Search, Tag, Package, Plus, MoreHorizontal, Edit, Trash2, ShieldAlert, MapPin, DollarSign, Layers } from 'lucide-react';
import * as React from 'react';
import { useCurrency } from '@/components/currency-context';
import { useLanguage } from '@/components/language-context';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

interface ProductsProps {
    products: Product[];
}

export default function Products({ products }: ProductsProps) {
    const { formatPrice } = useCurrency();
    const { t } = useLanguage();
    const { auth } = usePage().props as any;
    const isSales = auth?.user?.role === 'staff_sales';
    const [searchQuery, setSearchQuery] = React.useState('');

    const filteredProducts = React.useMemo(() => {
        return products.filter((p) => {
            return p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                   p.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
                   p.category.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [products, searchQuery]);

    const handleDelete = (id: number) => {
        if (confirm(t('Apakah Anda yakin ingin menghapus produk ini?', 'Are you sure you want to delete this product?'))) {
            router.delete(`/products/${id}`);
        }
    };

    return (
        <>
            <Head title={t('Daftar Produk', 'Products')} />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{t('Inventaris Produk', 'Product Inventory')}</h1>
                        <p className="text-muted-foreground text-sm">{t('Kelola data produk, stok, lokasi penyimpanan, dan harga jual.', 'Manage product data, stock, storage location, and selling prices.')}</p>
                    </div>
                    {isSales && (
                        <Link href="/products/create">
                            <Button className="gap-2">
                                <Plus className="size-4" /> {t('Tambah Produk', 'Add Product')}
                            </Button>
                        </Link>
                    )}
                </div>

                {/* Search Product */}
                <div className="flex justify-end border-b pb-4">
                    <div className="relative w-full max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder={t('Cari produk (nama, kode, kategori)...', 'Search products (name, code, category)...')}
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Products Table */}
                <div className="rounded-md border border-sidebar-border/70 bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Kode', 'Code')}</TableHead>
                                <TableHead>{t('Nama Produk', 'Product Name')}</TableHead>
                                <TableHead>{t('Kategori', 'Category')}</TableHead>
                                <TableHead className="text-right">{t('Stok', 'Stock')}</TableHead>
                                <TableHead>{t('Lokasi', 'Location')}</TableHead>
                                <TableHead className="text-right">{t('Harga', 'Price')}</TableHead>
                                {isSales && <TableHead className="w-[80px]"></TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProducts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isSales ? 7 : 6} className="h-32 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Package className="size-8 opacity-30" />
                                            {t('Tidak ada data produk ditemukan.', 'No products found.')}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProducts.map((p) => {
                                    const isLowStock = p.stock <= p.min;
                                    return (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-mono text-xs font-semibold">{p.code}</TableCell>
                                            <TableCell>
                                                <div className="font-semibold">{p.name}</div>
                                                <div className="text-xs text-muted-foreground">{p.unit}</div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground font-medium">
                                                    <Layers className="size-3" /> {p.category}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={`inline-flex items-center gap-1 font-semibold ${isLowStock ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                                                    {p.stock}
                                                    {isLowStock && (
                                                        <span title={t('Stok Menipis!', 'Low Stock!')}>
                                                            <ShieldAlert className="size-3.5" />
                                                        </span>
                                                    )}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {p.location ? (
                                                    <span className="flex items-center gap-1 text-muted-foreground text-sm">
                                                        <MapPin className="size-3.5" /> {p.location}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs italic">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatPrice(p.price)}
                                            </TableCell>
                                            {isSales && (
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="size-8 p-0" aria-label={t('Buka menu aksi', 'Open actions menu')}>
                                                                <MoreHorizontal className="size-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <Link href={`/products/${p.id}/edit`}>
                                                                <DropdownMenuItem className="gap-2 cursor-pointer">
                                                                    <Edit className="size-4" /> {t('Ubah', 'Edit')}
                                                                </DropdownMenuItem>
                                                            </Link>
                                                            <DropdownMenuItem 
                                                                className="gap-2 text-destructive cursor-pointer"
                                                                onClick={() => handleDelete(p.id)}
                                                            >
                                                                <Trash2 className="size-4" /> {t('Hapus', 'Delete')}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </>
    );
}

Products.layout = {
    breadcrumbs: [{ title: 'Products', href: '/products' }],
};
