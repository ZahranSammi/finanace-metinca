<?php

namespace App\Http\Middleware;

use App\Models\AppNotification;
use App\Models\Invoice;
use App\Models\ManagerReport;
use App\Models\PurchaseOrder;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        $notificationsData = [
            'unread_count' => 0,
            'recent' => [],
        ];

        $sidebarBadges = [
            'accounting_inbox' => 0,
            'manager_reports' => 0,
            'purchase_orders' => 0,
        ];

        if ($user) {
            $notificationsData['unread_count'] = AppNotification::where('user_id', $user->id)
                ->where('is_read', false)
                ->count();

            $notificationsData['recent'] = AppNotification::with('sender')
                ->where('user_id', $user->id)
                ->orderBy('created_at', 'desc')
                ->limit(15)
                ->get()
                ->map(fn (AppNotification $n) => [
                    'id' => $n->id,
                    'type' => $n->type,
                    'title' => $n->title,
                    'message' => $n->message,
                    'action_url' => $n->action_url,
                    'is_read' => (bool) $n->is_read,
                    'sender_name' => $n->sender?->name ?? 'Sistem',
                    'created_at' => $n->created_at?->diffForHumans() ?? '-',
                ])
                ->values()
                ->all();

            $sidebarBadges['accounting_inbox'] = Invoice::where('status', 'submitted')->count();
            $sidebarBadges['manager_reports'] = ManagerReport::where('status', 'submitted')->count();
            $sidebarBadges['purchase_orders'] = PurchaseOrder::where('status', 'Submitted')->count();
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
            ],
            'notifications' => $notificationsData,
            'sidebar_badges' => $sidebarBadges,
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ];
    }
}
