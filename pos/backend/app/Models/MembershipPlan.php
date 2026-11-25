<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MembershipPlan extends Model
{
    protected $fillable = [
        'name',
        'price',
        'duration_months',
        'description',
        'is_active',
    ];

    protected $casts = [
        'price' => 'float',
        'duration_months' => 'integer',
        'is_active' => 'boolean',
    ];

    public function memberships()
    {
        return $this->hasMany(CustomerMembership::class, 'plan_id');
    }
}
