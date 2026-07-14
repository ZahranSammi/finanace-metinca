import { usePage } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import * as React from 'react';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function FlashMessages() {
    const { flash } = usePage().props;
    const [visible, setVisible] = React.useState(true);

    // Reset visibility when flash messages change
    React.useEffect(() => {
        if (flash?.success || flash?.error) {
            setVisible(true);
        }
    }, [flash]);

    if (!visible) return null;

    if (flash?.success) {
        return (
            <div className="px-6 pt-6 -mb-2">
                <Alert className="border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="!text-green-600 dark:!text-green-400" />
                    <AlertTitle>Berhasil!</AlertTitle>
                    <AlertDescription>{flash.success}</AlertDescription>
                    <AlertAction>
                        <Button variant="ghost" size="icon" onClick={() => setVisible(false)} className="h-6 w-6 hover:bg-green-500/20">
                            <X className="size-4" />
                        </Button>
                    </AlertAction>
                </Alert>
            </div>
        );
    }

    if (flash?.error) {
        return (
            <div className="px-6 pt-6 -mb-2">
                <Alert variant="destructive">
                    <AlertCircle />
                    <AlertTitle>Terjadi Kesalahan</AlertTitle>
                    <AlertDescription>{flash.error}</AlertDescription>
                    <AlertAction>
                        <Button variant="ghost" size="icon" onClick={() => setVisible(false)} className="h-6 w-6 hover:bg-destructive/20 text-destructive-foreground">
                            <X className="size-4" />
                        </Button>
                    </AlertAction>
                </Alert>
            </div>
        );
    }

    return null;
}
