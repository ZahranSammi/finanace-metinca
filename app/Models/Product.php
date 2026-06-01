<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = ['code', 'name', 'category', 'unit', 'stock', 'min', 'location', 'price'];

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }
}
