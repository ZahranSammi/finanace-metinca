import { Link } from '@inertiajs/react';
import { BookOpen, FolderGit2, LayoutGrid, ShoppingCart, BarChart3, GitFork, Package, Users, Globe, Languages } from 'lucide-react';
import * as React from 'react';
import AppLogo from '@/components/app-logo';
import { useCurrency } from '@/components/currency-context';
import { useLanguage } from '@/components/language-context';
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
}

const mainNavItemsRaw: RawNavItem[] = [
    {
        titleId: 'Dasbor',
        titleEn: 'Dashboard',
        href: '/dashboard',
        icon: LayoutGrid,
    },
    {
        titleId: 'Analisis',
        titleEn: 'Analytics',
        href: '/analytics',
        icon: BarChart3,
    },
    {
        titleId: 'Entri Pesanan',
        titleEn: 'Order Entry',
        href: '/orders',
        icon: ShoppingCart,
    },
    {
        titleId: 'Pipeline Penjualan',
        titleEn: 'Sales Pipeline',
        href: '/pipeline',
        icon: GitFork,
    },
    {
        titleId: 'Inventaris',
        titleEn: 'Inventory',
        href: '/inventory',
        icon: Package,
    },
    {
        titleId: 'Pelanggan',
        titleEn: 'Customers',
        href: '/customers',
        icon: Users,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: FolderGit2,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    const { currency, setCurrency } = useCurrency();
    const { language, setLanguage, t } = useLanguage();

    const mainNavItems = React.useMemo<NavItem[]>(() => {
        return mainNavItemsRaw.map(item => ({
            title: t(item.titleId, item.titleEn),
            href: item.href,
            icon: item.icon
        }));
    }, [t]);

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
                {/* Language Selector */}
                <div className="px-3 py-2 flex flex-col gap-2 border-b border-sidebar-border/40">
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
                <div className="px-3 py-2 flex flex-col gap-2 border-b border-sidebar-border/40 mb-2">
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
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
