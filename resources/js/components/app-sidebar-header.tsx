import { router, usePage } from '@inertiajs/react';
import { Bell, Check, CheckCheck, ExternalLink, Monitor, Moon, Sun } from 'lucide-react';
import * as React from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { useLanguage } from '@/components/language-context';
import { useAppearance } from '@/hooks/use-appearance';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

interface NotificationItem {
    id: number;
    type: string;
    title: string;
    message: string;
    action_url: string | null;
    is_read: boolean;
    sender_name: string;
    created_at: string;
}

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { t } = useLanguage();
    const { appearance, resolvedAppearance, updateAppearance } = useAppearance();
    const { auth, notifications } = usePage().props as any;
    const user = auth?.user;
    const role = user?.role || 'staff_sales';

    const unreadCount: number = notifications?.unread_count ?? 0;
    const recentNotifications: NotificationItem[] = notifications?.recent ?? [];

    const roleLabel =
        role === 'manager'
            ? 'Manager Accounting'
            : role === 'staff_accounting'
              ? 'Staff Accounting'
              : 'Staff Sales';

    const handleNotificationClick = (notif: NotificationItem) => {
        router.post(
            `/notifications/${notif.id}/read`,
            { navigate: true },
            { preserveScroll: true },
        );
    };

    const handleMarkAllRead = () => {
        router.post('/notifications/read-all', {}, { preserveScroll: true });
    };

    return (
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border/50 px-3 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-6">
            <div className="flex min-w-0 items-center gap-2">
                <SidebarTrigger className="-ml-1 shrink-0" />
                <div className="min-w-0 truncate">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
                <Badge
                    variant="outline"
                    className="hidden sm:inline-flex border-blue-200 bg-blue-50/70 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300 font-semibold text-xs"
                >
                    {roleLabel}
                </Badge>

                {/* Theme Selector Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="relative size-9 rounded-full cursor-pointer hover:bg-muted/80"
                            aria-label={t('Pilihan Tema', 'Theme Options')}
                            title={t('Pilihan Tema', 'Theme Options')}
                        >
                            {resolvedAppearance === 'dark' ? (
                                <Moon className="size-4.5 text-muted-foreground" />
                            ) : (
                                <Sun className="size-4.5 text-muted-foreground" />
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                            onClick={() => updateAppearance('light')}
                            className="flex items-center gap-2 text-xs font-medium cursor-pointer"
                        >
                            <Sun className="size-4 text-amber-500" />
                            <span>{t('Terang (Light)', 'Light')}</span>
                            {appearance === 'light' && (
                                <Check className="ml-auto size-3.5 text-blue-600" />
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => updateAppearance('dark')}
                            className="flex items-center gap-2 text-xs font-medium cursor-pointer"
                        >
                            <Moon className="size-4 text-blue-400" />
                            <span>{t('Gelap (Dark)', 'Dark')}</span>
                            {appearance === 'dark' && (
                                <Check className="ml-auto size-3.5 text-blue-600" />
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => updateAppearance('system')}
                            className="flex items-center gap-2 text-xs font-medium cursor-pointer"
                        >
                            <Monitor className="size-4 text-slate-500" />
                            <span>{t('Sistem (System)', 'System')}</span>
                            {appearance === 'system' && (
                                <Check className="ml-auto size-3.5 text-blue-600" />
                            )}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="relative size-9 rounded-full"
                            aria-label={t('Notifikasi', 'Notifications')}
                        >
                            <Bell className="size-5 text-muted-foreground" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-background">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0">
                        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">
                                    {t('Notifikasi Aktivitas', 'Activity Notifications')}
                                </span>
                                {unreadCount > 0 && (
                                    <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                                        {unreadCount} {t('Baru', 'New')}
                                    </Badge>
                                )}
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    type="button"
                                    onClick={handleMarkAllRead}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 cursor-pointer"
                                >
                                    <CheckCheck className="size-3.5" />
                                    {t('Tandai Dibaca', 'Mark all read')}
                                </button>
                            )}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="m-0" />
                        <div className="max-h-96 overflow-y-auto divide-y divide-border">
                            {recentNotifications.length === 0 ? (
                                <div className="py-8 px-4 text-center text-xs text-muted-foreground">
                                    {t(
                                        'Belum ada notifikasi pengiriman data baru.',
                                        'No notifications yet.',
                                    )}
                                </div>
                            ) : (
                                recentNotifications.map((notif) => (
                                    <button
                                        key={notif.id}
                                        type="button"
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`w-full text-left px-4 py-3 transition-colors hover:bg-muted/60 flex items-start gap-3 cursor-pointer ${
                                            !notif.is_read
                                                ? 'bg-blue-50/50 dark:bg-blue-950/20'
                                                : ''
                                        }`}
                                    >
                                        <span
                                            className={`mt-1.5 size-2 shrink-0 rounded-full ${
                                                !notif.is_read
                                                    ? 'bg-blue-600'
                                                    : 'bg-transparent'
                                            }`}
                                        />
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-xs font-bold text-foreground leading-snug">
                                                    {notif.title}
                                                </p>
                                                <ExternalLink className="size-3 shrink-0 text-muted-foreground mt-0.5" />
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                                {notif.message}
                                            </p>
                                            <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 pt-0.5">
                                                <span className="font-medium">
                                                    {t('Dari:', 'From:')} {notif.sender_name}
                                                </span>
                                                <span>{notif.created_at}</span>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
