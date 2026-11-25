<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoyaltyTransaction extends Model
{
    protected $fillable = [
        'customer_id',
        'order_id',
        'type', // earned, redeemed, expired, refund, adjustment, reversed, bonus
        'points',
        'balance_after',
        'description',
        'expires_at',
    ];

    protected $casts = [
        'points' => 'float',
        'balance_after' => 'float',
        'expires_at' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }
}
