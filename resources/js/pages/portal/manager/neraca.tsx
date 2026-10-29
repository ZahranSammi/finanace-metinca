import { Head, router, usePage } from '@inertiajs/react';
import {
    Activity,
    Building2,
    CheckCircle2,
    Download,
    FileSpreadsheet,
    Landmark,
    Package,
    Printer,
    Scale,
    Send,
    ShieldCheck,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

interface AccountLine {
    code: string;
    name_id: string;
    name_en: string;
    description_id: string;
    description_en: string;
    amount: number;
}

interface NeracaData {
    aktiva: {
        lancar: AccountLine[];
        total_lancar: number;
        tetap: AccountLine[];
        total_tetap: number;
        total_aktiva: number;
    };
    pasiva: {
        liabilitas_lancar: AccountLine[];
        total_liabilitas: number;
        ekuitas: AccountLine[];
        total_ekuitas: number;
        total_pasiva: number;
    };
    is_balanced: boolean;
    ratios: {
        current_ratio: number;
        quick_ratio: number;
        debt_to_asset_percent: number;
    };
}

interface ReceivableDrilldown {
    invoice_number: string;
    order_id: number;
    customer_name: string;
    date: string;
    amount: number;
}

interface PayableDrilldown {
    po_number: string;
    supplier_name: string;
    plant_name: string;
    date: string;
    status: string;
    amount: number;
}

interface InventoryDrilldown {
    code: string;
    name: string;
    category: string;
    stock: number;
    unit: string;
    price: number;
    total_value: number;
}

interface NeracaSubmission {
    id: number;
    period_start: string;
    period_end: string;
    status: string;
    validation_notes: string | null;
    created_by_name: string;
    validated_by_name: string | null;
    created_at: string;
    validated_at: string | null;
}

interface Props {
    period: string;
    period_label: string;
    cutoff_date: string;
    neraca: NeracaData;
    drilldown: {
        receivables: ReceivableDrilldown[];
        payables: PayableDrilldown[];
        inventory: InventoryDrilldown[];
    };
    neraca_submissions: NeracaSubmission[];
}

export default function ManagerNeraca({
    period,
    period_label,
    cutoff_date,
    neraca,
    drilldown,
    neraca_submissions = [],
}: Props) {
    const { formatPrice } = useCurrency();
    const { language } = useLanguage();
    const { props } = usePage<{
        auth: { user: { id: number; name: string; role: string } };
        flash?: { success?: string; error?: string };
    }>();

    const userRole = props.auth?.user?.role ?? 'manager';
    const isManager = userRole === 'manager';

    const [selectedPeriod, setSelectedPeriod] = useState(period);
    const [activeDrilldownTab, setActiveDrilldownTab] = useState<
        'receivables' | 'payables' | 'inventory' | 'submissions'
    >('receivables');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Laporan Neraca (Balance Sheet)', href: '/manager/neraca' },
    ];

    const formatCurrency = (val: number) => formatPrice(Number(val || 0));

    const handlePeriodChange = (newPeriod: string) => {
        setSelectedPeriod(newPeriod);
        router.get('/manager/neraca', { period: newPeriod }, { preserveState: true, preserveScroll: true });
    };

    const handleSubmitNeracaToManager = () => {
        router.post('/manager/neraca/submit', { period: selectedPeriod }, { preserveScroll: true });
    };

    const handleValidateNeracaSubmission = (submissionId: number) => {
        router.post(
            `/manager/neraca/${submissionId}/validate`,
            { notes: 'Laporan Neraca telah diperiksa dan disahkan oleh Manager Accounting.' },
            { preserveScroll: true },
        );
    };

    const handleExportCsv = () => {
        const rows: Array<[string, string, string, number]> = [];
        rows.push(['AKTIVA LANCAR', '', '', 0]);
        neraca.aktiva.lancar.forEach((acc) => {
            rows.push(['Aktiva Lancar', acc.code, acc.name_id, acc.amount]);
        });
        rows.push(['Total Aktiva Lancar', '', '', neraca.aktiva.total_lancar]);

        rows.push(['AKTIVA TETAP', '', '', 0]);
        neraca.aktiva.tetap.forEach((acc) => {
            rows.push(['Aktiva Tetap', acc.code, acc.name_id, acc.amount]);
        });
        rows.push(['Total Aktiva Tetap', '', '', neraca.aktiva.total_tetap]);
        rows.push(['TOTAL AKTIVA', '', '', neraca.aktiva.total_aktiva]);

        rows.push(['LIABILITAS LANCAR', '', '', 0]);
        neraca.pasiva.liabilitas_lancar.forEach((acc) => {
            rows.push(['Liabilitas Lancar', acc.code, acc.name_id, acc.amount]);
        });
        rows.push(['Total Liabilitas', '', '', neraca.pasiva.total_liabilitas]);

        rows.push(['EKUITAS', '', '', 0]);
        neraca.pasiva.ekuitas.forEach((acc) => {
            rows.push(['Ekuitas', acc.code, acc.name_id, acc.amount]);
        });
        rows.push(['Total Ekuitas', '', '', neraca.pasiva.total_ekuitas]);
        rows.push(['TOTAL PASIVA (LIABILITAS + EKUITAS)', '', '', neraca.pasiva.total_pasiva]);

        const csvContent =
            'data:text/csv;charset=utf-8,' +
            [
                'Kategori,Kode Akun,Nama Akun,Nilai (IDR)',
                ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
            ].join('\n');

        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', `Laporan_Neraca_Metinca_${selectedPeriod}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const pendingSubmission = neraca_submissions.find((s) => s.status === 'submitted');

    return (
        <>
            <Head title="Laporan Neraca (Balance Sheet)" />

            <div className="flex h-full min-w-0 flex-1 flex-col gap-4 bg-slate-50/40 p-4 sm:gap-6 sm:p-6 dark:bg-transparent">
                {props.flash?.success && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-xs print:hidden">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                        <span>{props.flash.success}</span>
                    </div>
                )}

                {/* Print Header (Only visible when printing) */}
                <div className="hidden border-b-2 border-slate-900 pb-4 print:block">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold uppercase">PT. Metinca Prima Industrial Works</h2>
                            <p className="text-sm font-semibold text-slate-700">
                                LAPORAN POSISI KEUANGAN (NERACA / BALANCE SHEET)
                            </p>
                            <p className="text-xs text-slate-500">
                                Per Tanggal Cut-off: {cutoff_date} (Periode {period_label})
                            </p>
                        </div>
                        <div className="text-right text-xs text-slate-600">
                            <p>Status: {neraca.is_balanced ? 'SEIMBANG (BALANCED)' : 'PERLU REKONSILIASI'}</p>
                            <p>Dicetak oleh: {props.auth?.user?.name}</p>
                        </div>
                    </div>
                </div>

                {/* Page Header & Controls */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center print:hidden">
                    <div>
                        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            <Scale className="size-7 text-indigo-600" />
                            {language === 'id'
                                ? 'Laporan Posisi Keuangan (Neraca)'
                                : 'Statement of Financial Position (Balance Sheet)'}
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            {language === 'id'
                                ? `Posisi Aktiva (Aset) vs Pasiva (Liabilitas & Ekuitas) per ${cutoff_date} yang dihitung otomatis dari Kas, Piutang Invoice, Persediaan Gudang, dan Utang Purchase Order.`
                                : `Assets vs Liabilities & Equity position as of ${cutoff_date}.`}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 dark:border-slate-800 dark:bg-slate-900">
                            <span className="text-xs font-medium text-slate-500">Periode:</span>
                            <Input
                                type="month"
                                value={selectedPeriod}
                                onChange={(e) => handlePeriodChange(e.target.value)}
                                className="h-7 w-36 border-0 p-0 text-xs shadow-none focus-visible:ring-0"
                            />
                        </div>

                        <Button variant="outline" onClick={handleExportCsv} className="gap-1.5">
                            <Download className="size-4" />
                            Export CSV
                        </Button>

                        <Button variant="outline" onClick={() => window.print()} className="gap-1.5">
                            <Printer className="size-4" />
                            Cetak PDF
                        </Button>

                        {userRole === 'staff_accounting' && (
                            <Button
                                onClick={handleSubmitNeracaToManager}
                                className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700"
                            >
                                <Send className="size-4" />
                                Kirim Neraca ke Manager
                            </Button>
                        )}

                        {isManager && pendingSubmission && (
                            <Button
                                onClick={() => handleValidateNeracaSubmission(pendingSubmission.id)}
                                className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                <ShieldCheck className="size-4" />
                                Sahkan Neraca ({pendingSubmission.period_end})
                            </Button>
                        )}
                    </div>
                </div>

                {/* Balance Check Banner & Ratios */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
                    <Card
                        className={`border shadow-xs ${
                            neraca.is_balanced
                                ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                                : 'border-rose-200 bg-rose-50/60'
                        }`}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase dark:text-emerald-300">
                                    Status Keseimbangan
                                </span>
                                <Scale className="size-4 text-emerald-600" />
                            </div>
                            <p className="mt-2 flex items-center gap-1.5 text-lg font-extrabold text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="size-5 shrink-0" />
                                {neraca.is_balanced ? 'NERACA SEIMBANG (BALANCED)' : 'TIDAK SEIMBANG'}
                            </p>
                            <p className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                                Total Aktiva = Total Pasiva ({formatCurrency(neraca.aktiva.total_aktiva)})
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">
                                    Current Ratio (Rasio Lancar)
                                </span>
                                <TrendingUp className="size-4 text-indigo-600" />
                            </div>
                            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                                {neraca.ratios.current_ratio}x
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                                Aktiva Lancar / Liabilitas Lancar
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">
                                    Quick Ratio (Kas + Piutang)
                                </span>
                                <Activity className="size-4 text-blue-600" />
                            </div>
                            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                                {neraca.ratios.quick_ratio}x
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                                Likuiditas cepat tanpa persediaan
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">
                                    Debt to Asset Ratio (DAR)
                                </span>
                                <Landmark className="size-4 text-amber-600" />
                            </div>
                            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                                {neraca.ratios.debt_to_asset_percent}%
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                                Porsi aset yang dibiayai liabilitas
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Two-Column Skontro Balance Sheet (AKTIVA on Left, PASIVA on Right) */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    {/* LEFT COLUMN: AKTIVA (ASSETS) */}
                    <Card className="flex flex-col justify-between border-slate-200 shadow-xs">
                        <div>
                            <CardHeader className="border-b border-slate-100 bg-indigo-50/50 pb-3 dark:border-slate-800 dark:bg-indigo-950/20">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2 text-base font-bold text-indigo-950 dark:text-indigo-200">
                                            <Wallet className="size-4 text-indigo-600" />
                                            AKTIVA (ASSETS)
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Posisi Harta & Aset Perusahaan per {cutoff_date}
                                        </CardDescription>
                                    </div>
                                    <Badge className="bg-indigo-600 text-white">DEBIT</Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-6 p-5">
                                {/* Aset Lancar */}
                                <div>
                                    <h3 className="mb-2.5 flex items-center justify-between border-b border-slate-200 pb-1.5 text-xs font-bold tracking-wider text-slate-700 uppercase dark:border-slate-800 dark:text-slate-300">
                                        <span>I. Aktiva Lancar (Current Assets)</span>
                                        <span>Nilai (IDR)</span>
                                    </h3>
                                    <div className="space-y-3">
                                        {neraca.aktiva.lancar.map((acc) => (
                                            <div
                                                key={acc.code}
                                                className="flex items-start justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40"
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                                            {acc.code}
                                                        </span>
                                                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                                            {language === 'id' ? acc.name_id : acc.name_en}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-[11px] text-slate-500">
                                                        {language === 'id' ? acc.description_id : acc.description_en}
                                                    </p>
                                                </div>
                                                <span className="shrink-0 font-mono text-sm font-bold text-slate-900 dark:text-white">
                                                    {formatCurrency(acc.amount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                                        <span>Total Aktiva Lancar</span>
                                        <span className="font-mono">{formatCurrency(neraca.aktiva.total_lancar)}</span>
                                    </div>
                                </div>

                                {/* Aset Tetap */}
                                <div>
                                    <h3 className="mb-2.5 flex items-center justify-between border-b border-slate-200 pb-1.5 text-xs font-bold tracking-wider text-slate-700 uppercase dark:border-slate-800 dark:text-slate-300">
                                        <span>II. Aktiva Tetap (Fixed Assets)</span>
                                        <span>Nilai (IDR)</span>
                                    </h3>
                                    <div className="space-y-3">
                                        {neraca.aktiva.tetap.map((acc) => (
                                            <div
                                                key={acc.code}
                                                className="flex items-start justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40"
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                                            {acc.code}
                                                        </span>
                                                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                                            {language === 'id' ? acc.name_id : acc.name_en}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-[11px] text-slate-500">
                                                        {language === 'id' ? acc.description_id : acc.description_en}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`shrink-0 font-mono text-sm font-bold ${
                                                        acc.amount < 0
                                                            ? 'text-rose-600'
                                                            : 'text-slate-900 dark:text-white'
                                                    }`}
                                                >
                                                    {formatCurrency(acc.amount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                                        <span>Total Aktiva Tetap (Bersih)</span>
                                        <span className="font-mono">{formatCurrency(neraca.aktiva.total_tetap)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </div>

                        <div className="border-t-2 border-indigo-600 bg-indigo-950 px-5 py-4 text-white">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold tracking-wider uppercase">TOTAL AKTIVA (ASSETS)</span>
                                <span className="font-mono text-lg font-extrabold text-emerald-300">
                                    {formatCurrency(neraca.aktiva.total_aktiva)}
                                </span>
                            </div>
                        </div>
                    </Card>

                    {/* RIGHT COLUMN: PASIVA (LIABILITIES & EQUITY) */}
                    <Card className="flex flex-col justify-between border-slate-200 shadow-xs">
                        <div>
                            <CardHeader className="border-b border-slate-100 bg-emerald-50/50 pb-3 dark:border-slate-800 dark:bg-emerald-950/20">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2 text-base font-bold text-emerald-950 dark:text-emerald-200">
                                            <Building2 className="size-4 text-emerald-600" />
                                            PASIVA (LIABILITAS & EKUITAS)
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Posisi Kewajiban & Modal Perusahaan per {cutoff_date}
                                        </CardDescription>
                                    </div>
                                    <Badge className="bg-emerald-600 text-white">KREDIT</Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-6 p-5">
                                {/* Liabilitas Lancar */}
                                <div>
                                    <h3 className="mb-2.5 flex items-center justify-between border-b border-slate-200 pb-1.5 text-xs font-bold tracking-wider text-slate-700 uppercase dark:border-slate-800 dark:text-slate-300">
                                        <span>I. Liabilitas Jangka Pendek (Current Liabilities)</span>
                                        <span>Nilai (IDR)</span>
                                    </h3>
                                    <div className="space-y-3">
                                        {neraca.pasiva.liabilitas_lancar.map((acc) => (
                                            <div
                                                key={acc.code}
                                                className="flex items-start justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40"
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                            {acc.code}
                                                        </span>
                                                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                                            {language === 'id' ? acc.name_id : acc.name_en}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-[11px] text-slate-500">
                                                        {language === 'id' ? acc.description_id : acc.description_en}
                                                    </p>
                                                </div>
                                                <span className="shrink-0 font-mono text-sm font-bold text-slate-900 dark:text-white">
                                                    {formatCurrency(acc.amount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                                        <span>Total Liabilitas (Kewajiban)</span>
                                        <span className="font-mono">
                                            {formatCurrency(neraca.pasiva.total_liabilitas)}
                                        </span>
                                    </div>
                                </div>

                                {/* Ekuitas */}
                                <div>
                                    <h3 className="mb-2.5 flex items-center justify-between border-b border-slate-200 pb-1.5 text-xs font-bold tracking-wider text-slate-700 uppercase dark:border-slate-800 dark:text-slate-300">
                                        <span>II. Ekuitas / Modal (Shareholders&apos; Equity)</span>
                                        <span>Nilai (IDR)</span>
                                    </h3>
                                    <div className="space-y-3">
                                        {neraca.pasiva.ekuitas.map((acc) => (
                                            <div
                                                key={acc.code}
                                                className="flex items-start justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40"
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                            {acc.code}
                                                        </span>
                                                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                                            {language === 'id' ? acc.name_id : acc.name_en}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-[11px] text-slate-500">
                                                        {language === 'id' ? acc.description_id : acc.description_en}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`shrink-0 font-mono text-sm font-bold ${
                                                        acc.amount < 0
                                                            ? 'text-rose-600'
                                                            : 'text-slate-900 dark:text-white'
                                                    }`}
                                                >
                                                    {formatCurrency(acc.amount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                                        <span>Total Ekuitas (Modal Bersih)</span>
                                        <span className="font-mono">{formatCurrency(neraca.pasiva.total_ekuitas)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </div>

                        <div className="border-t-2 border-emerald-600 bg-slate-900 px-5 py-4 text-white">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold tracking-wider uppercase">
                                    TOTAL PASIVA (LIABILITAS + EKUITAS)
                                </span>
                                <span className="font-mono text-lg font-extrabold text-emerald-300">
                                    {formatCurrency(neraca.pasiva.total_pasiva)}
                                </span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Drill-down Breakdown Tabs */}
                <Card className="border-slate-200 shadow-xs print:hidden">
                    <CardHeader className="border-b border-slate-100 pb-3 dark:border-slate-800">
                        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                            <div>
                                <CardTitle className="text-base">
                                    Rincian Komponen Pembentuk Neraca (Drill-Down Audit)
                                </CardTitle>
                                <CardDescription>
                                    Telusuri transaksi faktur piutang customer, utang Purchase Order supplier, valuasi stok gudang, dan riwayat pengesahan Neraca.
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                <Button
                                    size="sm"
                                    variant={activeDrilldownTab === 'receivables' ? 'default' : 'outline'}
                                    onClick={() => setActiveDrilldownTab('receivables')}
                                    className="h-8 text-xs"
                                >
                                    Piutang Customer ({drilldown.receivables.length})
                                </Button>
                                <Button
                                    size="sm"
                                    variant={activeDrilldownTab === 'payables' ? 'default' : 'outline'}
                                    onClick={() => setActiveDrilldownTab('payables')}
                                    className="h-8 text-xs"
                                >
                                    Utang PO Supplier ({drilldown.payables.length})
                                </Button>
                                <Button
                                    size="sm"
                                    variant={activeDrilldownTab === 'inventory' ? 'default' : 'outline'}
                                    onClick={() => setActiveDrilldownTab('inventory')}
                                    className="h-8 text-xs"
                                >
                                    Persediaan Gudang ({drilldown.inventory.length})
                                </Button>
                                <Button
                                    size="sm"
                                    variant={activeDrilldownTab === 'submissions' ? 'default' : 'outline'}
                                    onClick={() => setActiveDrilldownTab('submissions')}
                                    className="h-8 text-xs"
                                >
                                    Riwayat Pengesahan ({neraca_submissions.length})
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {activeDrilldownTab === 'receivables' && (
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead>No. Invoice</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead className="text-right">Nilai Piutang (Utang Customer)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {drilldown.receivables.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                                                Tidak ada tagihan piutang customer yang belum lunas.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        drilldown.receivables.map((item, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-mono text-xs font-bold text-indigo-600">
                                                    {item.invoice_number}
                                                </TableCell>
                                                <TableCell className="font-medium">{item.customer_name}</TableCell>
                                                <TableCell className="text-xs text-slate-500">{item.date}</TableCell>
                                                <TableCell className="text-right font-semibold">
                                                    {formatCurrency(item.amount)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}

                        {activeDrilldownTab === 'payables' && (
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead>No. PO</TableHead>
                                        <TableHead>Supplier</TableHead>
                                        <TableHead>Plant</TableHead>
                                        <TableHead>Tanggal PO</TableHead>
                                        <TableHead>Status PO</TableHead>
                                        <TableHead className="text-right">Nilai Utang Usaha</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {drilldown.payables.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                                Seluruh Purchase Order yang disetujui telah lunas.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        drilldown.payables.map((po, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-mono text-xs font-bold text-indigo-600">
                                                    {po.po_number}
                                                </TableCell>
                                                <TableCell className="font-medium">{po.supplier_name}</TableCell>
                                                <TableCell className="text-xs text-slate-500">{po.plant_name}</TableCell>
                                                <TableCell className="text-xs text-slate-500">{po.date}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{po.status}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-semibold text-rose-700">
                                                    {formatCurrency(po.amount)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}

                        {activeDrilldownTab === 'inventory' && (
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead>Kode Produk</TableHead>
                                        <TableHead>Nama Barang</TableHead>
                                        <TableHead>Lokasi Gudang</TableHead>
                                        <TableHead className="text-center">Stok Tersedia</TableHead>
                                        <TableHead className="text-right">Harga Satuan</TableHead>
                                        <TableHead className="text-right">Total Valuasi Persediaan</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {drilldown.inventory.map((prod, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-mono text-xs font-bold">{prod.code}</TableCell>
                                            <TableCell className="font-medium">{prod.name}</TableCell>
                                            <TableCell className="text-xs text-slate-500">{prod.category}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary">
                                                    {prod.stock} {prod.unit}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">{formatCurrency(prod.price)}</TableCell>
                                            <TableCell className="text-right font-semibold text-emerald-700">
                                                {formatCurrency(prod.total_value)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}

                        {activeDrilldownTab === 'submissions' && (
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead>Periode Neraca</TableHead>
                                        <TableHead>Diajukan Oleh</TableHead>
                                        <TableHead>Waktu Pengajuan</TableHead>
                                        <TableHead>Disahkan Oleh</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Catatan</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {neraca_submissions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                                Belum ada riwayat pengajuan pengesahan Neraca.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        neraca_submissions.map((sub) => (
                                            <TableRow key={sub.id}>
                                                <TableCell className="font-medium">
                                                    {sub.period_start} s/d {sub.period_end}
                                                </TableCell>
                                                <TableCell className="text-xs">{sub.created_by_name}</TableCell>
                                                <TableCell className="text-xs text-slate-500">
                                                    {sub.created_at}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {sub.validated_by_name ?? '—'}
                                                </TableCell>
                                                <TableCell>
                                                    {sub.status === 'validated' ? (
                                                        <Badge className="bg-emerald-600 text-white">
                                                            Disahkan Manager
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="border-amber-300 bg-amber-50 text-amber-800"
                                                        >
                                                            Menunggu Validasi
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500">
                                                    {sub.validation_notes ?? '—'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {isManager && sub.status === 'submitted' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleValidateNeracaSubmission(sub.id)}
                                                            className="h-7 bg-emerald-600 px-2.5 text-xs text-white hover:bg-emerald-700"
                                                        >
                                                            Sahkan Neraca
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

ManagerNeraca.layout = {
    breadcrumbs: [
        {
            title: 'Laporan Neraca (Balance Sheet)',
            href: '/manager/neraca',
        },
    ],
};
