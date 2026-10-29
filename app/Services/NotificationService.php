<?php

namespace App\Services;

use App\Models\AppNotification;
use App\Models\User;

class NotificationService
{
    /**
     * Send an in-app notification to a specific user.
     */
    public static function notifyUser(
        int $recipientUserId,
        string $title,
        string $message,
        ?string $actionUrl = null,
        string $type = 'info',
        ?int $senderId = null
    ): ?AppNotification {
        if ($senderId !== null && $recipientUserId === $senderId) {
            // Still allow if explicitly needed, or skip self-notification when broadcasting
        }

        return AppNotification::create([
            'user_id' => $recipientUserId,
            'sender_id' => $senderId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'action_url' => $actionUrl,
            'is_read' => false,
        ]);
    }

    /**
     * Broadcast an in-app notification to all users having the given role(s).
     *
     * @param string|array<string> $roles
     */
    public static function notifyRole(
        string|array $roles,
        string $title,
        string $message,
        ?string $actionUrl = null,
        string $type = 'info',
        ?int $senderId = null
    ): void {
        $roleList = is_array($roles) ? $roles : [$roles];

        $users = User::whereIn('role', $roleList)
            ->when($senderId, fn ($q) => $q->where('id', '!=', $senderId))
            ->get();

        foreach ($users as $user) {
            AppNotification::create([
                'user_id' => $user->id,
                'sender_id' => $senderId,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'action_url' => $actionUrl,
                'is_read' => false,
            ]);
        }
    }
}

