<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReturnNoteItem extends Model
{
    protected $fillable = ['return_note_id', 'product_id', 'quantity', 'price_per_item'];

    public function returnNote()
    {
        return $this->belongsTo(ReturnNote::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
