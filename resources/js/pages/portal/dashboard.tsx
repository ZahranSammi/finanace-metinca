import { Head, Link, usePage } from '@inertiajs/react';
import { ShoppingCart, Clock, CheckCircle2, TrendingUp, ArrowUpRight, DollarSign, Undo2 } from 'lucide-react';
import { useCurrency } from '@/components/currency-context';
import { useLanguage } from '@/components/language-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface MetricProps {
    total_sales: number;
    total_paid_sales?: number;
    total_orders: number;
    pending_orders: number;
    validated_orders: number;
    approved_returns: number;
}

interface ChartDataItem {
    month: string;
    sales: number;
}

interface OrderItem {
    id: string;
    date_raised: string;
    customer_name: string;
    sales_rep: string;
    status: 'Pending' | 'Submitted' | 'utang' | 'lunas' | 'Rejected';
    total_amount: number;
}

interface DashboardProps {
    metrics: MetricProps;
    chart_data: ChartDataItem[];
    recent_orders: OrderItem[];
}

export default function Dashboard({ metrics, chart_data, recent_orders }: DashboardProps) {
    const { formatPrice } = useCurrency();
    const { t } = useLanguage();
    const { auth } = usePage().props as any;
    const role = auth?.user?.role || 'staff_sales';

    return (
        <>
            <Head title={t('Dasbor Utama', 'Dashboard Overview')} />
            <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:gap-6 sm:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {role === 'staff_sales' ? t('Dasbor Penjualan (Staff Sales)', 'Sales Representative Dashboard') :
                             role === 'staff_accounting' ? t('Dasbor Staff Accounting', 'Accounting Staff Dashboard') :
                             t('Dasbor Manager Accounting', 'Accounting Manager Dashboard')}
                        </h1>
                        <p className="text-muted-foreground text-sm font-medium">
                            {role === 'staff_sales' ? t('Monitor pesanan Anda dan status persetujuan transaksi.', 'Monitor your orders and transaction approval status.') :
                             role === 'staff_accounting' ? t('Validasi pesanan masuk, kelola Purchase Order, dan awasi rekap penjualan.', 'Validate incoming orders, manage Purchase Orders, and oversee sales recaps.') :
                             t('Tinjau laporan detail penjualan, validasi Purchase Order, dan pantau Laporan Neraca perusahaan.', 'Review detailed sales reports, validate Purchase Orders, and monitor the company Balance Sheet.')}
                        </p>
                    </div>
                </div>

                {role === 'staff_accounting' && metrics.pending_orders > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400 p-4 rounded-lg flex justify-between items-center text-sm font-semibold">
                        <span>{t(`Terdapat ${metrics.pending_orders} pesanan yang menunggu keputusan validasi Anda.`, `There are ${metrics.pending_orders} orders awaiting your validation decision.`)}</span>
                        <Button size="sm" variant="outline" asChild className="text-xs bg-transparent hover:bg-yellow-500/20 border-yellow-500/30 text-yellow-700 dark:text-yellow-400">
                            <Link href="/accounting/inbox">{t('Buka Kotak Masuk', 'Open Inbox')}</Link>
                        </Button>
                    </div>
                )}

                {/* KPI Metrics Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                    <Card className="border border-sidebar-border/75">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">{t('Total Penjualan', 'Total Sales')}</CardTitle>
                            <DollarSign className="text-muted-foreground size-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatPrice(metrics.total_sales)}</div>
                            <p className="text-xs text-green-500 flex items-center gap-1 mt-1 font-medium">
                                <TrendingUp className="size-3" /> +12.5% {t('dari bulan lalu', 'from last month')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border border-sidebar-border/75">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">{t('Jumlah Pesanan', 'Total Orders')}</CardTitle>
                            <ShoppingCart className="text-muted-foreground size-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.total_orders}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('Pesanan sepanjang masa', 'Lifetime orders processed')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border border-sidebar-border/75">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">{t('Pesanan Pending', 'Pending Orders')}</CardTitle>
                            <Clock className="text-yellow-500 size-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.pending_orders}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {role === 'staff_sales' ? t('Draft pesanan', 'Draft orders') : t('Menunggu validasi', 'Awaiting validation')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border border-sidebar-border/75">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">{t('Pesanan Berjalan / Utang', 'Active Debt / Paid')}</CardTitle>
                            <CheckCircle2 className="text-green-500 size-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.validated_orders}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('Siap dikirim', 'Ready for shipment')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border border-sidebar-border/75">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">{t('Retur Disetujui', 'Approved Returns')}</CardTitle>
                            <Undo2 className="text-emerald-500 size-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.approved_returns}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('Sudah diproses', 'Already processed')}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {role === 'manager' && metrics.total_paid_sales !== undefined && (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2 mt-2">
                        <Card className="border border-green-200 bg-green-50 dark:bg-green-950/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">{t('Total Penjualan Lunas', 'Total Paid Sales')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-700 dark:text-green-400">{formatPrice(metrics.total_paid_sales)}</div>
                            </CardContent>
                        </Card>
                        <Card className="border border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">{t('Total Penjualan Utang', 'Total Unpaid/Debt Sales')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{formatPrice(metrics.total_sales - metrics.total_paid_sales)}</div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <div className="mt-2 grid grid-cols-1 gap-6 xl:grid-cols-7">
                    {/* Sales Performance Chart */}
                    <Card className="xl:col-span-4 border border-sidebar-border/75">
                        <CardHeader>
                            <CardTitle>{t('Tren Penjualan', 'Sales Trend')}</CardTitle>
                            <CardDescription>{t('Grafik penjualan bulanan untuk tahun berjalan', 'Monthly sales figures for the current year')}</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px] flex items-end justify-between gap-2 pt-4 px-6 pb-2">
                            {chart_data.length === 0 ? (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                                    Belum ada data tren penjualan.
                                </div>
                            ) : (
                                (() => {
                                    // Tetapkan nilai maksimum minimal agar batang tidak selalu 100% jika hanya ada 1 data.
                                    const maxChartValue = Math.max(...chart_data.map(d => d.sales), 100000000); // 100 Juta baseline
                                    return chart_data.map((item, idx) => {
                                        const heightPercent = (item.sales / maxChartValue) * 100;

                                return (
                                    <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end group">
                                        <div className="relative w-full flex justify-center">
                                            {/* Tooltip on hover */}
                                            <span className="absolute bottom-full mb-2 bg-neutral-900 dark:bg-neutral-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 font-bold">
                                                {formatPrice(item.sales)}
                                            </span>
                                        </div>
                                        <div 
                                            className="w-full max-w-[28px] rounded-t bg-primary/80 group-hover:bg-primary transition-all duration-300"
                                            style={{ height: `${heightPercent}%` }}
                                        />
                                        <span className="text-xs text-muted-foreground mt-2 font-medium">{item.month}</span>
                                    </div>
                                );
                                    });
                                })()
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Orders List */}
                    <Card className="xl:col-span-3 border border-sidebar-border/75">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>{t('Pesanan Terbaru', 'Recent Orders')}</CardTitle>
                                <CardDescription>{t('Daftar transaksi pesanan masuk terbaru', 'Latest orders from order entry portal')}</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <Link href={
                                    role === 'staff_accounting' ? '/accounting/inbox' :
                                    role === 'manager' ? '/manager/sales-recap' :
                                    '/sales/invoice-rekap'
                                }>
                                    {t('Lihat Semua', 'View All')} <ArrowUpRight className="size-4 ml-1" />
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recent_orders.map((order) => (
                                    <div key={order.id} className="flex items-center justify-between border-b pb-3 last:border-b-0 last:pb-0">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">{order.customer_name}</p>
                                            <p className="text-xs text-muted-foreground">{order.id} &bull; {order.date_raised}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge variant={
                                                order.status === 'lunas' ? 'default' :
                                                order.status === 'utang' ? 'destructive' :
                                                order.status === 'Submitted' ? 'outline' :
                                                order.status === 'Pending' ? 'secondary' : 'destructive'
                                            } className={
                                                order.status === 'Submitted' 
                                                    ? 'border-blue-500 text-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                                                    : order.status === 'utang'
                                                    ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400'
                                                    : order.status === 'lunas'
                                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    : ''
                                            }>
                                                {t(
                                                    order.status === 'lunas' ? 'Lunas' : 
                                                    order.status === 'utang' ? 'Utang' : 
                                                    order.status === 'Submitted' ? 'Dikirim' : 
                                                    order.status === 'Pending' ? 'Draft' : 'Ditolak', 
                                                    order.status
                                                )}
                                            </Badge>
                                            <span className="text-sm font-semibold">
                                                {formatPrice(order.total_amount)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
    ],
};
