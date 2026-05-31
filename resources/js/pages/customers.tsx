import { Head } from '@inertiajs/react';
import { Search, Mail, ShoppingBag } from 'lucide-react';
import * as React from 'react';
import { useCurrency } from '@/components/currency-context';
import { useLanguage } from '@/components/language-context';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Customer {
    id: number;
    name: string;
    email: string;
    orders_count: number;
    total_spent: number;
}

interface CustomersProps {
    customers: Customer[];
}

export default function Customers({ customers }: CustomersProps) {
    const { formatPrice } = useCurrency();
    const { t } = useLanguage();
    const [searchQuery, setSearchQuery] = React.useState('');

    const filteredCustomers = React.useMemo(() => {
        return customers.filter((c) => {
            return c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                   c.email.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [customers, searchQuery]);

    return (
        <>
            <Head title={t('Daftar Pelanggan', 'Customers')} />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{t('Direktori Pelanggan', 'Customer Directory')}</h1>
                        <p className="text-muted-foreground text-sm">{t('Lihat riwayat pembelian dan akumulasi nilai lifetime spent pelanggan.', 'View purchase histories and lifetime values for all clients.')}</p>
                    </div>
                </div>

                {/* Search Customer */}
                <div className="flex justify-end border-b pb-4">
                    <div className="relative w-full max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder={t('Cari pelanggan...', 'Search customers...')}
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Customers Table */}
                <div className="rounded-md border border-sidebar-border/70 bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Nama', 'Name')}</TableHead>
                                <TableHead>{t('Kontak Email', 'Email Contact')}</TableHead>
                                <TableHead className="text-right">{t('Jumlah Pesanan', 'Orders Count')}</TableHead>
                                <TableHead className="text-right">{t('Total Nilai Pelanggan', 'Total Customer Value')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCustomers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        {t('Tidak ada data pelanggan ditemukan.', 'No customers found.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCustomers.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-semibold">{c.name}</TableCell>
                                        <TableCell>
                                            <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
                                                <Mail className="size-3.5" /> {c.email}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="inline-flex items-center gap-1 font-medium">
                                                <ShoppingBag className="size-3.5 text-muted-foreground" /> {c.orders_count}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-green-600 dark:text-green-400">
                                            {formatPrice(c.total_spent)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </>
    );
}

Customers.layout = {
    breadcrumbs: [
        {
            title: 'Customers',
            href: '/customers',
        },
    ],
};
