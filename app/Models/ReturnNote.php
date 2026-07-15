<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReturnNote extends Model
{
    protected $fillable = [
        'order_id', 
        'type', 
        'status', 
        'total_amount', 
        'reason', 
        'date'
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function items()
    {
        return $this->hasMany(ReturnNoteItem::class);
    }

    protected function casts(): array
    {
        return [
            'date' => 'date',
        ];
    }
}
