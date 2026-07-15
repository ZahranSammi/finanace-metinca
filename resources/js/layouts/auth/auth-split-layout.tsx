import { Link } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="relative grid h-dvh flex-col items-center justify-center bg-background px-8 sm:px-0 lg:max-w-none lg:grid-cols-2 lg:px-0">
            <div className="relative hidden h-full flex-col overflow-hidden text-white lg:flex">
                <img
                    src="/metinca-building.webp"
                    alt="Metinca Prima Industri"
                    className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/60 to-zinc-950/20" />
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/40 via-transparent to-transparent" />

                <div
                    aria-hidden
                    className="absolute -top-24 -right-24 size-96 rounded-full bg-sky-500/20 blur-3xl"
                />
                <div
                    aria-hidden
                    className="absolute -bottom-32 -left-16 size-96 rounded-full bg-blue-500/10 blur-3xl"
                />

                <Link
                    href={home()}
                    className="relative z-20 flex items-center p-10 text-2xl font-bold tracking-tight text-white drop-shadow-md"
                >
                    <AppLogoIcon className="h-16 w-auto object-contain transition-transform duration-300 hover:scale-105" />
                </Link>

                <div className="relative z-20 mt-auto flex flex-col gap-4 p-10">
                    <h2 className="max-w-md text-3xl font-semibold text-balance">
                        Kelola bisnis Anda dengan lebih percaya diri.
                    </h2>
                    <p className="max-w-sm text-sm text-balance text-white/70">
                        Satu platform terpadu untuk memantau penjualan,
                        keuangan, dan operasional perusahaan secara
                        real-time.
                    </p>
                </div>
            </div>
            <div className="w-full lg:p-8">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    <Link
                        href={home()}
                        className="relative z-20 flex items-center justify-center gap-2 lg:hidden"
                    >
                        <AppLogoIcon className="h-16 object-contain sm:h-20 transition-transform duration-300 hover:scale-105" />
                    </Link>
                    <div className="flex flex-col items-start gap-2 text-left sm:items-center sm:text-center">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {title}
                        </h1>
                        <p className="text-sm text-balance text-muted-foreground">
                            {description}
                        </p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
