import { CurrencyProvider } from '@/components/currency-context';
import { LanguageProvider } from '@/components/language-context';
import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import type { BreadcrumbItem } from '@/types';

export default function AppLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    const effectiveBreadcrumbs: BreadcrumbItem[] =
        breadcrumbs && breadcrumbs.length > 0
            ? breadcrumbs
            : (((children as any)?.type?.layout?.breadcrumbs as BreadcrumbItem[]) ?? []);

    return (
        <LanguageProvider>
            <CurrencyProvider>
                <AppLayoutTemplate breadcrumbs={effectiveBreadcrumbs}>
                    {children}
                </AppLayoutTemplate>
            </CurrencyProvider>
        </LanguageProvider>
    );
}
