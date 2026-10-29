import { Link, usePage } from '@inertiajs/react';
import {
    LayoutGrid,
    ShoppingCart,
    Users,
    Globe,
    Languages,
    ClipboardList,
    FileText,
    Box,
    Undo2,
    Plus,
    Scale,
    Sun,
    Moon,
    Monitor,
} from 'lucide-react';
import * as React from 'react';
import AppLogo from '@/components/app-logo';
import { useCurrency } from '@/components/currency-context';
import { useLanguage } from '@/components/language-context';
import { useAppearance } from '@/hooks/use-appearance';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

interface RawNavItem {
    titleId: string;
    titleEn: string;
    href: string;
    icon: typeof LayoutGrid;
    badgeKey?: 'accounting_inbox' | 'manager_reports' | 'purchase_orders';
    roles?: string[];
}

const mainNavItemsRaw: RawNavItem[] = [
    {
        titleId: 'Dasbor',
        titleEn: 'Dashboard',
        href: '/dashboard',
        icon: LayoutGrid,
    },
    {
        titleId: 'Inbox Laporan Detail',
        titleEn: 'Detailed Report Inbox',
        href: '/manager/reports',
        icon: ClipboardList,
        badgeKey: 'manager_reports',
        roles: ['manager'],
    },
    {
        titleId: 'Laporan Neraca',
        titleEn: 'Balance Sheet (Neraca)',
        href: '/manager/neraca',
        icon: Scale,
        roles: ['manager', 'staff_accounting'],
    },
    {
        titleId: 'Rekap Penjualan Valid',
        titleEn: 'Validated Sales Recap',
        href: '/manager/sales-recap',
        icon: FileText,
        roles: ['manager'],
    },
    {
        titleId: 'Kotak Masuk Validasi',
        titleEn: 'Validation Inbox',
        href: '/accounting/inbox',
        icon: ClipboardList,
        badgeKey: 'accounting_inbox',
        roles: ['staff_accounting'],
    },
    {
        titleId: 'Purchase Order (PO)',
        titleEn: 'Purchase Orders (PO)',
        href: '/purchase-orders',
        icon: ShoppingCart,
        badgeKey: 'purchase_orders',
        roles: ['staff_sales', 'staff_accounting', 'manager'],
    },
    {
        titleId: 'Riwayat Invoice',
        titleEn: 'Invoice History',
        href: '/sales/invoice-rekap',
        icon: FileText,
        roles: ['staff_sales'],
    },
    {
        titleId: 'Rekapan Penjualan per Customer',
        titleEn: 'Sales Recap per Customer',
        href: '/reports/customer-recap',
        icon: FileText,
        roles: ['staff_accounting', 'manager'],
    },
    {
        titleId: 'Input Invoice Baru',
        titleEn: 'New Invoice Entry',
        href: '/invoices/create',
        icon: Plus,
        roles: ['staff_sales'],
    },
    {
        titleId: 'Retur / Barang Reject',
        titleEn: 'Item Returns',
        href: '/returns',
        icon: Undo2,
        roles: ['staff_sales', 'staff_accounting'],
    },
    {
        titleId: 'Pelanggan (Customer)',
        titleEn: 'Customers',
        href: '/customers',
        icon: Users,
        roles: ['staff_sales', 'staff_accounting'],
    },
    {
        titleId: 'Produk',
        titleEn: 'Products',
        href: '/products',
        icon: Box,
        roles: ['staff_sales', 'staff_accounting'],
    },
];

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const { currency, setCurrency } = useCurrency();
    const { language, setLanguage, t } = useLanguage();
    const { appearance, updateAppearance } = useAppearance();
    const { auth, sidebar_badges } = usePage().props as any;

    const mainNavItems = React.useMemo<NavItem[]>(() => {
        const user = auth?.user;
        const role = user?.role || 'staff_sales';

        return mainNavItemsRaw
            .filter((item) => !item.roles || item.roles.includes(role))
            .map((item) => {
                const rawBadge = item.badgeKey
                    ? Number(sidebar_badges?.[item.badgeKey] ?? 0)
                    : 0;

                return {
                    title: t(item.titleId, item.titleEn),
                    href: item.href,
                    icon: item.icon,
                    badge: rawBadge > 0 ? rawBadge : undefined,
                };
            });
    }, [t, auth, sidebar_badges]);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                {/* Theme Selector */}
                <div className="group-data-[collapsible=icon]:hidden px-3 py-2 flex flex-col gap-2 border-b border-sidebar-border/40">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Sun className="size-3" /> {t('Tema Tampilan', 'Theme')}
                    </span>
                    <div className="flex bg-muted p-0.5 rounded-md text-xs">
                        <button
                            type="button"
                            onClick={() => updateAppearance('light')}
                            className={`flex-1 py-1 rounded-sm text-center font-medium flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                appearance === 'light'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title={t('Tema Terang', 'Light Theme')}
                        >
                            <Sun className="size-3" />
                            <span>{t('Terang', 'Light')}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => updateAppearance('dark')}
                            className={`flex-1 py-1 rounded-sm text-center font-medium flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                appearance === 'dark'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title={t('Tema Gelap', 'Dark Theme')}
                        >
                            <Moon className="size-3" />
                            <span>{t('Gelap', 'Dark')}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => updateAppearance('system')}
                            className={`flex-1 py-1 rounded-sm text-center font-medium flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                appearance === 'system'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title={t('Tema Sistem', 'System Theme')}
                        >
                            <Monitor className="size-3" />
                            <span>{t('Sistem', 'System')}</span>
                        </button>
                    </div>
                </div>

                {/* Language Selector */}
                <div className="group-data-[collapsible=icon]:hidden px-3 py-2 flex flex-col gap-2 border-b border-sidebar-border/40">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Languages className="size-3" /> {t('Bahasa', 'Language')}
                    </span>
                    <div className="flex bg-muted p-0.5 rounded-md text-xs">
                        <button
                            onClick={() => setLanguage('id')}
                            className={`flex-1 py-1 rounded-sm text-center font-medium transition-all ${
                                language === 'id'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Indo
                        </button>
                        <button
                            onClick={() => setLanguage('en')}
                            className={`flex-1 py-1 rounded-sm text-center font-medium transition-all ${
                                language === 'en'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            English
                        </button>
                    </div>
                </div>

                {/* Currency Selector */}
                <div className="group-data-[collapsible=icon]:hidden px-3 py-2 flex flex-col gap-2 border-b border-sidebar-border/40 mb-2">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Globe className="size-3" /> {t('Mata Uang', 'Currency')}
                    </span>
                    <div className="flex bg-muted p-0.5 rounded-md text-xs">
                        <button
                            onClick={() => setCurrency('USD')}
                            className={`flex-1 py-1 rounded-sm text-center font-medium transition-all ${
                                currency === 'USD'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            USD ($)
                        </button>
                        <button
                            onClick={() => setCurrency('EUR')}
                            className={`flex-1 py-1 rounded-sm text-center font-medium transition-all ${
                                currency === 'EUR'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            EUR (€)
                        </button>
                        <button
                            onClick={() => setCurrency('IDR')}
                            className={`flex-1 py-1 rounded-sm text-center font-medium transition-all ${
                                currency === 'IDR'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            IDR (Rp)
                        </button>
                    </div>
                </div>
                {footerNavItems.length > 0 && (
                    <NavFooter items={footerNavItems} className="mt-auto" />
                )}
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
