<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Support\OrderStatus;
use App\Support\Tax;
use Illuminate\Support\Facades\DB;

/**
 * Encapsulates order creation/update so controllers stay thin and the security
 * invariants live in one place:
 *   - the sales rep is taken from the authenticated user, never the request;
 *   - unit prices are resolved from the product catalogue, never trusted from
 *     the client (prevents price tampering / A08).
 */
class OrderService
{
    /**
     * @param  array{customerId: mixed, items: array<int, array{productId: mixed, quantity: mixed}>}  $data
     */
    public function create(User $salesRep, array $data): Order
    {
        return DB::transaction(function () use ($salesRep, $data) {
            $lines = $this->resolveLines($data['items']);

            $order = Order::create([
                'id' => $this->generateId(),
                'date_raised' => now(),
                'customer_id' => $data['customerId'],
                'sales_rep' => $salesRep->name,
                'user_id' => $salesRep->id,
                'status' => OrderStatus::PENDING,
                'currency' => $data['currency'] ?? 'IDR',
                'exchange_rate' => $data['exchangeRate'] ?? 1,
                'total_amount' => $this->total($lines),
            ]);

            $this->syncItems($order, $lines);

            return $order;
        });
    }

    /**
     * @param  array{customerId: mixed, items: array<int, array{productId: mixed, quantity: mixed}>}  $data
     */
    public function update(Order $order, User $salesRep, array $data): Order
    {
        return DB::transaction(function () use ($order, $salesRep, $data) {
            $lines = $this->resolveLines($data['items']);

            $order->update([
                'customer_id' => $data['customerId'],
                'sales_rep' => $salesRep->name,
                'user_id' => $salesRep->id,
                'currency' => $data['currency'] ?? $order->currency,
                'exchange_rate' => $data['exchangeRate'] ?? $order->exchange_rate,
                'total_amount' => $this->total($lines),
            ]);

            $order->items()->delete();
            $this->syncItems($order, $lines);

            return $order;
        });
    }

    /**
     * Resolve each line's authoritative unit price from the product record.
     *
     * @param  array<int, array{productId: mixed, quantity: mixed}>  $items
     * @return array<int, array{product_id: int, quantity: int, price: float}>
     */
    private function resolveLines(array $items): array
    {
        $productIds = collect($items)->pluck('productId')->unique();
        $prices = Product::whereIn('id', $productIds)->pluck('price', 'id');

        return collect($items)->map(fn ($item) => [
            'product_id' => (int) $item['productId'],
            'quantity' => (int) $item['quantity'],
            'price' => (float) $prices[(int) $item['productId']],
        ])->all();
    }

    /**
     * @param  array<int, array{product_id: int, quantity: int, price: float}>  $lines
     */
    private function total(array $lines): float
    {
        $subtotal = collect($lines)->sum(fn ($line) => $line['price'] * $line['quantity']);

        return round($subtotal + Tax::on($subtotal), 2);
    }

    /**
     * @param  array<int, array{product_id: int, quantity: int, price: float}>  $lines
     */
    private function syncItems(Order $order, array $lines): void
    {
        foreach ($lines as $line) {
            OrderItem::create([
                'order_id' => $order->id,
                'product_id' => $line['product_id'],
                'quantity' => $line['quantity'],
                'price' => $line['price'],
            ]);
        }
    }

    /**
     * Human-friendly, collision-checked order id using a CSPRNG.
     */
    private function generateId(): string
    {
        do {
            $id = sprintf('ORD-%03d-%s%d', random_int(100, 999), chr(random_int(65, 90)), random_int(1, 9));
        } while (Order::whereKey($id)->exists());

        return $id;
    }
}
