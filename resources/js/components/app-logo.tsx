import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <AppLogoIcon className="size-10 object-contain shrink-0" />
            <div className="ml-1 grid flex-1 text-left text-sm group-data-[collapsible=icon]:hidden">
                <span className="mb-0.5 truncate leading-tight font-semibold">
                    Metinca Monitoring
                </span>
                <span className="truncate text-xs text-muted-foreground">
                    Enterprise IMS
                </span>
            </div>
        </>
    );
}
