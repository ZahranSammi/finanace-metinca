import { Head, Link, useForm } from '@inertiajs/react';
import { Search, Download, Plus, ChevronLeft, ChevronRight, Edit3, Trash2 } from 'lucide-react';
import * as React from 'react';
import { useCurrency } from '@/components/currency-context';
import { useLanguage } from '@/components/language-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface OrderItem {
    id: string;
    date_raised: string;
    customer_name: string;
    sales_rep: string;
    status: 'Pending' | 'Validated' | 'Rejected';
    total_amount: number;
}

interface OrdersProps {
    orders: OrderItem[];
}

type FilterStatus = 'All' | 'Pending' | 'Validated' | 'Rejected';

export default function OrdersIndex({ orders }: OrdersProps) {
    const { formatPrice } = useCurrency();
    const { t } = useLanguage();
    const { delete: destroy } = useForm();
    const [statusFilter, setStatusFilter] = React.useState<FilterStatus>('All');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedOrders, setSelectedOrders] = React.useState<string[]>([]);

    const filteredOrders = React.useMemo(() => {
        return orders.filter((order) => {
            const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
            const matchesSearch = 
                order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.sales_rep.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesStatus && matchesSearch;
        });
    }, [orders, statusFilter, searchQuery]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedOrders(filteredOrders.map(o => o.id));
        } else {
            setSelectedOrders([]);
        }
    };

    const handleSelectOrder = (orderId: string, checked: boolean) => {
        if (checked) {
            setSelectedOrders(prev => [...prev, orderId]);
        } else {
            setSelectedOrders(prev => prev.filter(id => id !== orderId));
        }
    };

    // Export mock action
    const handleExport = () => {
        const headers = ['Order ID', 'Date Raised', 'Customer Name', 'Sales Rep', 'Status', 'Total Amount'];
        const rows = filteredOrders.map(o => [
            o.id, o.date_raised, o.customer_name, o.sales_rep, o.status, `$${o.total_amount}`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `orders_export_${statusFilter.toLowerCase()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDeleteOrder = (orderId: string) => {
        if (confirm(t(`Apakah Anda yakin ingin menghapus pesanan ${orderId}?`, `Are you sure you want to delete order ${orderId}?`))) {
            destroy(`/orders/${orderId}`);
        }
    };

    return (
        <>
            <Head title={t('Manajemen Pesanan', 'Order Management')} />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{t('Manajemen Pesanan', 'Order Management')}</h1>
                        <p className="text-muted-foreground text-sm">{t('Kelola, filter, dan ekspor pesanan penjualan pelanggan.', 'Manage, filter, and export customer sales orders.')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleExport} className="flex items-center gap-1">
                            <Download className="size-4" /> {t('Ekspor', 'Export')}
                        </Button>
                        <Button asChild className="flex items-center gap-1">
                            <Link href="/orders/create">
                                <Plus className="size-4" /> {t('Pesanan Baru', 'New Order')}
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Filters, Tabs & Search bar */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-4">
                    {/* Status Tabs */}
                    <div className="flex flex-wrap gap-1 bg-muted p-1 rounded-lg">
                        {(['All', 'Pending', 'Validated', 'Rejected'] as FilterStatus[]).map((tab) => {
                            const isActive = statusFilter === tab;
                            const count = tab === 'All' ? orders.length : orders.filter(o => o.status === tab).length;
                            const tabLabel = tab === 'All' ? t('Semua', 'All') :
                                             tab === 'Pending' ? t('Tertunda', 'Pending') :
                                             tab === 'Validated' ? t('Valid', 'Validated') : t('Ditolak', 'Rejected');

                            return (
                                <button
                                    key={tab}
                                    onClick={() => setStatusFilter(tab)}
                                    className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
                                        isActive 
                                            ? 'bg-background text-foreground shadow-sm' 
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {tabLabel} <span className="ml-1 text-neutral-400 font-normal">({count})</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder={t('Cari pesanan...', 'Search orders...')}
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Orders Table */}
                <div className="rounded-md border border-sidebar-border/70 bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length}
                                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                    />
                                </TableHead>
                                <TableHead>{t('ID Pesanan', 'Order ID')}</TableHead>
                                <TableHead>{t('Tanggal Pembuatan', 'Date Raised')}</TableHead>
                                <TableHead>{t('Nama Pelanggan', 'Customer Name')}</TableHead>
                                <TableHead>{t('Sales Rep', 'Sales Rep')}</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">{t('Total Nilai', 'Total Amount')}</TableHead>
                                <TableHead className="text-center w-[120px]">{t('Aksi', 'Actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                        {t('Tidak ada data pesanan ditemukan.', 'No orders found matching the filter criteria.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredOrders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedOrders.includes(order.id)}
                                                onCheckedChange={(checked) => handleSelectOrder(order.id, !!checked)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-semibold text-primary hover:underline">
                                            <Link href={`/orders/${order.id}/edit`}>
                                                {order.id}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{order.date_raised}</TableCell>
                                        <TableCell className="font-medium">{order.customer_name}</TableCell>
                                        <TableCell>{order.sales_rep}</TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                order.status === 'Validated' ? 'default' :
                                                order.status === 'Pending' ? 'secondary' : 'destructive'
                                            }>
                                                {t(order.status === 'Validated' ? 'Valid' : order.status === 'Pending' ? 'Tertunda' : 'Ditolak', order.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-slate-800 dark:text-zinc-200">
                                            {formatPrice(order.total_amount)}
                                        </TableCell>
                                        <TableCell className="text-center flex justify-center gap-1.5">
                                            <Button variant="ghost" size="icon" asChild className="size-8 text-neutral-600 hover:text-neutral-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                                                <Link href={`/orders/${order.id}/edit`}>
                                                    <Edit3 className="size-4" />
                                                </Link>
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="size-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                                onClick={() => handleDeleteOrder(order.id)}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t pt-4">
                    <span className="text-sm text-muted-foreground">
                        {t(`Menampilkan 1 sampai ${filteredOrders.length} dari ${orders.length} entri`, `Showing 1 to ${filteredOrders.length} of ${orders.length} entries`)}
                    </span>
                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" disabled>
                            <ChevronLeft className="size-4" />
                        </Button>
                        <Button variant="default" size="sm" className="px-3">1</Button>
                        <Button variant="outline" size="icon" disabled>
                            <ChevronRight className="size-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}

OrdersIndex.layout = {
    breadcrumbs: [
        {
            title: 'Order Entry',
            href: '/orders',
        },
    ],
};
