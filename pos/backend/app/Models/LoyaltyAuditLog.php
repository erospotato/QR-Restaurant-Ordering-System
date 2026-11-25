<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoyaltyAuditLog extends Model
{
    protected $fillable = [
        'user_id',
        'customer_id',
        'action',
        'old_values',
        'new_values',
        'reason',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
