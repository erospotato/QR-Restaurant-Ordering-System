<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $guarded = [];
    protected $casts = [
        'is_addon' => 'boolean',
        'paid_at' => 'datetime',
        'total' => 'float',
    ];

    public function diningTable() { return $this->belongsTo(DiningTable::class); }
    public function items() { return $this->hasMany(OrderItem::class); }

    public function toApi(): array
    {
        return [
            'id' => $this->id,
            'table' => $this->diningTable ? $this->diningTable->number : null,
            'table_id' => $this->dining_table_id,
            'status' => $this->status,
            'addon' => $this->is_addon,
            'total' => (float) $this->total,
            'notes' => $this->notes,
            'payment_method' => $this->payment_method,
            'paid_at' => $this->paid_at ? $this->paid_at->toIso8601String() : null,
            'ts' => $this->created_at ? $this->created_at->timestamp * 1000 : 0,
            'items' => $this->items->map(fn ($i) => [
                'id' => $i->id,
                'menu_item_id' => $i->menu_item_id,
                'name' => $i->name,
                'price' => (float) $i->price,
                'qty' => (int) $i->quantity,
                'notes' => $i->notes,
            ])->all(),
        ];
    }
}
