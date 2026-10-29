<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseOrder extends Model
{
    protected $fillable = [
        'po_number',
        'supplier_id',
        'plant_id',
        'date',
        'expected_date',
        'total_amount',
        'status',
        'notes',
        'created_by',
        'approved_by',
        'approved_at',
        'rejection_notes',
        'payment_status',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function plant()
    {
        return $this->belongsTo(Plant::class);
    }

    public function items()
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'expected_date' => 'date',
            'approved_at' => 'datetime',
        ];
    }
}
