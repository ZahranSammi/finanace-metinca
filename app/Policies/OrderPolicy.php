<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;
use App\Support\OrderStatus;
use App\Support\UserRole;

/**
 * Object-level authorization for orders. Auto-discovered by Laravel via the
 * App\Models\Order <-> App\Policies\OrderPolicy naming convention.
 *
 * Closes the IDOR where any sales rep could mutate any order by id: a rep may
 * only act on orders they own; managers may act on any order.
 */
class OrderPolicy
{
    private function owns(User $user, Order $order): bool
    {
        // Ownership is the user_id FK, never the sales_rep display name:
        // names are mutable (Settings > Profile) and non-unique, so a rep
        // could rename themselves to hijack another rep's orders.
        return $user->role === UserRole::MANAGER
            || ($order->user_id !== null && $order->user_id === $user->id);
    }

    private function isEditable(Order $order): bool
    {
        return in_array($order->status, OrderStatus::EDITABLE, true);
    }

    public function update(User $user, Order $order): bool
    {
        return $this->owns($user, $order) && $this->isEditable($order);
    }

    public function delete(User $user, Order $order): bool
    {
        return $this->owns($user, $order) && $this->isEditable($order);
    }

    /**
     * Submit only checks ownership; the controller keeps the friendly
     * status-specific message for already-submitted orders.
     */
    public function submit(User $user, Order $order): bool
    {
        return $this->owns($user, $order);
    }
}
