<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockAlert extends Model
{
    protected $guarded = [];
    protected $casts = [
        'is_resolved' => 'boolean',
    ];

    public function ingredient()
    {
        return $this->belongsTo(Ingredient::class);
    }
}
