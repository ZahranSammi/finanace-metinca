import { Head } from '@inertiajs/react';
import { User, ArrowRight } from 'lucide-react';
import * as React from 'react';
import { useCurrency } from '@/components/currency-context';
import { useLanguage } from '@/components/language-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Deal {
    id: string;
    title: string;
    company: string;
    value: number;
    rep: string;
}

interface PipelineData {
    prospect: Deal[];
    proposal: Deal[];
    negotiation: Deal[];
    closed_won: Deal[];
}

interface PipelineProps {
    pipeline: PipelineData;
}

type StageKey = 'prospect' | 'proposal' | 'negotiation' | 'closed_won';

export default function Pipeline({ pipeline: initialPipeline }: PipelineProps) {
    const { formatPrice } = useCurrency();
    const { t } = useLanguage();
    const [pipeline, setPipeline] = React.useState<PipelineData>(initialPipeline);

    const STAGE_LABELS: Record<StageKey, { label: string; color: string }> = React.useMemo(() => ({
        prospect: { label: t('Prospek / Penjajakan', 'Prospect / Discovery'), color: 'border-t-blue-500' },
        proposal: { label: t('Proposal Terkirim', 'Proposal Sent'), color: 'border-t-purple-500' },
        negotiation: { label: t('Negosiasi', 'Negotiation'), color: 'border-t-yellow-500' },
        closed_won: { label: t('Kesepakatan Selesai', 'Closed Won'), color: 'border-t-green-500' },
    }), [t]);

    const moveDeal = (dealId: string, currentStage: StageKey, direction: 'left' | 'right') => {
        const stages: StageKey[] = ['prospect', 'proposal', 'negotiation', 'closed_won'];
        const currentIdx = stages.indexOf(currentStage);
        const nextIdx = currentIdx + (direction === 'right' ? 1 : -1);

        if (nextIdx < 0 || nextIdx >= stages.length) {
return;
}

        const targetStage = stages[nextIdx];
        const dealToMove = pipeline[currentStage].find(d => d.id === dealId);
        
        if (!dealToMove) {
return;
}

        setPipeline(prev => ({
            ...prev,
            [currentStage]: prev[currentStage].filter(d => d.id !== dealId),
            [targetStage]: [...prev[targetStage], dealToMove]
        }));
    };

    // Calculate pipeline value summaries
    const stageSum = React.useCallback((stage: StageKey) => {
        return pipeline[stage].reduce((sum, d) => sum + d.value, 0);
    }, [pipeline]);

    const totalPipelineValue = React.useMemo(() => {
        return (['prospect', 'proposal', 'negotiation', 'closed_won'] as StageKey[])
            .reduce((sum, stage) => sum + stageSum(stage), 0);
    }, [stageSum]);

    return (
        <>
            <Head title={t('Pipeline Penjualan', 'Sales Pipeline')} />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{t('Pipeline Penjualan', 'Sales Pipeline')}</h1>
                        <p className="text-muted-foreground text-sm">{t('Visualisasikan, kembangkan, dan kelola kesepakatan penjualan di setiap tahap.', 'Visualize, advance, and manage deals across sales stages.')}</p>
                    </div>
                    <div className="flex items-center gap-4 bg-muted px-4 py-2 rounded-lg border border-sidebar-border">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('Nilai Total:', 'Total Value:')}</span>
                        <span className="text-lg font-bold text-primary">{formatPrice(totalPipelineValue)}</span>
                    </div>
                </div>

                {/* Kanban Board Grid */}
                <div className="grid gap-6 md:grid-cols-4 items-start">
                    {(['prospect', 'proposal', 'negotiation', 'closed_won'] as StageKey[]).map((stage) => {
                        const stageInfo = STAGE_LABELS[stage];
                        const deals = pipeline[stage];
                        const count = deals.length;
                        const value = stageSum(stage);

                        return (
                            <div key={stage} className="flex flex-col gap-4 bg-neutral-50 dark:bg-neutral-900/40 p-4 rounded-xl border border-sidebar-border/60 min-h-[500px]">
                                {/* Stage Header */}
                                <div className={`border-t-4 ${stageInfo.color} pt-2`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <h3 className="font-semibold text-sm leading-none">{stageInfo.label}</h3>
                                        <Badge variant="outline">{count}</Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground font-semibold">
                                        {formatPrice(value)}
                                    </span>
                                </div>

                                {/* Deal Cards */}
                                <div className="flex flex-col gap-3">
                                    {deals.length === 0 ? (
                                        <div className="text-center py-8 text-xs text-muted-foreground border-2 border-dashed rounded-lg border-sidebar-border/40">
                                            {t('Tidak ada kesepakatan aktif', 'No active deals')}
                                        </div>
                                    ) : (
                                        deals.map((deal) => (
                                            <Card key={deal.id} className="border border-sidebar-border/70 shadow-sm hover:shadow transition-shadow">
                                                <CardHeader className="p-3 pb-2 space-y-1">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <span className="text-xs font-medium text-muted-foreground">{deal.company}</span>
                                                        <Badge variant="secondary" className="text-[10px] py-0">{deal.id}</Badge>
                                                    </div>
                                                    <CardTitle className="text-sm font-semibold leading-tight">{deal.title}</CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-3 pt-0">
                                                    <div className="flex justify-between items-center border-t pt-2 mt-2">
                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                            <User className="size-3" />
                                                            <span>{deal.rep}</span>
                                                        </div>
                                                        <span className="text-sm font-bold text-primary">
                                                            {formatPrice(deal.value)}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Move Action Controls */}
                                                    <div className="flex justify-end gap-1 mt-3 pt-2 border-t border-dashed">
                                                        {stage !== 'prospect' && (
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="h-6 px-2 text-[10px]"
                                                                onClick={() => moveDeal(deal.id, stage, 'left')}
                                                            >
                                                                {t('Kembali', 'Back')}
                                                            </Button>
                                                        )}
                                                        {stage !== 'closed_won' && (
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="h-6 px-2 text-[10px] text-primary"
                                                                onClick={() => moveDeal(deal.id, stage, 'right')}
                                                            >
                                                                {t('Lanjut', 'Advance')} <ArrowRight className="size-3 ml-1" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

Pipeline.layout = {
    breadcrumbs: [
        {
            title: 'Sales Pipeline',
            href: '/pipeline',
        },
    ],
};
