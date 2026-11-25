<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Reward extends Model
{
    protected $fillable = [
        'name',
        'description',
        'reward_type', // discount, free_item, bonus_points
        'points_required',
        'reward_value',
        'is_active',
    ];

    protected $casts = [
        'points_required' => 'float',
        'reward_value' => 'float',
        'is_active' => 'boolean',
    ];

    public function customerRewards()
    {
        return $this->hasMany(CustomerReward::class, 'reward_id');
    }
}
