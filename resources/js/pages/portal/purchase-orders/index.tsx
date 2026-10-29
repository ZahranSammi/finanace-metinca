import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    Download,
    Eye,
    FileSpreadsheet,
    FileText,
    PackageCheck,
    Plus,
    Printer,
    Search,
    Send,
    ShoppingBag,
    Trash2,
    Wallet,
    XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useCurrency } from '@/components/currency-context';
import { useLanguage } from '@/components/language-context';
import type { BreadcrumbItem } from '@/types';

interface PoItemRow {
    id: number;
    product_id: number;
    product_code: string;
    product_name: string;
    unit: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
}

interface PurchaseOrderRow {
    id: number;
    po_number: string;
    supplier_id: number;
    supplier_name: string;
    plant_id: number;
    plant_name: string;
    branch_name: string;
    date: string;
    date_raw: string | null;
    expected_date: string;
    expected_date_raw: string | null;
    items_count: number;
    line_items_count: number;
    total_amount: number;
    status: 'Draft' | 'Submitted' | 'Approved' | 'Received' | 'Rejected' | string;
    payment_status: 'paid' | 'unpaid' | string;
    notes: string | null;
    rejection_notes: string | null;
    created_by_name: string;
    approved_by_name: string;
    approved_at: string | null;
    items: PoItemRow[];
}

interface SupplierOption {
    id: number;
    name: string;
}

interface PlantOption {
    id: number;
    name: string;
    branch_name: string;
}

interface ProductOption {
    id: number;
    code: string;
    name: string;
    unit: string;
    price: number;
    stock: number;
}

interface Props {
    purchase_orders: PurchaseOrderRow[];
    suppliers: SupplierOption[];
    plants: PlantOption[];
    products: ProductOption[];
}

export default function PurchaseOrdersIndex({
    purchase_orders = [],
    suppliers = [],
    plants = [],
    products = [],
}: Props) {
    const { formatPrice } = useCurrency();
    const { language } = useLanguage();
    const { props } = usePage<{
        auth: { user: { id: number; name: string; role: string } };
        flash?: { success?: string; error?: string };
    }>();

    const userRole = props.auth?.user?.role ?? 'staff_accounting';
    const isManager = userRole === 'manager';

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Purchase Order (PO)', href: '/purchase-orders' },
    ];

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [useNewSupplier, setUseNewSupplier] = useState(false);
    const [selectedPo, setSelectedPo] = useState<PurchaseOrderRow | null>(null);
    const [rejectingPo, setRejectingPo] = useState<PurchaseOrderRow | null>(null);
    const [rejectionNotes, setRejectionNotes] = useState('');

    const todayStr = new Date().toISOString().split('T')[0];
    const nextWeekStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const form = useForm<{
        supplier_id: string;
        new_supplier_name: string;
        plant_id: string;
        date: string;
        expected_date: string;
        status: 'Draft' | 'Submitted';
        notes: string;
        items: Array<{
            product_id: number;
            quantity: number;
            unit_price: number;
        }>;
    }>({
        supplier_id: suppliers[0] ? String(suppliers[0].id) : '',
        new_supplier_name: '',
        plant_id: plants[0] ? String(plants[0].id) : '',
        date: todayStr,
        expected_date: nextWeekStr,
        status: 'Submitted',
        notes: '',
        items: [
            {
                product_id: products[0]?.id ?? 1,
                quantity: 10,
                unit_price: products[0] ? Math.round(products[0].price * 0.7) : 150000,
            },
        ],
    });

    const formatCurrency = (val: number) => formatPrice(Number(val || 0));

    // Summary KPIs matching ADI's Procurement.tsx
    const kpis = useMemo(() => {
        const draft = purchase_orders.filter((p) => p.status === 'Draft').length;
        const submitted = purchase_orders.filter((p) => p.status === 'Submitted' || p.status === 'Pending').length;
        const approved = purchase_orders.filter((p) => p.status === 'Approved').length;
        const received = purchase_orders.filter((p) => p.status === 'Received').length;
        const totalValue = purchase_orders.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
        const unpaidPayables = purchase_orders
            .filter((p) => (p.status === 'Approved' || p.status === 'Received') && p.payment_status !== 'paid')
            .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

        return { draft, submitted, approved, received, totalValue, unpaidPayables };
    }, [purchase_orders]);

    const filteredPos = useMemo(() => {
        return purchase_orders.filter((po) => {
            const q = searchQuery.toLowerCase().trim();
            const matchesSearch =
                !q ||
                po.po_number.toLowerCase().includes(q) ||
                po.supplier_name.toLowerCase().includes(q) ||
                po.plant_name.toLowerCase().includes(q) ||
                po.created_by_name.toLowerCase().includes(q);
            const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [purchase_orders, searchQuery, statusFilter]);

    const handleAddItemRow = () => {
        const defaultProd = products[0];
        form.setData('items', [
            ...form.data.items,
            {
                product_id: defaultProd?.id ?? 1,
                quantity: 5,
                unit_price: defaultProd ? Math.round(defaultProd.price * 0.7) : 100000,
            },
        ]);
    };

    const handleRemoveItemRow = (idx: number) => {
        if (form.data.items.length <= 1) return;
        form.setData(
            'items',
            form.data.items.filter((_, i) => i !== idx),
        );
    };

    const handleItemChange = (idx: number, field: 'product_id' | 'quantity' | 'unit_price', value: number) => {
        const updated = [...form.data.items];
        if (field === 'product_id') {
            const prod = products.find((p) => p.id === value);
            updated[idx] = {
                ...updated[idx],
                product_id: value,
                unit_price: prod ? Math.round(prod.price * 0.7) : updated[idx].unit_price,
            };
        } else {
            updated[idx] = {
                ...updated[idx],
                [field]: value,
            };
        }
        form.setData('items', updated);
    };

    const formTotalAmount = useMemo(() => {
        return form.data.items.reduce(
            (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
            0,
        );
    }, [form.data.items]);

    const handleSubmitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/purchase-orders', {
            preserveScroll: true,
            onSuccess: () => {
                setIsCreateOpen(false);
                setUseNewSupplier(false);
            },
        });
    };

    const handleSubmitToManager = (po: PurchaseOrderRow) => {
        router.post(`/purchase-orders/${po.id}/submit`, {}, { preserveScroll: true });
    };

    const handleApprovePo = (po: PurchaseOrderRow) => {
        router.post(`/purchase-orders/${po.id}/approve`, {}, { preserveScroll: true });
    };

    const handleConfirmRejectPo = () => {
        if (!rejectingPo || !rejectionNotes.trim()) return;
        router.post(
            `/purchase-orders/${rejectingPo.id}/reject`,
            { notes: rejectionNotes },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setRejectingPo(null);
                    setRejectionNotes('');
                },
            },
        );
    };

    const handleReceivePo = (po: PurchaseOrderRow) => {
        router.post(`/purchase-orders/${po.id}/receive`, {}, { preserveScroll: true });
    };

    const handlePayPo = (po: PurchaseOrderRow) => {
        router.post(`/purchase-orders/${po.id}/pay`, {}, { preserveScroll: true });
    };

    const handleExportCsv = () => {
        const headers = [
            'PO Number',
            'Supplier',
            'Plant',
            'Created Date',
            'Expected Date',
            'Total Qty',
            'Total Value (IDR)',
            'Created By',
            'Approved By',
            'Status',
            'Payment Status',
        ];
        const rows = filteredPos.map((po) => [
            po.po_number,
            po.supplier_name,
            po.plant_name,
            po.date,
            po.expected_date,
            po.items_count,
            po.total_amount,
            po.created_by_name,
            po.approved_by_name,
            po.status,
            po.payment_status,
        ]);

        const csvContent =
            'data:text/csv;charset=utf-8,' +
            [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Purchase_Orders_Metinca_${todayStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'Draft':
                return (
                    <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-700">
                        Draft
                    </Badge>
                );
            case 'Submitted':
            case 'Pending':
                return (
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                        Submitted
                    </Badge>
                );
            case 'Approved':
                return (
                    <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                        Approved
                    </Badge>
                );
            case 'Received':
                return (
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                        Received
                    </Badge>
                );
            case 'Rejected':
                return (
                    <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                        Rejected
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <>
            <Head title="Purchase Order (PO) — Procurement" />

            <div className="flex h-full min-w-0 flex-1 flex-col gap-4 bg-slate-50/40 p-4 sm:gap-6 sm:p-6 dark:bg-transparent">
                {/* Flash Message */}
                {props.flash?.success && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-xs">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                        <span>{props.flash.success}</span>
                    </div>
                )}
                {props.flash?.error && (
                    <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 shadow-xs">
                        <XCircle className="size-4 shrink-0 text-rose-600" />
                        <span>{props.flash.error}</span>
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div className="min-w-0 flex-1">
                        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            <ShoppingBag className="size-7 shrink-0 text-indigo-600" />
                            {language === 'id'
                                ? 'Purchase Order (PO) & Pengadaan Supplier'
                                : 'Purchase Orders & Supplier Procurement'}
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            {language === 'id'
                                ? 'Kelola pengadaan bahan baku & barang industri PT. Metinca Prima Industrial Works beserta alur validasi Manager Accounting.'
                                : 'Manage raw material & industrial goods procurement and Manager Accounting approval workflow.'}
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handleExportCsv}
                            className="gap-1.5 border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100/70 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                        >
                            <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
                            Export CSV
                        </Button>
                        <Button
                            onClick={() => setIsCreateOpen(true)}
                            className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                            <Plus className="size-4" />
                            {language === 'id' ? 'Buat Purchase Order (Create PO)' : 'Create PO'}
                        </Button>
                    </div>
                </div>

                {/* 4 Status Cards (Matching ADI's Procurement.tsx) + Financial Summary */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 sm:gap-4">
                    <Card
                        onClick={() => setStatusFilter(statusFilter === 'Draft' ? 'ALL' : 'Draft')}
                        className={`cursor-pointer border-slate-200 shadow-xs transition hover:border-slate-400 ${
                            statusFilter === 'Draft' ? 'ring-2 ring-slate-500' : ''
                        }`}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">POs Draft</span>
                                <FileText className="size-4 text-slate-500" />
                            </div>
                            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{kpis.draft}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                                {language === 'id' ? 'Belum diajukan' : 'Not yet submitted'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card
                        onClick={() => setStatusFilter(statusFilter === 'Submitted' ? 'ALL' : 'Submitted')}
                        className={`cursor-pointer border-amber-200 bg-amber-50/40 shadow-xs transition hover:border-amber-400 dark:bg-amber-950/10 ${
                            statusFilter === 'Submitted' ? 'ring-2 ring-amber-500' : ''
                        }`}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-amber-800 dark:text-amber-300">POs Submitted</span>
                                <Clock className="size-4 text-amber-600" />
                            </div>
                            <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-400">{kpis.submitted}</p>
                            <p className="mt-0.5 text-[11px] text-amber-600/80">
                                {language === 'id' ? 'Menunggu validasi Manager' : 'Awaiting Manager approval'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card
                        onClick={() => setStatusFilter(statusFilter === 'Approved' ? 'ALL' : 'Approved')}
                        className={`cursor-pointer border-blue-200 bg-blue-50/40 shadow-xs transition hover:border-blue-400 dark:bg-blue-950/10 ${
                            statusFilter === 'Approved' ? 'ring-2 ring-blue-500' : ''
                        }`}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-blue-800 dark:text-blue-300">POs Approved</span>
                                <CheckCircle2 className="size-4 text-blue-600" />
                            </div>
                            <p className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-400">{kpis.approved}</p>
                            <p className="mt-0.5 text-[11px] text-blue-600/80">
                                {language === 'id' ? 'Disetujui Manager' : 'Approved by Manager'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card
                        onClick={() => setStatusFilter(statusFilter === 'Received' ? 'ALL' : 'Received')}
                        className={`cursor-pointer border-emerald-200 bg-emerald-50/40 shadow-xs transition hover:border-emerald-400 dark:bg-emerald-950/10 ${
                            statusFilter === 'Received' ? 'ring-2 ring-emerald-500' : ''
                        }`}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">POs Received</span>
                                <PackageCheck className="size-4 text-emerald-600" />
                            </div>
                            <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400">{kpis.received}</p>
                            <p className="mt-0.5 text-[11px] text-emerald-600/80">
                                {language === 'id' ? 'Barang masuk gudang' : 'Goods received in stock'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">
                                    {language === 'id' ? 'Total Nilai PO' : 'Total PO Value'}
                                </span>
                                <ShoppingBag className="size-4 text-indigo-600" />
                            </div>
                            <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                                {formatCurrency(kpis.totalValue)}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                                {purchase_orders.length} {language === 'id' ? 'dokumen PO' : 'PO documents'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-rose-200 bg-rose-50/30 shadow-xs dark:bg-rose-950/10">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-rose-800 dark:text-rose-300">
                                    {language === 'id' ? 'Utang Usaha PO (Neraca)' : 'Accounts Payable (PO)'}
                                </span>
                                <Wallet className="size-4 text-rose-600" />
                            </div>
                            <p className="mt-2 text-lg font-bold text-rose-700 dark:text-rose-400">
                                {formatCurrency(kpis.unpaidPayables)}
                            </p>
                            <p className="mt-0.5 text-[11px] text-rose-600/80">
                                {language === 'id' ? 'Approved/Received belum lunas' : 'Unpaid Approved/Received'}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter Bar + Table (Matching ADI's Procurement.tsx) */}
                <Card className="border-slate-200 shadow-xs">
                    <CardHeader className="border-b border-slate-100 pb-4 dark:border-slate-800">
                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                            <div>
                                <CardTitle className="text-base">
                                    {language === 'id' ? 'Daftar Purchase Order (PO)' : 'Purchase Orders List'}
                                </CardTitle>
                                <CardDescription>
                                    {language === 'id'
                                        ? 'Klik baris atau tombol View untuk mencetak dokumen Purchase Order resmi.'
                                        : 'Click View to inspect or print the official Purchase Order document.'}
                                </CardDescription>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative w-full sm:w-72">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={
                                            language === 'id'
                                                ? 'Cari nomor PO atau supplier...'
                                                : 'Search by PO number or supplier...'
                                        }
                                        className="pl-9"
                                    />
                                </div>

                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-full sm:w-[160px]">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Status</SelectItem>
                                        <SelectItem value="Draft">Draft</SelectItem>
                                        <SelectItem value="Submitted">Submitted</SelectItem>
                                        <SelectItem value="Approved">Approved</SelectItem>
                                        <SelectItem value="Received">Received</SelectItem>
                                        <SelectItem value="Rejected">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <Table className="min-w-[1000px]">
                            <TableHeader className="bg-slate-50/80 dark:bg-slate-900/40">
                                <TableRow>
                                    <TableHead>PO Number</TableHead>
                                    <TableHead>Supplier</TableHead>
                                    <TableHead>Plant / Cabang</TableHead>
                                    <TableHead>Created Date</TableHead>
                                    <TableHead>Expected</TableHead>
                                    <TableHead className="text-center">Items</TableHead>
                                    <TableHead className="text-right">Total Value</TableHead>
                                    <TableHead>Created By</TableHead>
                                    <TableHead>Approved By</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Pembayaran</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPos.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={12} className="h-32 text-center text-slate-500">
                                            {language === 'id'
                                                ? 'Tidak ada Purchase Order yang sesuai dengan filter.'
                                                : 'No Purchase Orders match the current filter.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredPos.map((po) => (
                                        <TableRow
                                            key={po.id}
                                            className="hover:bg-slate-50/80 dark:hover:bg-slate-900/30"
                                        >
                                            <TableCell className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                {po.po_number}
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-900 dark:text-white">
                                                {po.supplier_name}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                                                <div>{po.plant_name}</div>
                                                <div className="text-[10px] text-slate-400">{po.branch_name}</div>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                                                {po.date}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                                                {po.expected_date}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary" className="font-mono text-xs">
                                                    {po.items_count}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-slate-900 dark:text-white">
                                                {formatCurrency(po.total_amount)}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                                                {po.created_by_name}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                                                {po.approved_by_name}
                                            </TableCell>
                                            <TableCell>{renderStatusBadge(po.status)}</TableCell>
                                            <TableCell>
                                                {po.payment_status === 'paid' ? (
                                                    <Badge className="bg-emerald-600 text-[10px] text-white hover:bg-emerald-700">
                                                        Lunas
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="outline"
                                                        className="border-amber-300 bg-amber-50 text-[10px] text-amber-800"
                                                    >
                                                        Belum Lunas
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setSelectedPo(po)}
                                                        className="h-7 gap-1 px-2 text-xs"
                                                    >
                                                        <Eye className="size-3.5" />
                                                        View
                                                    </Button>

                                                    {/* Submit button for Draft / Rejected */}
                                                    {(po.status === 'Draft' || po.status === 'Rejected') && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleSubmitToManager(po)}
                                                            className="h-7 gap-1 bg-amber-600 px-2 text-xs text-white hover:bg-amber-700"
                                                        >
                                                            <Send className="size-3" />
                                                            Submit
                                                        </Button>
                                                    )}

                                                    {/* Manager Approve / Reject buttons for Submitted */}
                                                    {isManager &&
                                                        (po.status === 'Submitted' || po.status === 'Pending') && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleApprovePo(po)}
                                                                    className="h-7 gap-1 bg-emerald-600 px-2.5 text-xs text-white hover:bg-emerald-700"
                                                                >
                                                                    <CheckCircle2 className="size-3" />
                                                                    Approve
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        setRejectingPo(po);
                                                                        setRejectionNotes('');
                                                                    }}
                                                                    className="h-7 border-rose-200 px-2 text-xs text-rose-600 hover:bg-rose-50"
                                                                >
                                                                    Reject
                                                                </Button>
                                                            </>
                                                        )}

                                                    {/* Receive button for Approved POs */}
                                                    {po.status === 'Approved' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleReceivePo(po)}
                                                            className="h-7 gap-1 bg-blue-600 px-2 text-xs text-white hover:bg-blue-700"
                                                        >
                                                            <PackageCheck className="size-3" />
                                                            Receive
                                                        </Button>
                                                    )}

                                                    {/* Mark Paid button for Approved / Received unpaid POs */}
                                                    {(po.status === 'Approved' || po.status === 'Received') &&
                                                        po.payment_status !== 'paid' &&
                                                        (userRole === 'staff_accounting' || isManager) && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handlePayPo(po)}
                                                                className="h-7 border-emerald-300 bg-emerald-50 px-2 text-xs text-emerald-700 hover:bg-emerald-100"
                                                            >
                                                                <Wallet className="size-3" />
                                                                Bayar
                                                            </Button>
                                                        )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Create PO Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>
                            {language === 'id' ? 'Buat Purchase Order Baru (Create PO)' : 'Create New Purchase Order'}
                        </DialogTitle>
                        <DialogDescription>
                            {language === 'id'
                                ? 'Pilih supplier, plant tujuan, dan daftar barang yang dipesan. PO berstatus Submitted akan langsung mengirim notifikasi ke Manager Accounting.'
                                : 'Select supplier, destination plant, and ordered items.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmitCreate} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label>Supplier</Label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setUseNewSupplier(!useNewSupplier);
                                            if (!useNewSupplier) {
                                                form.setData('supplier_id', '');
                                            } else {
                                                form.setData('new_supplier_name', '');
                                                form.setData('supplier_id', suppliers[0] ? String(suppliers[0].id) : '');
                                            }
                                        }}
                                        className="text-xs font-medium text-indigo-600 hover:underline"
                                    >
                                        {useNewSupplier ? 'Pilih dari daftar supplier' : '+ Input supplier baru'}
                                    </button>
                                </div>
                                {useNewSupplier ? (
                                    <Input
                                        value={form.data.new_supplier_name}
                                        onChange={(e) => form.setData('new_supplier_name', e.target.value)}
                                        placeholder="Contoh: PT Krakatau Steel Tbk"
                                        required
                                    />
                                ) : (
                                    <Select
                                        value={form.data.supplier_id}
                                        onValueChange={(v) => form.setData('supplier_id', v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih Supplier" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {suppliers.map((s) => (
                                                <SelectItem key={s.id} value={String(s.id)}>
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label>Plant / Lokasi Penerimaan</Label>
                                <Select
                                    value={form.data.plant_id}
                                    onValueChange={(v) => form.setData('plant_id', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih Plant" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {plants.map((p) => (
                                            <SelectItem key={p.id} value={String(p.id)}>
                                                {p.name} ({p.branch_name})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Created Date</Label>
                                <Input
                                    type="date"
                                    value={form.data.date}
                                    onChange={(e) => form.setData('date', e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label>Expected Delivery Date</Label>
                                <Input
                                    type="date"
                                    value={form.data.expected_date}
                                    onChange={(e) => form.setData('expected_date', e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label>Status Pengajuan</Label>
                                <Select
                                    value={form.data.status}
                                    onValueChange={(v: 'Draft' | 'Submitted') => form.setData('status', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Submitted">
                                            Submitted (Langsung kirim ke Manager Accounting)
                                        </SelectItem>
                                        <SelectItem value="Draft">Draft (Simpan sementara)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Catatan Pengadaan (Opsional)</Label>
                                <Input
                                    value={form.data.notes}
                                    onChange={(e) => form.setData('notes', e.target.value)}
                                    placeholder="Spesifikasi material / jadwal pengiriman..."
                                />
                            </div>
                        </div>

                        {/* Line Items */}
                        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold">Rincian Barang / Material PO</Label>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={handleAddItemRow}
                                    className="h-7 gap-1 text-xs"
                                >
                                    <Plus className="size-3.5" />
                                    Tambah Baris Barang
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {form.data.items.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="grid grid-cols-12 items-end gap-2 rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900"
                                    >
                                        <div className="col-span-12 sm:col-span-5">
                                            <Label className="text-[11px] text-slate-500">Produk / Material</Label>
                                            <Select
                                                value={String(item.product_id)}
                                                onValueChange={(v) => handleItemChange(idx, 'product_id', Number(v))}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {products.map((prod) => (
                                                        <SelectItem key={prod.id} value={String(prod.id)}>
                                                            [{prod.code}] {prod.name} (Stok: {prod.stock} {prod.unit})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="col-span-4 sm:col-span-2">
                                            <Label className="text-[11px] text-slate-500">Qty</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={item.quantity}
                                                onChange={(e) =>
                                                    handleItemChange(idx, 'quantity', Math.max(1, Number(e.target.value)))
                                                }
                                                className="h-8 text-xs"
                                            />
                                        </div>

                                        <div className="col-span-6 sm:col-span-3">
                                            <Label className="text-[11px] text-slate-500">Harga Beli Satuan (Rp)</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={item.unit_price}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        idx,
                                                        'unit_price',
                                                        Math.max(0, Number(e.target.value)),
                                                    )
                                                }
                                                className="h-8 text-xs"
                                            />
                                        </div>

                                        <div className="col-span-2 flex items-center justify-end gap-1 sm:col-span-2">
                                            <div className="text-right text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                {formatCurrency(item.quantity * item.unit_price)}
                                            </div>
                                            {form.data.items.length > 1 && (
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleRemoveItemRow(idx)}
                                                    className="size-7 text-rose-500 hover:bg-rose-50"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                                <span className="text-xs font-medium text-slate-500">Total Nilai Purchase Order</span>
                                <span className="text-lg font-bold text-indigo-600">
                                    {formatCurrency(formTotalAmount)}
                                </span>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={form.processing}
                                className="bg-indigo-600 text-white hover:bg-indigo-700"
                            >
                                Simpan Purchase Order
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Detail & Print PO Modal */}
            <Dialog open={!!selectedPo} onOpenChange={(open) => !open && setSelectedPo(null)}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                    {selectedPo && (
                        <div className="space-y-5">
                            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                                <div className="flex items-center gap-3">
                                    <img
                                        src="/Logo-metinca.webp"
                                        alt="PT. Metinca Prima Industrial Works"
                                        className="h-12 w-auto object-contain"
                                    />
                                    <div>
                                        <p className="text-[11px] font-bold tracking-widest text-indigo-600 uppercase">
                                            PT. Metinca Prima Industrial Works
                                        </p>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                            PURCHASE ORDER — {selectedPo.po_number}
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            Plant Tujuan: {selectedPo.plant_name} ({selectedPo.branch_name})
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {renderStatusBadge(selectedPo.status)}
                                    <p className="mt-1 text-xs text-slate-500">Tanggal PO: {selectedPo.date}</p>
                                    <p className="text-xs text-slate-500">Expected: {selectedPo.expected_date}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-900/40">
                                <div>
                                    <span className="text-slate-400">Vendor / Supplier</span>
                                    <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                                        {selectedPo.supplier_name}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-slate-400">Dibuat Oleh (Created By)</span>
                                    <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                                        {selectedPo.created_by_name}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-slate-400">Disetujui Oleh (Approved By)</span>
                                    <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                                        {selectedPo.approved_by_name}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-slate-400">Status Pembayaran</span>
                                    <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                                        {selectedPo.payment_status === 'paid' ? 'LUNAS (Paid)' : 'BELUM LUNAS (Unpaid)'}
                                    </p>
                                </div>
                            </div>

                            {selectedPo.notes && (
                                <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">Catatan PO: </span>
                                    {selectedPo.notes}
                                </div>
                            )}

                            {selectedPo.rejection_notes && (
                                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                                    <span className="font-semibold">Alasan Penolakan Manager: </span>
                                    {selectedPo.rejection_notes}
                                </div>
                            )}

                            <div className="rounded-xl border border-slate-200">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead>Kode</TableHead>
                                            <TableHead>Nama Barang / Material</TableHead>
                                            <TableHead className="text-center">Qty</TableHead>
                                            <TableHead className="text-right">Harga Satuan</TableHead>
                                            <TableHead className="text-right">Subtotal</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedPo.items.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-mono text-xs">{item.product_code}</TableCell>
                                                <TableCell className="font-medium">{item.product_name}</TableCell>
                                                <TableCell className="text-center">
                                                    {item.quantity} {item.unit}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(item.unit_price)}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold">
                                                    {formatCurrency(item.subtotal)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow className="bg-slate-50 font-bold">
                                            <TableCell colSpan={4} className="text-right">
                                                TOTAL PURCHASE ORDER
                                            </TableCell>
                                            <TableCell className="text-right text-indigo-700">
                                                {formatCurrency(selectedPo.total_amount)}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>

                            <DialogFooter className="flex flex-wrap items-center justify-between gap-2">
                                <Button variant="outline" onClick={() => window.print()} className="gap-1.5">
                                    <Printer className="size-4" />
                                    Cetak Dokumen PO
                                </Button>
                                <div className="flex items-center gap-2">
                                    {isManager &&
                                        (selectedPo.status === 'Submitted' || selectedPo.status === 'Pending') && (
                                            <Button
                                                onClick={() => {
                                                    handleApprovePo(selectedPo);
                                                    setSelectedPo(null);
                                                }}
                                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                                            >
                                                <CheckCircle2 className="mr-1.5 size-4" />
                                                Approve PO Ini
                                            </Button>
                                        )}
                                    <Button variant="outline" onClick={() => setSelectedPo(null)}>
                                        Tutup
                                    </Button>
                                </div>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Reject PO Modal */}
            <Dialog open={!!rejectingPo} onOpenChange={(open) => !open && setRejectingPo(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Tolak Purchase Order ({rejectingPo?.po_number})</DialogTitle>
                        <DialogDescription>
                            Masukkan alasan penolakan atau catatan revisi. Notifikasi akan dikirimkan kepada pembuat PO.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label>Catatan Penolakan / Revisi</Label>
                        <Input
                            value={rejectionNotes}
                            onChange={(e) => setRejectionNotes(e.target.value)}
                            placeholder="Contoh: Harga satuan melebihi plafon anggaran kuartal ini..."
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectingPo(null)}>
                            Batal
                        </Button>
                        <Button
                            onClick={handleConfirmRejectPo}
                            disabled={!rejectionNotes.trim()}
                            className="bg-rose-600 text-white hover:bg-rose-700"
                        >
                            Konfirmasi Tolak PO
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

PurchaseOrdersIndex.layout = {
    breadcrumbs: [
        {
            title: 'Purchase Order (PO)',
            href: '/purchase-orders',
        },
    ],
};
