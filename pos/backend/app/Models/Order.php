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
    public function customer() { return $this->belongsTo(Customer::class, 'customer_id'); }

    public function toApi(): array
    {
        $member = null;
        if ($this->customer_id || $this->member_id) {
            $cid = $this->customer_id ?: $this->member_id;
            $c = Customer::find($cid);
            if ($c) {
                $member = $c->toApi();
            }
        }

        return [
            'id' => $this->id,
            'table' => $this->diningTable ? $this->diningTable->number : null,
            'table_id' => $this->dining_table_id,
            'status' => $this->status,
            'addon' => $this->is_addon,
            'total' => (float) $this->total,
            'notes' => $this->notes,
            'customer_name' => $this->customer_name,
            'customer_id' => $this->customer_id,
            'member_id' => $this->member_id,
            'member' => $member,
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
                'is_member_exclusive' => (bool) $i->is_member_exclusive,
            ])->all(),
        ];
    }
}
