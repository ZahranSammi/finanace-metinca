import { Head } from '@inertiajs/react';
import { Search, AlertTriangle } from 'lucide-react';
import * as React from 'react';
import { useCurrency } from '@/components/currency-context';
import { useLanguage } from '@/components/language-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Product {
    id: number;
    name: string;
    category: string;
    price: number;
    stock: number;
}

interface InventoryProps {
    products: Product[];
}

export default function Inventory({ products }: InventoryProps) {
    const { formatPrice } = useCurrency();
    const { t } = useLanguage();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedCategory, setSelectedCategory] = React.useState('All');

    const categories = React.useMemo(() => {
        const cats = new Set(products.map(p => p.category));

        return ['All', ...Array.from(cats)];
    }, [products]);

    const filteredProducts = React.useMemo(() => {
        return products.filter((p) => {
            const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 p.category.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesCategory && matchesSearch;
        });
    }, [products, selectedCategory, searchQuery]);

    return (
        <>
            <Head title={t('Inventaris Produk', 'Inventory Management')} />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{t('Manajemen Inventaris', 'Inventory Management')}</h1>
                        <p className="text-muted-foreground text-sm">{t('Pantau katalog produk dan tingkat persediaan stok saat ini.', 'Monitor product catalog and current stock levels.')}</p>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
                    <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                            <Button
                                key={cat}
                                variant={selectedCategory === cat ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedCategory(cat)}
                            >
                                {cat === 'All' ? t('Semua', 'All') : cat}
                            </Button>
                        ))}
                    </div>

                    <div className="relative w-full max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder={t('Cari katalog...', 'Search catalog...')}
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Inventory Table */}
                <div className="rounded-md border border-sidebar-border/70 bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead>{t('Nama Produk', 'Product Name')}</TableHead>
                                <TableHead>{t('Kategori', 'Category')}</TableHead>
                                <TableHead className="text-right">{t('Harga', 'Price')}</TableHead>
                                <TableHead className="text-right">{t('Tingkat Stok', 'Stock Level')}</TableHead>
                                <TableHead>{t('Status', 'Status')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProducts.map((p) => {
                                const isLowStock = p.stock <= 25;

                                return (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-semibold text-muted-foreground">#{p.id}</TableCell>
                                        <TableCell className="font-semibold">{p.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{p.category}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{formatPrice(p.price)}</TableCell>
                                        <TableCell className="text-right font-medium">{p.stock}</TableCell>
                                        <TableCell>
                                            {isLowStock ? (
                                                <Badge variant="destructive" className="flex items-center gap-1 w-fit bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900">
                                                    <AlertTriangle className="size-3" /> {t('Stok Menipis', 'Low Stock')}
                                                </Badge>
                                            ) : (
                                                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900">
                                                    {t('Tersedia', 'In Stock')}
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </>
    );
}

Inventory.layout = {
    breadcrumbs: [
        {
            title: 'Inventory',
            href: '/inventory',
        },
    ],
};
