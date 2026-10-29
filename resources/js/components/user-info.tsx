import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import type { User } from '@/types';

function getRoleLabel(role?: string): string {
    switch (role) {
        case 'manager':
            return 'Manager Accounting';
        case 'staff_accounting':
            return 'Staff Accounting';
        case 'staff_sales':
            return 'Staff Sales';
        default:
            return 'Staff';
    }
}

export function UserInfo({
    user,
    showEmail = false,
}: {
    user: User;
    showEmail?: boolean;
}) {
    const getInitials = useInitials();
    const role = (user as any)?.role as string | undefined;
    const roleLabel = getRoleLabel(role);
    const displayName =
        user.name === 'Manager User' ? 'Manager Accounting' : user.name;

    return (
        <>
            <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                <AvatarImage src={user.avatar} alt={displayName} />
                <AvatarFallback className="rounded-lg bg-blue-600 text-white font-semibold dark:bg-blue-500">
                    {getInitials(displayName)}
                </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">{displayName}</span>
                <span className="truncate text-[11px] font-medium text-blue-600 dark:text-blue-400">
                    {roleLabel}
                </span>
                {showEmail && (
                    <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                    </span>
                )}
            </div>
        </>
    );
}
