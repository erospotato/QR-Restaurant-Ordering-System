<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiningTable extends Model
{
    protected $guarded = [];
    protected $casts = [
        'number' => 'integer',
        'capacity' => 'integer',
    ];

    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
