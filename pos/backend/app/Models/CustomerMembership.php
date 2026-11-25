<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerMembership extends Model
{
    protected $fillable = [
        'customer_id',
        'plan_id',
        'start_date',
        'end_date',
        'amount_paid',
        'status', // active, expired, cancelled
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'amount_paid' => 'float',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function plan()
    {
        return $this->belongsTo(MembershipPlan::class, 'plan_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'active' && $this->end_date && $this->end_date->isFuture();
    }
}
