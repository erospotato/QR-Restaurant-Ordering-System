<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BirthdayReward extends Model
{
    protected $fillable = [
        'customer_id',
        'year',
        'reward_description',
        'status', // available, redeemed, expired
        'issued_at',
        'expires_at',
        'redeemed_at',
    ];

    protected $casts = [
        'year' => 'integer',
        'issued_at' => 'datetime',
        'expires_at' => 'datetime',
        'redeemed_at' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }
}
