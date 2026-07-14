<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'date_raised',
        'customer_id',
        'sales_rep',
        'user_id',
        'status',
        'total_amount',
        'validation_notes',
        'submitted_at',
        'validated_at',
        'validated_by'
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * The sales rep who owns this order. Authorization must use this FK,
     * never the sales_rep display name (names are mutable and non-unique).
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function invoice()
    {
        return $this->hasOne(Invoice::class);
    }

    public function validatedBy()
    {
        return $this->belongsTo(User::class, 'validated_by');
    }

    protected function casts(): array
    {
        return [
            'date_raised' => 'datetime',
            'submitted_at' => 'datetime',
            'validated_at' => 'datetime',
        ];
    }
}
