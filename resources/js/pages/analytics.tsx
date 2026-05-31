import { Head } from '@inertiajs/react';
import { Award, Package } from 'lucide-react';
import * as React from 'react';
import { useCurrency } from '@/components/currency-context';
import { useLanguage } from '@/components/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RepPerformance {
    name: string;
    sales: number;
    deals: number;
}

interface ProductPopularity {
    name: string;
    quantity: number;
    revenue: number;
}

interface AnalyticsProps {
    rep_performance: RepPerformance[];
    product_popularity: ProductPopularity[];
}

export default function Analytics({ rep_performance, product_popularity }: AnalyticsProps) {
    const { formatPrice } = useCurrency();
    const { t } = useLanguage();

    return (
        <>
            <Head title={t('Analisis & Laporan', 'Analytics')} />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('Analisis & Laporan', 'Analytics & Reports')}</h1>
                    <p className="text-muted-foreground text-sm">{t('Tinjau peringkat performa perwakilan penjualan dan popularitas produk.', 'Review representative performance rankings and products popularity.')}</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Sales Rep Performance */}
                    <Card className="border border-sidebar-border/70">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Award className="size-5 text-yellow-500" /> {t('Klasemen Perwakilan Penjualan', 'Representative Standings')}
                            </CardTitle>
                            <CardDescription>{t('Peringkat performa berdasarkan nilai kesepakatan penjualan yang ditutup.', 'Performance leaderboard based on closed deal values.')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Perwakilan Penjualan', 'Sales Representative')}</TableHead>
                                        <TableHead className="text-right">{t('Kesepakatan Aktif', 'Active Deals')}</TableHead>
                                        <TableHead className="text-right">{t('Total Nilai Penjualan', 'Total Closed Value')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rep_performance.map((rep, idx) => (
                                        <TableRow key={rep.name}>
                                            <TableCell className="font-semibold">
                                                <span className="mr-2 text-muted-foreground">#{idx + 1}</span>
                                                {rep.name}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{rep.deals}</TableCell>
                                            <TableCell className="text-right font-bold text-green-600 dark:text-green-400">
                                                {formatPrice(rep.sales)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Product Revenue Leaderboard */}
                    <Card className="border border-sidebar-border/70">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="size-5 text-primary" /> {t('Produk Terpopuler', 'Popular Products')}
                            </CardTitle>
                            <CardDescription>{t('Daftar produk paling laku diurutkan berdasarkan kuantitas penjualan.', 'Popular catalog items sorted by units shipped.')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Barang Katalog', 'Catalog Item')}</TableHead>
                                        <TableHead className="text-right">{t('Jumlah Terjual', 'Units Sold')}</TableHead>
                                        <TableHead className="text-right">{t('Pendapatan Kotor', 'Gross Revenue')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {product_popularity.map((prod) => (
                                        <TableRow key={prod.name}>
                                            <TableCell className="font-semibold">{prod.name}</TableCell>
                                            <TableCell className="text-right font-medium">{prod.quantity}</TableCell>
                                            <TableCell className="text-right font-bold text-primary">
                                                {formatPrice(prod.revenue)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

Analytics.layout = {
    breadcrumbs: [
        {
            title: 'Analytics',
            href: '/analytics',
        },
    ],
};
