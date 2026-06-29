<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'invoice_type',
        'subtotal',
        'tax_percent',
        'tax_amount',
        'dp_amount',
        'total_amount',
        'status',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
