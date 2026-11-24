<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Member extends Model
{
    protected $fillable = [
        'name',
        'phone',
        'email',
        'tier',
        'points',
        'total_spent',
        'visits_count',
        'notes',
    ];

    protected $casts = [
        'points' => 'integer',
        'total_spent' => 'float',
        'visits_count' => 'integer',
    ];

    public static function determineTier(float $totalSpent): string
    {
        if ($totalSpent >= 600) return 'vip';
        if ($totalSpent >= 300) return 'gold';
        if ($totalSpent >= 100) return 'silver';
        return 'bronze';
    }

    public static function tierDiscountPercent(string $tier): int
    {
        return match (strtolower($tier)) {
            'vip' => 15,
            'gold' => 10,
            'silver' => 5,
            default => 0,
        };
    }

    public static function nextTierInfo(float $totalSpent): array
    {
        if ($totalSpent >= 600) {
            return [
                'current_tier' => 'VIP',
                'next_tier' => null,
                'target' => 600,
                'progress_percent' => 100,
                'needed' => 0,
                'perk' => '15% Off All Orders + 2x Points',
            ];
        }
        if ($totalSpent >= 300) {
            $needed = round(600 - $totalSpent, 2);
            $pct = round((($totalSpent - 300) / 300) * 100);
            return [
                'current_tier' => 'Gold',
                'next_tier' => 'VIP',
                'target' => 600,
                'progress_percent' => min(100, max(0, $pct)),
                'needed' => $needed,
                'perk' => '10% Off All Orders + 1.5x Points',
                'next_perk' => '15% Off All Orders + 2x Points',
            ];
        }
        if ($totalSpent >= 100) {
            $needed = round(300 - $totalSpent, 2);
            $pct = round((($totalSpent - 100) / 200) * 100);
            return [
                'current_tier' => 'Silver',
                'next_tier' => 'Gold',
                'target' => 300,
                'progress_percent' => min(100, max(0, $pct)),
                'needed' => $needed,
                'perk' => '5% Off All Orders + 1.2x Points',
                'next_perk' => '10% Off All Orders + 1.5x Points',
            ];
        }
        $needed = round(100 - $totalSpent, 2);
        $pct = round(($totalSpent / 100) * 100);
        return [
            'current_tier' => 'Bronze',
            'next_tier' => 'Silver',
            'target' => 100,
            'progress_percent' => min(100, max(0, $pct)),
            'needed' => $needed,
            'perk' => '1 Point per $1 spent',
            'next_perk' => '5% Off All Orders',
        ];
    }

    public function toApi(): array
    {
        $info = self::nextTierInfo((float) $this->total_spent);
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'tier' => ucfirst($this->tier),
            'tier_code' => strtolower($this->tier),
            'discount_percent' => self::tierDiscountPercent($this->tier),
            'points' => (int) $this->points,
            'total_spent' => (float) $this->total_spent,
            'visits_count' => (int) $this->visits_count,
            'tier_info' => $info,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
