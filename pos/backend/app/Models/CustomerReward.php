<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerReward extends Model
{
    protected $fillable = [
        'customer_id',
        'reward_id',
        'status', // available, redeemed, expired, cancelled
        'issued_at',
        'expires_at',
        'redeemed_at',
        'order_id',
    ];

    protected $casts = [
        'issued_at' => 'datetime',
        'expires_at' => 'datetime',
        'redeemed_at' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function reward()
    {
        return $this->belongsTo(Reward::class, 'reward_id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }
}
