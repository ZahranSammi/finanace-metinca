import { Head } from '@inertiajs/react';
import { Clock } from 'lucide-react';
import { useLanguage } from '@/components/language-context';
import { Card, CardContent } from '@/components/ui/card';

export default function PendingApproval() {
    const { t } = useLanguage();

    return (
        <>
            <Head title={t('Menunggu Persetujuan', 'Awaiting Approval')} />
            <div className="flex flex-1 flex-col items-center justify-center p-6">
                <Card className="max-w-md border border-sidebar-border/70 shadow-sm">
                    <CardContent className="flex flex-col items-center gap-3 text-center py-10">
                        <div className="flex size-14 items-center justify-center rounded-full bg-yellow-500/10">
                            <Clock className="text-yellow-500 size-7" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {t('Akun Anda menunggu persetujuan', 'Your account is awaiting approval')}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {t(
                                'Administrator harus memberikan peran kepada akun Anda sebelum Anda dapat mengakses portal penjualan.',
                                'An administrator must assign your account a role before you can access the sales portal.',
                            )}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
