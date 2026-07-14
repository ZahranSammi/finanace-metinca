import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { home } from '@/routes';

export default function AuthCardLayout({
    children,
    title,
    description,
}: PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
}>) {
    return (
        <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-background p-6 md:p-10">
            {/* Modern animated background effects */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-400/10 via-background to-background dark:from-sky-900/20" />
            <div
                aria-hidden
                className="absolute -top-32 -right-32 z-0 size-[500px] rounded-full bg-blue-500/10 blur-[100px] dark:bg-blue-600/10"
            />
            <div
                aria-hidden
                className="absolute -bottom-32 -left-32 z-0 size-[500px] rounded-full bg-indigo-500/10 blur-[100px] dark:bg-indigo-600/10"
            />

            <div className="relative z-10 flex w-full max-w-md flex-col gap-6">
                <Link
                    href={home()}
                    className="flex items-center gap-2 self-center font-medium transition-transform duration-300 hover:scale-105"
                >
                    <div className="flex h-16 w-16 items-center justify-center drop-shadow-md">
                        <AppLogoIcon className="size-16 object-contain" />
                    </div>
                </Link>

                <div className="flex flex-col gap-6">
                    <Card className="overflow-hidden rounded-2xl border border-white/20 bg-white/70 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/60">
                        <CardHeader className="px-10 pt-8 pb-0 text-center">
                            <CardTitle className="text-2xl font-bold tracking-tight">
                                {title}
                            </CardTitle>
                            <CardDescription className="text-muted-foreground/80">
                                {description}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-10 py-8">
                            {children}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
