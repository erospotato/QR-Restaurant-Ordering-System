<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ingredient extends Model
{
    protected $guarded = [];
    protected $casts = [
        'quantity' => 'float',
        'min_threshold' => 'float',
        'cost_per_unit' => 'float',
    ];
    protected $appends = ['status'];

    public function getStatusAttribute(): string
    {
        if ($this->quantity <= 0) return 'out_of_stock';
        if ($this->quantity <= $this->min_threshold) return 'low_stock';
        return 'in_stock';
    }

    public function alerts()
    {
        return $this->hasMany(StockAlert::class);
    }
}
