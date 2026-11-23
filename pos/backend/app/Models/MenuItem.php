<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MenuItem extends Model
{
    protected $guarded = [];
    protected $casts = [
        'price' => 'float',
        'is_available' => 'boolean',
        'is_top_sale' => 'boolean',
        'is_signature' => 'boolean',
    ];
    protected $appends = ['image_url'];

    public function getImageUrlAttribute(): ?string
    {
        if (!$this->image_path) return null;
        if (Str::startsWith($this->image_path, ['http://', 'https://', 'data:'])) {
            return $this->image_path;
        }
        if (config('pos.disk') === 'cloudinary') {
            return Storage::disk('cloudinary')->url($this->image_path);
        }
        return '/storage/' . ltrim($this->image_path, '/');
    }
}
