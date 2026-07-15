<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReturnNote extends Model
{
    protected $fillable = ['type', 'reference_id', 'customer_id', 'date'];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
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
