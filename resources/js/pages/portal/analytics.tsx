import { Head, router } from '@inertiajs/react';
import { Award, Package, Calendar, Download, DollarSign, ShoppingCart, Clock, CheckCircle2 } from 'lucide-react';
import * as React from 'react';
import { useCurrency } from '@/components/currency-context';
import { useLanguage } from '@/components/language-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface ChartDataItem {
    month: string;
    sales: number;
}

interface MetricProps {
    total_sales: number;
    total_orders: number;
    pending_orders: number;
    validated_orders: number;
}

interface AnalyticsProps {
    rep_performance: RepPerformance[];
    product_popularity: ProductPopularity[];
    chart_data: ChartDataItem[];
    filters: {
        start_date: string;
        end_date: string;
    };
    metrics: MetricProps;
}

export default function Analytics({ rep_performance, product_popularity, chart_data, filters, metrics }: AnalyticsProps) {
    const { formatPrice } = useCurrency();
    const { t } = useLanguage();

    const [startDate, setStartDate] = React.useState(filters.start_date);
    const [endDate, setEndDate] = React.useState(filters.end_date);

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/analytics', {
            start_date: startDate,
            end_date: endDate,
        }, {
            preserveState: true,
        });
    };

    const handleExport = () => {
        window.location.href = `/analytics/export?start_date=${startDate}&end_date=${endDate}`;
    };

    const maxChartValue = React.useMemo(() => {
        const vals = chart_data.map(d => d.sales);

        return vals.length > 0 ? Math.max(...vals, 1000) : 1000;
    }, [chart_data]);

    return (
        <>
            <Head title={t('Analisis & Laporan', 'Analytics')} />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{t('Analisis & Laporan', 'Analytics & Reports')}</h1>
                        <p className="text-muted-foreground text-sm">
                            {t('Tinjau performa penjualan keseluruhan, peringkat perwakilan, dan statistik produk.', 'Review overall sales performance, rep standings, and product metrics.')}
                        </p>
                    </div>
                    <Button variant="outline" onClick={handleExport} className="flex items-center gap-1.5 self-start">
                        <Download className="size-4" /> {t('Unduh Laporan (CSV)', 'Export Report (CSV)')}
                    </Button>
                </div>

                {/* Filter Panel */}
                <Card className="border border-sidebar-border/80 bg-muted/10">
                    <CardContent className="pt-6">
                        <form onSubmit={handleFilter} className="flex flex-col gap-4 sm:flex-row sm:items-end">
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                    <Calendar className="size-3" /> {t('Tanggal Mulai', 'Start Date')}
                                </Label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                    <Calendar className="size-3" /> {t('Tanggal Akhir', 'End Date')}
                                </Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                            <Button type="submit" variant="default" className="px-6">
                                {t('Saring', 'Filter')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* KPI Metrics */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border border-sidebar-border/75">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">{t('Total Nilai Validasi', 'Validated Sales')}</CardTitle>
                            <DollarSign className="text-muted-foreground size-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatPrice(metrics.total_sales)}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('Dari rentang tanggal tersaring', 'Within selected date range')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border border-sidebar-border/75">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">{t('Jumlah Transaksi', 'Total Orders')}</CardTitle>
                            <ShoppingCart className="text-muted-foreground size-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.total_orders}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('Total transaksi terdaftar', 'Total registered transactions')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border border-sidebar-border/75">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">{t('Antrean Validasi', 'Pending Validation')}</CardTitle>
                            <Clock className="text-yellow-500 size-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.pending_orders}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('Menunggu persetujuan akuntansi', 'Waiting accounting approval')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border border-sidebar-border/75">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">{t('Selesai Tervalidasi', 'Total Validated')}</CardTitle>
                            <CheckCircle2 className="text-green-500 size-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.validated_orders}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('Transaksi sah sepanjang masa', 'Lifetime validated orders')}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Trend Chart */}
                <Card className="border border-sidebar-border/75">
                    <CardHeader>
                        <CardTitle>{t('Tren Pendapatan Bulanan', 'Monthly Revenue Trend')}</CardTitle>
                        <CardDescription>{t('Tren penjualan tervalidasi per bulan', 'Trend of validated sales grouped by month')}</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[260px] flex items-end justify-between gap-3 pt-6 px-6 pb-2">
                        {chart_data.length === 0 ? (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                                {t('Tidak ada data tren dalam rentang tanggal ini.', 'No trend data within this date range.')}
                            </div>
                        ) : (
                            chart_data.map((item, idx) => {
                                const heightPercent = (item.sales / maxChartValue) * 100;

                                return (
                                    <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end group">
                                        <div className="relative w-full flex justify-center">
                                            <span className="absolute bottom-full mb-2 bg-neutral-900 dark:bg-neutral-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 font-bold">
                                                {formatPrice(item.sales)}
                                            </span>
                                        </div>
                                        <div 
                                            className="w-full max-w-[32px] rounded-t bg-primary/80 group-hover:bg-primary transition-all duration-300"
                                            style={{ height: `${heightPercent}%` }}
                                        />
                                        <span className="text-xs text-muted-foreground mt-2 font-medium">{item.month}</span>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

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
                                        <TableHead className="text-right">{t('Kesepakatan Tervalidasi', 'Validated Deals')}</TableHead>
                                        <TableHead className="text-right">{t('Total Nilai Penjualan', 'Total Closed Value')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rep_performance.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center h-28 text-muted-foreground">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <Award className="size-7 opacity-30" />
                                                    {t('Belum ada data penjualan perwakilan.', 'No sales rep performance data.')}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        rep_performance.map((rep, idx) => (
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
                                        ))
                                    )}
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
                                    {product_popularity.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center h-28 text-muted-foreground">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <Package className="size-7 opacity-30" />
                                                    {t('Belum ada produk terjual.', 'No popular product data.')}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        product_popularity.map((prod) => (
                                            <TableRow key={prod.name}>
                                                <TableCell className="font-semibold">{prod.name}</TableCell>
                                                <TableCell className="text-right font-medium">{prod.quantity}</TableCell>
                                                <TableCell className="text-right font-bold text-primary">
                                                    {formatPrice(prod.revenue)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
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
            title: 'Analytics & Reports',
            href: '/analytics',
        },
    ],
};
