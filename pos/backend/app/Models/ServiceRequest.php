<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceRequest extends Model
{
    protected $guarded = [];
    protected $casts = [
        'table_number' => 'integer',
        'is_resolved' => 'boolean',
    ];

    public function diningTable()
    {
        return $this->belongsTo(DiningTable::class);
    }
}
