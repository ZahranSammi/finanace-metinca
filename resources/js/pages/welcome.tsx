import { Head, Link, usePage } from '@inertiajs/react';
import { ShoppingCart, BarChart3, GitFork, Package, Users, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useLanguage } from '@/components/language-context';
import { dashboard, login, register } from '@/routes';

export default function Welcome() {
    const { auth } = usePage().props;
    const { t } = useLanguage();

    return (
        <>
            <Head title={t('Portal Penjualan - Edisi Enterprise', 'Sales Portal - Enterprise Edition')} />
            <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 transition-colors duration-300">
                {/* Header Navigation */}
                <header className="border-b border-slate-200/80 dark:border-zinc-800/80 backdrop-blur sticky top-0 bg-white/70 dark:bg-zinc-950/70 z-50">
                    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="bg-primary text-primary-foreground size-9 rounded-lg flex items-center justify-center font-bold text-lg shadow-md shadow-primary/20">
                                S
                            </div>
                            <span className="font-bold text-lg tracking-tight">Sales Portal <span className="text-xs text-primary font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 ml-1">Enterprise</span></span>
                        </div>
                        <nav className="flex items-center gap-4">
                            {auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className="inline-flex items-center justify-center gap-1 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/95 transition-all shadow-sm shadow-primary/10"
                                >
                                    {t('Masuk ke Dasbor', 'Go to Dashboard')} <ArrowRight className="size-4" />
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className="text-sm font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-50 transition-colors"
                                    >
                                        {t('Masuk', 'Log in')}
                                    </Link>
                                    <Link
                                        href={register()}
                                        className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/95 transition-all shadow-sm shadow-primary/10"
                                    >
                                        {t('Daftar', 'Register')}
                                    </Link>
                                </>
                            )}
                        </nav>
                    </div>
                </header>

                {/* Hero Section */}
                <main className="max-w-7xl mx-auto px-6 pt-16 pb-24">
                    <div className="text-center max-w-3xl mx-auto space-y-6">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide border border-primary/20">
                            <Sparkles className="size-3.5" /> {t('Memperkenalkan Sales Portal v2.0', 'Introducing Sales Portal v2.0')}
                        </div>
                        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-primary to-slate-900 dark:from-zinc-100 dark:via-primary dark:to-zinc-100 bg-clip-text text-transparent pb-1">
                            {t('Sistem Informasi Penjualan Modern', 'Modern Sales Information System')}
                        </h1>
                        <p className="text-lg sm:text-xl text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                            {t('Sederhanakan manajemen pesanan Anda, lacak prospek melalui kanban pipeline, pantau tingkat stok inventaris, dan tinjau metrik perwakilan penjualan utama dalam satu portal terpadu.', 'Streamline your order management, track deals through pipeline kanban, monitor inventory stock levels, and review key representative metrics all in one unified portal.')}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                            {auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/15"
                                >
                                    {t('Masuk ke Dasbor', 'Enter Dashboard')}
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={register()}
                                        className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/15"
                                    >
                                        {t('Mulai Sekarang', 'Get Started Now')}
                                    </Link>
                                    <Link
                                        href={login()}
                                        className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-base font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-all"
                                    >
                                        {t('Masuk', 'Sign In')}
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Features Grid Showcase */}
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 pt-24">
                        <div className="bg-white dark:bg-zinc-900/50 p-8 rounded-2xl border border-slate-200/60 dark:border-zinc-800/60 hover:shadow-lg transition-all duration-300 group">
                            <div className="bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 size-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <ShoppingCart className="size-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{t('Portal Entri Pesanan', 'Order Entry Portal')}</h3>
                            <p className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed">
                                {t('Proses pembelian pelanggan baru dengan cepat. Validasi faktur otomatis, kalkulasi pajak, dan ekspor laporan CSV yang mudah.', 'Process new customer purchases quickly. Automatic invoice validation, tax calculations, and easy CSV exports.')}
                            </p>
                        </div>

                        <div className="bg-white dark:bg-zinc-900/50 p-8 rounded-2xl border border-slate-200/60 dark:border-zinc-800/60 hover:shadow-lg transition-all duration-300 group">
                            <div className="bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 size-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <GitFork className="size-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{t('Pipeline Penjualan Kanban', 'Sales Pipeline Board')}</h3>
                            <p className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed">
                                {t('Tahapan Kanban visual untuk memajukan prospek kesepakatan dari tahap awal hingga kemenangan closed-won. Lacak nilai total kontrak.', 'Kanban stages layout to advance prospect leads from discovery to closed wins. Keep track of total deal values.')}
                            </p>
                        </div>

                        <div className="bg-white dark:bg-zinc-900/50 p-8 rounded-2xl border border-slate-200/60 dark:border-zinc-800/60 hover:shadow-lg transition-all duration-300 group">
                            <div className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 size-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Package className="size-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{t('Manajemen Inventaris', 'Inventory Management')}</h3>
                            <p className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed">
                                {t('Lacak persediaan produk secara real-time. Peringatan stok kritis otomatis sebelum persediaan barang habis.', 'Real-time catalog items tracking. Automated stock status warnings alerts before items drop below critical limits.')}
                            </p>
                        </div>

                        <div className="bg-white dark:bg-zinc-900/50 p-8 rounded-2xl border border-slate-200/60 dark:border-zinc-800/60 hover:shadow-lg transition-all duration-300 group">
                            <div className="bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 size-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Users className="size-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{t('Direktori Pelanggan', 'Customer Directories')}</h3>
                            <p className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed">
                                {t('Data statistik pembelian pelanggan, kontak email aktif, dan nilai total pembelian sepanjang masa dari setiap klien.', 'Lifetime statistics of user purchase counts, contact emails, and cumulative lifetime total expenditures values.')}
                            </p>
                        </div>

                        <div className="bg-white dark:bg-zinc-900/50 p-8 rounded-2xl border border-slate-200/60 dark:border-zinc-800/60 hover:shadow-lg transition-all duration-300 group">
                            <div className="bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 size-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <BarChart3 className="size-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{t('Analisis Performa', 'Performance Analytics')}</h3>
                            <p className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed">
                                {t('Grafik performa sales rep serta daftar produk terpopuler berdasarkan kuantitas dan total nilai pendapatan bruto.', 'Detail leaderboard standings charts of active representatives sales values and popular products quantity margins.')}
                            </p>
                        </div>

                        <div className="bg-white dark:bg-zinc-900/50 p-8 rounded-2xl border border-slate-200/60 dark:border-zinc-800/60 hover:shadow-lg transition-all duration-300 group">
                            <div className="bg-sky-100 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 size-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <ShieldCheck className="size-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{t('Kontrol Akses Keamanan', 'Role & Access Control')}</h3>
                            <p className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed">
                                {t('Batasi akses halaman berdasarkan peran admin atau sales rep. Keamanan sistem login terenkripsi untuk setiap aktivitas transaksi.', 'Restrict features for sales representatives or admins. Ensure secure, validated audit trails for every submitted order.')}
                            </p>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="border-t border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 py-8">
                    <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-zinc-500">
                        <span>&copy; 2026 Sales Portal. All rights reserved.</span>
                        <div className="flex gap-6">
                            <a href="#" className="hover:text-slate-900 dark:hover:text-zinc-50 transition-colors">{t('Kebijakan Privasi', 'Privacy Policy')}</a>
                            <a href="#" className="hover:text-slate-900 dark:hover:text-zinc-50 transition-colors">{t('Syarat Layanan', 'Terms of Service')}</a>
                            <a href="#" className="hover:text-slate-900 dark:hover:text-zinc-50 transition-colors">{t('Hubungi Dukungan', 'Contact Support')}</a>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
