import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Database,
    FileSpreadsheet,
    FileUp,
    Plus,
    Save,
    Trash2,
    UploadCloud,
    XCircle,
} from 'lucide-react';
import * as React from 'react';
import { useCurrency } from '@/components/currency-context';
import { useLanguage } from '@/components/language-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parseSpreadsheetFile, type ParsedSpreadsheetRow } from '@/lib/excel-parser';

interface Customer {
    id: number;
    name: string;
    email?: string;
}

interface Product {
    id: number;
    code?: string;
    name: string;
    category?: string;
    price: number;
    stock?: number;
}

interface ExistingInvoiceInfo {
    id: string;
    order_id: string;
    customer_name: string;
    invoice_type: string;
    total_amount: number;
    signature_by_name: string;
    signature_by_code: string;
}

interface CreateInvoiceProps {
    customers: Customer[];
    products: Product[];
    existing_invoices?: ExistingInvoiceInfo[];
}

interface InvoiceLineItem {
    productId: number;
    quantity: number;
    price: number;
}

interface PreviewInvoiceGroup {
    ref: string;
    customerName: string;
    invoiceType: 'domestik' | 'international';
    currency: string;
    exchangeRate: number;
    taxPercent: number;
    dpAmount: number;
    dueDate: string;
    items: Array<{
        productCode: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        matchedProductId: number | null;
    }>;
    subtotal: number;
    totalAmount: number;
    isDuplicate: boolean;
    duplicateReason: string | null;
}

function buildCanonicalSig(
    customerName: string,
    invoiceType: string,
    items: Array<{ key: string; quantity: number }>,
): string {
    const cust = customerName.trim().toLowerCase();
    const type = (invoiceType || 'domestik').trim().toLowerCase();
    const parts = items
        .filter((i) => i.key.trim() !== '' && i.quantity > 0)
        .map((i) => `${i.key.trim().toLowerCase()}:${i.quantity}`)
        .sort();
    return `${cust}|${type}|${parts.join(',')}`;
}

export default function CreateInvoice({
    customers,
    products,
    existing_invoices = [],
}: CreateInvoiceProps) {
    const { formatPrice } = useCurrency();
    const { t } = useLanguage();
    const { auth, flash } = usePage().props as any;

    const { data, setData, post, processing, errors } = useForm({
        customerId: customers[0]?.id || 0,
        salesRep: auth?.user?.name || '',
        invoice_type: 'domestik',
        currency: 'IDR',
        exchangeRate: 1,
        items: [] as InvoiceLineItem[],
        dp_amount: 0,
        tax_percent: 11,
        due_date: '',
        delivery_date: '',
        attachment: null as File | null,
    });

    const [selectedProductId, setSelectedProductId] = React.useState<number>(products[0]?.id || 0);
    const [selectedQty, setSelectedQty] = React.useState<number>(1);

    // Excel Import state
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const [excelFile, setExcelFile] = React.useState<File | null>(null);
    const [previewGroups, setPreviewGroups] = React.useState<PreviewInvoiceGroup[]>([]);
    const [internalDupWarnings, setInternalDupWarnings] = React.useState<string[]>([]);
    const [isImportingDb, setIsImportingDb] = React.useState(false);
    const [autoFilledNotice, setAutoFilledNotice] = React.useState<string | null>(null);

    const handleAddItem = () => {
        const product = products.find((p) => p.id === selectedProductId);
        if (!product) return;

        const existingIdx = data.items.findIndex((item) => item.productId === selectedProductId);
        if (existingIdx > -1) {
            const updatedItems = [...data.items];
            updatedItems[existingIdx].quantity += selectedQty;
            setData('items', updatedItems);
        } else {
            setData('items', [
                ...data.items,
                {
                    productId: selectedProductId,
                    quantity: selectedQty,
                    price: product.price,
                },
            ]);
        }
    };

    const handleRemoveItem = (index: number) => {
        const updatedItems = data.items.filter((_, i) => i !== index);
        setData('items', updatedItems);
    };

    const subtotal = React.useMemo(() => {
        return data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }, [data.items]);

    const taxAmount = React.useMemo(() => {
        if (data.invoice_type === 'international') return 0;
        return subtotal * (data.tax_percent / 100);
    }, [subtotal, data.invoice_type, data.tax_percent]);

    const grandTotal = React.useMemo(() => {
        return subtotal + taxAmount;
    }, [subtotal, taxAmount]);

    // Live check if current manual form selection is a duplicate of an existing invoice in DB
    const manualFormDuplicateWarning = React.useMemo(() => {
        if (data.items.length === 0) return null;
        const cust = customers.find((c) => c.id === Number(data.customerId));
        if (!cust) return null;

        const sigItems = data.items.map((it) => {
            const prod = products.find((p) => p.id === it.productId);
            return {
                key: prod?.name || '',
                quantity: it.quantity,
            };
        });
        const currentSig = buildCanonicalSig(cust.name, data.invoice_type, sigItems);
        const matched = existing_invoices.find((ex) => ex.signature_by_name === currentSig);
        if (matched) {
            return `Peringatan Data Sama: Kombinasi customer "${cust.name}" dengan rincian produk & kuantitas ini sudah terdaftar di database (${matched.id} / ${matched.order_id}).`;
        }
        return null;
    }, [data.customerId, data.invoice_type, data.items, customers, products, existing_invoices]);

    const applyGroupToForm = (group: PreviewInvoiceGroup) => {
        const matchedCustomer = customers.find(
            (c) => c.name.trim().toLowerCase() === group.customerName.trim().toLowerCase(),
        );
        const formItems: InvoiceLineItem[] = [];
        group.items.forEach((it) => {
            if (it.matchedProductId) {
                formItems.push({
                    productId: it.matchedProductId,
                    quantity: it.quantity,
                    price: it.unitPrice,
                });
            }
        });

        setData((prev) => ({
            ...prev,
            customerId: matchedCustomer ? matchedCustomer.id : prev.customerId,
            invoice_type: group.invoiceType,
            currency: group.currency,
            exchangeRate: group.exchangeRate,
            tax_percent: group.taxPercent,
            dp_amount: group.dpAmount,
            due_date: group.dueDate || prev.due_date,
            items: formItems.length > 0 ? formItems : prev.items,
        }));

        if (formItems.length > 0) {
            setAutoFilledNotice(
                `Form Input Invoice otomatis terisi dari file Excel untuk customer "${group.customerName}" (${formItems.length} baris produk).`,
            );
        }
    };

    const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setExcelFile(file);
        setAutoFilledNotice(null);

        try {
            const rows: ParsedSpreadsheetRow[] = await parseSpreadsheetFile(file);
            if (rows.length === 0) {
                setPreviewGroups([]);
                setInternalDupWarnings(['File Excel/CSV kosong atau tidak memiliki baris data.']);
                return;
            }

            const seenFingerprints: Record<string, string> = {};
            const rowDups: string[] = [];
            const groupsMap: Record<string, PreviewInvoiceGroup> = {};

            rows.forEach((row, idx) => {
                const rowNum = row._row_number || String(idx + 2);
                const ref = (
                    row.no_referensi ||
                    row.no_invoice ||
                    row.invoice_no ||
                    row.order_id ||
                    row.no_order ||
                    row.referensi ||
                    row.ref ||
                    ''
                ).trim();
                const customerName = (
                    row.nama_customer ||
                    row.customer ||
                    row.pelanggan ||
                    row.nama_pelanggan ||
                    row.customer_name ||
                    row.perusahaan ||
                    ''
                ).trim();
                const productCode = (
                    row.kode_produk ||
                    row.product_code ||
                    row.code ||
                    row.kode ||
                    ''
                ).trim();
                const productName = (
                    row.nama_produk ||
                    row.produk ||
                    row.product ||
                    row.product_name ||
                    row.nama_barang ||
                    row.barang ||
                    row.item ||
                    ''
                ).trim();

                if (!customerName && !productName && !productCode) return;

                const qty = Math.max(
                    1,
                    parseInt((row.qty || row.quantity || row.jumlah || row.kuantitas || '1').replace(/[^0-9-]/g, ''), 10) || 1,
                );
                const rawPrice =
                    parseFloat((row.harga_satuan || row.price || row.harga || row.unit_price || '0').replace(/[^0-9.]/g, '')) ||
                    0;

                const typeRaw = (
                    row.tipe_invoice ||
                    row.invoice_type ||
                    row.tipe ||
                    row.jenis ||
                    'domestik'
                )
                    .trim()
                    .toLowerCase();
                const invoiceType: 'domestik' | 'international' = ['international', 'internasional', 'ekspor', 'export'].includes(
                    typeRaw,
                )
                    ? 'international'
                    : 'domestik';

                const currency = (
                    row.mata_uang ||
                    row.currency ||
                    row.valuta ||
                    (invoiceType === 'international' ? 'USD' : 'IDR')
                )
                    .trim()
                    .toUpperCase();
                const exchangeRate = Math.max(
                    1,
                    parseFloat((row.kurs || row.exchange_rate || row.rate || '1').replace(/[^0-9.]/g, '')) || 1,
                );
                const taxPercent =
                    invoiceType === 'international'
                        ? 0
                        : parseFloat((row.ppn || row.ppn_ || row.tax_percent || row.pajak || '11').replace(/[^0-9.]/g, '')) || 11;
                const dpAmount = Math.max(
                    0,
                    parseFloat((row.dp || row.dp_amount || row.uang_muka || '0').replace(/[^0-9.]/g, '')) || 0,
                );
                const dueDate = (row.jatuh_tempo || row.due_date || row.tgl_jatuh_tempo || '').trim();

                const fingerprint = `${ref.toLowerCase()}|${customerName.toLowerCase()}|${invoiceType}|${(productCode || productName).toLowerCase()}|${qty}`;
                if (seenFingerprints[fingerprint]) {
                    rowDups.push(
                        `Baris #${rowNum} (${customerName} - ${productName || productCode} x${qty}) sama persis dengan Baris #${seenFingerprints[fingerprint]} di dalam file Excel.`,
                    );
                    return;
                }
                seenFingerprints[fingerprint] = rowNum;

                const matchedProduct = products.find(
                    (p) =>
                        (productCode && p.code && p.code.toLowerCase() === productCode.toLowerCase()) ||
                        (productName && p.name.toLowerCase() === productName.toLowerCase()),
                );
                const unitPrice = rawPrice > 0 ? rawPrice : matchedProduct?.price || 100000;

                const groupKey = ref
                    ? `REF:${ref.toUpperCase()}`
                    : `AUTO:${customerName.toLowerCase()}|${invoiceType}|${dueDate}|${dpAmount}`;

                if (!groupsMap[groupKey]) {
                    groupsMap[groupKey] = {
                        ref: ref || `AUTO-${Object.keys(groupsMap).length + 1}`,
                        customerName: customerName || 'Customer Umum',
                        invoiceType,
                        currency: ['IDR', 'USD', 'EUR'].includes(currency) ? currency : 'IDR',
                        exchangeRate,
                        taxPercent,
                        dpAmount,
                        dueDate,
                        items: [],
                        subtotal: 0,
                        totalAmount: 0,
                        isDuplicate: false,
                        duplicateReason: null,
                    };
                }

                groupsMap[groupKey].items.push({
                    productCode: productCode || matchedProduct?.code || '-',
                    productName: productName || matchedProduct?.name || productCode,
                    quantity: qty,
                    unitPrice,
                    matchedProductId: matchedProduct?.id ?? null,
                });
            });

            // Calculate totals & run duplicate check against DB + earlier groups in file
            const seenGroupSigs: Record<string, string> = {};
            const finalGroups = Object.values(groupsMap).map((grp) => {
                const sub = grp.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
                const tax = sub * (grp.taxPercent / 100);
                const tot = Math.max(0, sub + tax - grp.dpAmount);
                grp.subtotal = sub;
                grp.totalAmount = tot;

                const sigByName = buildCanonicalSig(
                    grp.customerName,
                    grp.invoiceType,
                    grp.items.map((i) => ({ key: i.productName, quantity: i.quantity })),
                );
                const sigByCode = buildCanonicalSig(
                    grp.customerName,
                    grp.invoiceType,
                    grp.items.map((i) => ({ key: i.productCode !== '-' ? i.productCode : i.productName, quantity: i.quantity })),
                );

                const matchedRefInDb = existing_invoices.find(
                    (ex) =>
                        ex.order_id.toUpperCase() === grp.ref.toUpperCase() ||
                        ex.id.toUpperCase() === grp.ref.toUpperCase(),
                );
                const matchedSigInDb = existing_invoices.find(
                    (ex) => ex.signature_by_name === sigByName || ex.signature_by_code === sigByCode,
                );

                if (matchedRefInDb) {
                    grp.isDuplicate = true;
                    grp.duplicateReason = `No Referensi sama dengan ${matchedRefInDb.id} (${matchedRefInDb.order_id}) di Database`;
                } else if (matchedSigInDb) {
                    grp.isDuplicate = true;
                    grp.duplicateReason = `Data sama persis dengan ${matchedSigInDb.id} (${matchedSigInDb.customer_name}) di Database`;
                } else if (seenGroupSigs[sigByName]) {
                    grp.isDuplicate = true;
                    grp.duplicateReason = `Duplikat dengan grup ${seenGroupSigs[sigByName]} di file Excel ini`;
                } else {
                    seenGroupSigs[sigByName] = grp.ref;
                }

                return grp;
            });

            setInternalDupWarnings(rowDups);
            setPreviewGroups(finalGroups);

            // Automatically fill the Input Invoice form with the first non-duplicate group (or first group)
            const firstTarget = finalGroups.find((g) => !g.isDuplicate) ?? finalGroups[0];
            if (firstTarget) {
                applyGroupToForm(firstTarget);
            }
        } catch {
            setInternalDupWarnings(['Gagal membaca struktur file. Pastikan file berformat .xlsx atau .csv yang valid.']);
        }
    };

    const handleDirectImportToDb = () => {
        if (!excelFile) return;
        setIsImportingDb(true);
        const formData = new FormData();
        formData.append('file', excelFile);

        router.post('/invoices/import', formData, {
            forceFormData: true,
            onFinish: () => setIsImportingDb(false),
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/invoices', {
            forceFormData: true,
            onError: () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            },
        });
    };

    React.useEffect(() => {
        if (data.invoice_type === 'international') {
            setData((d) => ({ ...d, currency: 'USD', tax_percent: 0 }));
        } else {
            setData((d) => ({ ...d, currency: 'IDR', tax_percent: 11, exchangeRate: 1 }));
        }
    }, [data.invoice_type]);

    const newGroupsCount = previewGroups.filter((g) => !g.isDuplicate).length;
    const dupGroupsCount = previewGroups.filter((g) => g.isDuplicate).length + internalDupWarnings.length;

    return (
        <>
            <Head title={t('Input Invoice Baru', 'New Invoice Entry')} />
            <div className="flex flex-1 flex-col gap-6 p-6 max-w-5xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/sales/invoice-rekap" aria-label={t('Kembali ke Rekap Invoice', 'Back to Invoice Recap')}>
                                <ArrowLeft className="size-5" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{t('Input Invoice Baru', 'New Invoice Entry')}</h1>
                            <p className="text-muted-foreground text-sm">
                                {t(
                                    'Input manual atau import otomatis dari file Excel (.xlsx / .csv) langsung ke database dengan pengecekan duplikat.',
                                    'Manual entry or automatic import from Excel (.xlsx / .csv) directly to the database with duplicate checking.',
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                        <XCircle className="size-4 shrink-0 text-rose-600" />
                        <span>{flash.error}</span>
                    </div>
                )}

                {Object.keys(errors).length > 0 && (
                    <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                        <p className="font-semibold">
                            {t('Gagal menyimpan invoice. Periksa kembali isian berikut:', 'Failed to save invoice. Please check the following:')}
                        </p>
                        <ul className="mt-1 list-disc list-inside">
                            {Object.values(errors).map((message, idx) => (
                                <li key={idx}>{message}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* CARD FITUR IMPORT OTOMATIS DARI EXCEL + PENGECEKAN DUPLIKAT */}
                <Card className="border-2 border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/50 dark:bg-emerald-950/10 shadow-xs">
                    <CardHeader className="pb-3 border-b border-emerald-200/60 dark:border-emerald-900/40">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-base font-bold text-emerald-900 dark:text-emerald-300">
                                    <FileSpreadsheet className="size-5 text-emerald-600" />
                                    {t(
                                        'Import Otomatis Invoice dari Excel / CSV (Masuk Database + Cek Data Sama)',
                                        'Automatic Invoice Import from Excel / CSV (Direct to DB + Duplicate Check)',
                                    )}
                                </CardTitle>
                                <CardDescription className="text-xs mt-0.5">
                                    {t(
                                        'Unggah file Excel (.xlsx, .xls, .csv) untuk otomatis mengisi form input atau langsung menyimpan seluruh invoice ke database. Sistem otomatis mengecek apakah ada data yang sama (duplikat).',
                                        'Upload an Excel (.xlsx, .xls, .csv) file to auto-fill the form or directly save all invoices to the database with duplicate detection.',
                                    )}
                                </CardDescription>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    asChild
                                    className="border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 dark:bg-zinc-900 dark:text-emerald-300"
                                >
                                    <a href="/invoices/template">
                                        <FileSpreadsheet className="size-4 mr-1.5 text-emerald-600" />
                                        {t('Download Template Excel (.xlsx)', 'Download Excel Template (.xlsx)')}
                                    </a>
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleExcelFileChange}
                                    className="hidden"
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                    <FileUp className="size-4 mr-1.5" />
                                    {t('Pilih File Excel / CSV', 'Select Excel / CSV File')}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    {excelFile && (
                        <CardContent className="pt-4 space-y-4">
                            {autoFilledNotice && (
                                <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                                    <CheckCircle2 className="size-4 shrink-0 text-blue-600" />
                                    <span>{autoFilledNotice}</span>
                                </div>
                            )}

                            {/* Duplicate Check Summary Banner */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border bg-white p-3.5 dark:bg-zinc-900">
                                <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            File: {excelFile.name}
                                        </span>
                                        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 text-xs">
                                            {newGroupsCount} Invoice Baru (Valid)
                                        </Badge>
                                        {dupGroupsCount > 0 ? (
                                            <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700 text-xs">
                                                {dupGroupsCount} Data Sama / Duplikat Terdeteksi
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700 text-xs">
                                                0 Data Duplikat (Aman)
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {dupGroupsCount > 0
                                            ? 'Sistem mendeteksi ada data yang sama. Saat disimpan ke database, data yang sama otomatis dilewati agar tidak ganda.'
                                            : 'Hasil pengecekan duplikat: seluruh data invoice pada file Excel belum ada di database dan siap disimpan.'}
                                    </p>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    <Button
                                        type="button"
                                        onClick={handleDirectImportToDb}
                                        disabled={isImportingDb || previewGroups.length === 0}
                                        className="bg-indigo-600 text-white hover:bg-indigo-700 gap-1.5"
                                    >
                                        <Database className="size-4" />
                                        {isImportingDb
                                            ? 'Menyimpan ke Database...'
                                            : `Simpan Otomatis ke Database (${newGroupsCount} Invoice)`}
                                    </Button>
                                </div>
                            </div>

                            {internalDupWarnings.length > 0 && (
                                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                                    <div className="font-bold flex items-center gap-1.5 mb-1">
                                        <AlertTriangle className="size-4 text-amber-600" />
                                        Baris Sama (Duplikat Internal) di dalam File Excel:
                                    </div>
                                    <ul className="list-disc list-inside space-y-0.5">
                                        {internalDupWarnings.map((w, i) => (
                                            <li key={i}>{w}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {previewGroups.length > 0 && (
                                <div className="rounded-md border bg-white dark:bg-zinc-900 overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/40">
                                            <TableRow>
                                                <TableHead className="text-xs">Ref / Order</TableHead>
                                                <TableHead className="text-xs">Nama Customer</TableHead>
                                                <TableHead className="text-xs">Tipe</TableHead>
                                                <TableHead className="text-xs">Rincian Barang (Excel)</TableHead>
                                                <TableHead className="text-xs text-right">Total Tagihan</TableHead>
                                                <TableHead className="text-xs text-center">Status Cek Duplikat</TableHead>
                                                <TableHead className="text-xs text-right">Aksi Form</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {previewGroups.map((grp, idx) => (
                                                <TableRow
                                                    key={idx}
                                                    className={grp.isDuplicate ? 'bg-rose-50/40 dark:bg-rose-950/10' : ''}
                                                >
                                                    <TableCell className="font-mono text-xs font-semibold">{grp.ref}</TableCell>
                                                    <TableCell className="text-xs font-medium">{grp.customerName}</TableCell>
                                                    <TableCell className="text-xs uppercase">{grp.invoiceType}</TableCell>
                                                    <TableCell className="text-xs">
                                                        {grp.items.map((it, i) => (
                                                            <div key={i}>
                                                                {it.productName} <span className="text-muted-foreground">x{it.quantity}</span>
                                                            </div>
                                                        ))}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-right font-bold">
                                                        {formatPrice(grp.totalAmount)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {grp.isDuplicate ? (
                                                            <div className="flex flex-col items-center gap-0.5">
                                                                <Badge
                                                                    variant="outline"
                                                                    className="border-rose-300 bg-rose-100 text-rose-800 text-[10px]"
                                                                >
                                                                    DUPLIKAT / DATA SAMA
                                                                </Badge>
                                                                <span className="text-[10px] text-rose-600 max-w-[220px] leading-tight">
                                                                    {grp.duplicateReason}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <Badge
                                                                variant="outline"
                                                                className="border-emerald-300 bg-emerald-100 text-emerald-800 text-[10px]"
                                                            >
                                                                DATA BARU (VALID)
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => applyGroupToForm(grp)}
                                                            className="h-7 text-xs"
                                                        >
                                                            Isi ke Form
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    )}
                </Card>

                {manualFormDuplicateWarning && (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                        <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                        <span>{manualFormDuplicateWarning}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-3">
                    {/* Left 2 Columns: Details & Products */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Invoice & Customer Information */}
                        <Card className="border border-sidebar-border/70 shadow-sm">
                            <CardHeader className="bg-muted/20 pb-4 border-b">
                                <CardTitle>{t('Detail Pelanggan & Invoice', 'Customer & Invoice Details')}</CardTitle>
                                <CardDescription>
                                    {t('Pilih pelanggan dan tentukan jenis tagihan (Domestik/Ekspor).', 'Select the client and invoice type (Domestic/Export).')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4 sm:grid-cols-2 pt-6">
                                <div className="space-y-2">
                                    <Label htmlFor="invoice-type">{t('Tipe Invoice', 'Invoice Type')}</Label>
                                    <Select value={data.invoice_type} onValueChange={(value) => setData('invoice_type', value)}>
                                        <SelectTrigger id="invoice-type" className="w-full font-medium">
                                            <SelectValue placeholder={t('Pilih Tipe', 'Select Type')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="domestik">Domestik (Lokal)</SelectItem>
                                            <SelectItem value="international">Internasional (Ekspor)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="customer">{t('Pelanggan', 'Customer')}</Label>
                                    <Select value={String(data.customerId)} onValueChange={(value) => setData('customerId', Number(value))}>
                                        <SelectTrigger id="customer" className="w-full">
                                            <SelectValue placeholder={t('Pilih Pelanggan', 'Select Customer')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {customers.map((c) => (
                                                <SelectItem key={c.id} value={String(c.id)}>
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {data.invoice_type === 'international' && (
                                    <div className="sm:col-span-2 space-y-2 p-4 border border-dashed border-blue-300 bg-blue-50/50 dark:bg-blue-950/20 rounded-md">
                                        <Label htmlFor="attachment" className="text-blue-800 dark:text-blue-300 flex items-center gap-2">
                                            <UploadCloud className="size-4" />
                                            {t('Unggah Dokumen Invoice EXIM (Wajib)', 'Upload EXIM Document (Required)')}
                                        </Label>
                                        <Input
                                            id="attachment"
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => setData('attachment', e.target.files?.[0] || null)}
                                            className="bg-white dark:bg-zinc-900"
                                        />
                                        <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                                            Format didukung: PDF, JPG, PNG. Maksimal 5MB.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Add Line Item Form */}
                        <Card className="border border-sidebar-border/70 shadow-sm">
                            <CardHeader className="bg-muted/20 pb-4 border-b">
                                <CardTitle>{t('Tambah Produk', 'Add Products')}</CardTitle>
                                <CardDescription>
                                    {t('Pilih produk dan jumlah kuantitas untuk dimasukkan ke invoice.', 'Choose products and quantities to add to the invoice.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="sm:col-span-2 space-y-2">
                                        <Label htmlFor="product">{t('Produk', 'Product')}</Label>
                                        <Select value={String(selectedProductId)} onValueChange={(value) => setSelectedProductId(Number(value))}>
                                            <SelectTrigger id="product" className="w-full">
                                                <SelectValue placeholder={t('Pilih Produk', 'Select Product')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {products.map((p) => (
                                                    <SelectItem key={p.id} value={String(p.id)}>
                                                        {p.name} - {formatPrice(p.price)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="qty">{t('Jumlah', 'Quantity')}</Label>
                                        <Input
                                            id="qty"
                                            type="number"
                                            min="1"
                                            value={selectedQty}
                                            onChange={(e) => setSelectedQty(Math.max(1, Number(e.target.value)))}
                                        />
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    onClick={handleAddItem}
                                    variant="secondary"
                                    className="w-full flex items-center justify-center gap-1"
                                >
                                    <Plus className="size-4" /> {t('Tambah Baris Item', 'Add Item Line')}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Order Lines Table */}
                        <Card className="border border-sidebar-border/70 shadow-sm">
                            <CardHeader className="bg-muted/20 pb-4 border-b">
                                <CardTitle>{t('Barang Penjualan', 'Sales Items')}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="pl-6">{t('Nama Produk', 'Product Name')}</TableHead>
                                            <TableHead className="w-[100px] text-right">{t('Harga', 'Price')}</TableHead>
                                            <TableHead className="w-[80px] text-center">{t('Kuantitas', 'Qty')}</TableHead>
                                            <TableHead className="w-[120px] text-right">Total</TableHead>
                                            <TableHead className="w-[50px] pr-6"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.items.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                    {t(
                                                        'Belum ada produk ditambahkan. Pilih produk di atas atau gunakan fitur Import Otomatis dari Excel.',
                                                        'No items added yet. Choose a product or use Automatic Excel Import.',
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            data.items.map((item, index) => {
                                                const product = products.find((p) => p.id === item.productId);

                                                return (
                                                    <TableRow key={index}>
                                                        <TableCell className="font-medium pl-6">{product?.name || 'Unknown'}</TableCell>
                                                        <TableCell className="text-right">{formatPrice(item.price)}</TableCell>
                                                        <TableCell className="text-center">{item.quantity}</TableCell>
                                                        <TableCell className="text-right font-semibold">
                                                            {formatPrice(item.price * item.quantity)}
                                                        </TableCell>
                                                        <TableCell className="pr-6">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => handleRemoveItem(index)}
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right 1 Column: Invoice summary & Config */}
                    <div className="space-y-6">
                        <Card className="border border-sidebar-border/70 sticky top-6 bg-neutral-50 dark:bg-neutral-900/50 shadow-sm">
                            <CardHeader className="border-b pb-4">
                                <CardTitle>{t('Pengaturan & Ringkasan', 'Settings & Summary')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                <div className="space-y-2">
                                    <Label htmlFor="currency">{t('Mata Uang', 'Currency')}</Label>
                                    <Select value={data.currency} onValueChange={(value) => setData('currency', value)}>
                                        <SelectTrigger id="currency" className="w-full">
                                            <SelectValue placeholder={t('Pilih Mata Uang', 'Select Currency')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="IDR">IDR (Rupiah)</SelectItem>
                                            <SelectItem value="EUR">EUR (Euro)</SelectItem>
                                            <SelectItem value="USD">USD (US Dollar)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {data.currency !== 'IDR' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="exchange-rate">{t('Nilai Tukar (Exchange Rate)', 'Exchange Rate')}</Label>
                                        <Input
                                            id="exchange-rate"
                                            type="number"
                                            step="0.000001"
                                            min="0"
                                            value={data.exchangeRate}
                                            onChange={(e) => setData('exchangeRate', Number(e.target.value))}
                                        />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="tax">{t('Persentase Pajak (%)', 'Tax Percentage (%)')}</Label>
                                    <Input
                                        id="tax"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={data.tax_percent}
                                        onChange={(e) => setData('tax_percent', Number(e.target.value))}
                                        disabled={data.invoice_type === 'international'}
                                    />
                                    {data.invoice_type === 'international' && (
                                        <p className="text-xs text-muted-foreground">Ekspor dibebaskan dari PPN (0%).</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="dp">{t('Uang Muka (DP)', 'Down Payment (DP)')}</Label>
                                    <Input
                                        id="dp"
                                        type="number"
                                        min="0"
                                        value={data.dp_amount || ''}
                                        onChange={(e) => setData('dp_amount', Number(e.target.value))}
                                        placeholder="0"
                                    />
                                </div>

                                <div className="space-y-2 border-y py-4 my-4">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span>{formatPrice(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-muted-foreground">
                                            {t('Pajak', 'Tax')} ({data.tax_percent}%)
                                        </span>
                                        <span>{formatPrice(taxAmount)}</span>
                                    </div>
                                    {data.dp_amount > 0 && (
                                        <div className="flex justify-between text-sm mb-1 text-amber-600 dark:text-amber-400">
                                            <span>Dikurangi DP</span>
                                            <span>-{formatPrice(data.dp_amount)}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-between font-bold text-lg items-start">
                                    <span>{t('Total Akhir', 'Grand Total')}</span>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-primary text-xl">
                                            {formatPrice(Math.max(0, grandTotal - (data.dp_amount || 0)))}
                                        </span>
                                        {data.currency !== 'IDR' && data.exchangeRate > 0 && (
                                            <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md flex items-center gap-1 border border-sidebar-border/50">
                                                ≈{' '}
                                                {new Intl.NumberFormat('id-ID', {
                                                    style: 'currency',
                                                    currency: data.currency,
                                                }).format(Math.max(0, grandTotal - (data.dp_amount || 0)) / data.exchangeRate)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    size="lg"
                                    className="w-full mt-4 flex items-center justify-center gap-2 font-semibold shadow-md"
                                    disabled={data.items.length === 0 || processing}
                                >
                                    <Save className="size-5" /> {t('Simpan Invoice', 'Save Invoice')}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </form>
            </div>
        </>
    );
}

CreateInvoice.layout = {
    breadcrumbs: [
        {
            title: 'Invoice Recap',
            href: '/sales/invoice-rekap',
        },
        {
            title: 'New Invoice',
            href: '/invoices/create',
        },
    ],
};
