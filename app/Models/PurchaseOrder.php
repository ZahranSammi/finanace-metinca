<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseOrder extends Model
{
    protected $fillable = ['supplier_id', 'plant_id', 'date', 'total_amount', 'status'];

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

    protected function casts(): array
    {
        return [
            'date' => 'date',
        ];
    }
}
