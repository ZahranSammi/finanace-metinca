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
    return (
        <LanguageProvider>
            <CurrencyProvider>
                <AppLayoutTemplate breadcrumbs={breadcrumbs}>
                    {children}
                </AppLayoutTemplate>
            </CurrencyProvider>
        </LanguageProvider>
    );
}
