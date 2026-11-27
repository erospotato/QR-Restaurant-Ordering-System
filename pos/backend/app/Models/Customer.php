<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;

class Customer extends Model
{
    protected $fillable = [
        'full_name',
        'phone',
        'email',
        'password',
        'date_of_birth',
        'gender',
        'loyalty_tier', // bronze, silver, gold, vip
        'lifetime_spending',
        'points_balance',
        'total_points_earned',
        'total_points_redeemed',
        'status', // active, suspended
        'last_earning_at',
        'notes',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'lifetime_spending' => 'float',
        'points_balance' => 'float',
        'total_points_earned' => 'float',
        'total_points_redeemed' => 'float',
        'last_earning_at' => 'datetime',
    ];

    // Backwards-compatible accessors & mutators
    public function getNameAttribute()
    {
        return $this->full_name;
    }

    public function setNameAttribute($val)
    {
        $this->attributes['full_name'] = $val;
    }

    public function getTierAttribute()
    {
        return $this->loyalty_tier;
    }

    public function setTierAttribute($val)
    {
        $this->attributes['loyalty_tier'] = strtolower($val);
    }

    public function getPointsAttribute()
    {
        return (int) $this->points_balance;
    }

    public function setPointsAttribute($val)
    {
        $this->attributes['points_balance'] = (float) $val;
    }

    public function getTotalSpentAttribute()
    {
        return (float) $this->lifetime_spending;
    }

    public function setTotalSpentAttribute($val)
    {
        $this->attributes['lifetime_spending'] = (float) $val;
    }

    // Relationships
    public function memberships()
    {
        return $this->hasMany(CustomerMembership::class, 'customer_id');
    }

    public function activeMembership()
    {
        return $this->hasOne(CustomerMembership::class, 'customer_id')
            ->where('status', 'active')
            ->where('end_date', '>=', Carbon::today())
            ->latest('id');
    }

    public function transactions()
    {
        return $this->hasMany(LoyaltyTransaction::class, 'customer_id')->orderByDesc('id');
    }

    public function customerRewards()
    {
        return $this->hasMany(CustomerReward::class, 'customer_id');
    }

    public function birthdayRewards()
    {
        return $this->hasMany(BirthdayReward::class, 'customer_id');
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'customer_id');
    }

    public function verifyPassword(string $inputPassword): bool
    {
        if (empty($this->password)) {
            $last4 = substr(preg_replace('/[^0-9]/', '', $this->phone), -4);
            return $inputPassword === '1234' || ($last4 && $inputPassword === $last4);
        }
        if (Hash::check($inputPassword, $this->password)) {
            return true;
        }
        return $this->password === $inputPassword;
    }

    /**
     * Find a customer by phone number, username/full name, email, or card ID.
     */
    public static function findByLoginIdentifier(string $identifier, ?string $password = null): ?self
    {
        $trimmed = trim($identifier);
        if ($trimmed === '') {
            return null;
        }

        $cleanPhone = preg_replace('/[^0-9]/', '', $trimmed);
        $cardId = null;
        if (preg_match('/^(?:#|mm[\s·-]*)?0*(\d+)$/i', $trimmed, $m)) {
            $cardId = (int) $m[1];
        }

        $candidates = self::where(function ($q) use ($trimmed, $cleanPhone, $cardId) {
            $q->where('phone', $trimmed);
            if ($cleanPhone !== '') {
                $q->orWhere('phone', $cleanPhone);
            }
            if ($cardId !== null && $cardId > 0) {
                $q->orWhere('id', $cardId);
            }
            $lower = mb_strtolower($trimmed);
            $q->orWhereRaw('LOWER(full_name) = ?', [$lower])
              ->orWhereRaw('LOWER(email) = ?', [$lower]);
        })->get();

        // Fallback: allow single-word first-name lookup (e.g. "Alice" -> "Alice Johnson")
        if ($candidates->isEmpty() && !str_contains($trimmed, ' ') && mb_strlen($trimmed) >= 2) {
            $candidates = self::whereRaw('LOWER(full_name) LIKE ?', [mb_strtolower($trimmed) . ' %'])->get();
        }

        if ($candidates->isEmpty()) {
            return null;
        }

        if ($password !== null && $password !== '') {
            return $candidates->first(fn (self $c) => $c->verifyPassword($password)) ?? $candidates->first();
        }

        return $candidates->first();
    }

    public function hasActiveMaisonPrive(): bool
    {
        return $this->activeMembership()
            ->whereHas('plan', fn ($q) => $q->where('name', 'Maison Privé'))
            ->exists();
    }

    public static function determineTier(float $spending): string
    {
        if ($spending >= 600.0) return 'vip';
        if ($spending >= 400.0) return 'gold';
        if ($spending >= 200.0) return 'silver';
        return 'bronze';
    }

    public static function tierDiscountPercent(string $tier): int
    {
        return match (strtolower($tier)) {
            'vip' => 10,
            'gold' => 5,
            'silver' => 3,
            default => 0,
        };
    }

    public static function tierMultiplier(string $tier): float
    {
        return match (strtolower($tier)) {
            'vip' => 2.0,
            'gold' => 1.5,
            'silver' => 1.25,
            default => 1.0,
        };
    }

    public static function nextTierInfo(float $spending): array
    {
        if ($spending >= 600.0) {
            return [
                'current_tier' => 'VIP',
                'next_tier' => null,
                'target' => 600.0,
                'progress_percent' => 100,
                'needed' => 0.0,
                'perk' => '10% Off All Orders + 2x Points Multiplier',
            ];
        }
        if ($spending >= 400.0) {
            $needed = round(600.0 - $spending, 2);
            $pct = round((($spending - 400.0) / 200.0) * 100);
            return [
                'current_tier' => 'Gold',
                'next_tier' => 'VIP',
                'target' => 600.0,
                'progress_percent' => min(100, max(0, $pct)),
                'needed' => $needed,
                'perk' => '5% Off All Orders + 1.5x Points',
                'next_perk' => '10% Off All Orders + 2x Points Multiplier',
            ];
        }
        if ($spending >= 200.0) {
            $needed = round(400.0 - $spending, 2);
            $pct = round((($spending - 200.0) / 200.0) * 100);
            return [
                'current_tier' => 'Silver',
                'next_tier' => 'Gold',
                'target' => 400.0,
                'progress_percent' => min(100, max(0, $pct)),
                'needed' => $needed,
                'perk' => '3% Off All Orders + 1.25x Points',
                'next_perk' => '5% Off All Orders + 1.5x Points',
            ];
        }
        $needed = round(200.0 - $spending, 2);
        $pct = round(($spending / 200.0) * 100);
        return [
            'current_tier' => 'Bronze',
            'next_tier' => 'Silver',
            'target' => 200.0,
            'progress_percent' => min(100, max(0, $pct)),
            'needed' => $needed,
            'perk' => '1x Point per $1 spent',
            'next_perk' => '3% Off All Orders + 1.25x Points',
        ];
    }

    public function toApi(): array
    {
        $info = self::nextTierInfo((float) $this->lifetime_spending);
        $activeSub = $this->activeMembership()->with('plan')->first();
        $isPrive = $activeSub && $activeSub->plan && $activeSub->plan->name === 'Maison Privé';

        $daysRemaining = null;
        if ($activeSub && $activeSub->end_date) {
            $daysRemaining = max(0, Carbon::today()->diffInDays($activeSub->end_date, false));
        }

        $priveBenefits = [
            'Priority Table Reservations',
            'Complimentary Birthday Dessert',
            'Complimentary Welcome Drink',
            'Exclusive Seasonal Menu Access',
            'Invitations to Private Dining Events',
            'Special Member Promotions',
        ];

        // Check if customer has an active birthday reward
        $now = Carbon::now();
        $isBirthdayMonth = false;
        if ($this->date_of_birth) {
            $dob = Carbon::parse($this->date_of_birth);
            $isBirthdayMonth = ($dob->month === $now->month);
        }

        $birthdayReward = $this->birthdayRewards()
            ->where('year', $now->year)
            ->where('status', 'available')
            ->first();

        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'name' => $this->full_name,
            'phone' => $this->phone,
            'email' => $this->email,
            'date_of_birth' => $this->date_of_birth ? Carbon::parse($this->date_of_birth)->format('Y-m-d') : null,
            'gender' => $this->gender,
            'loyalty_tier' => ucfirst($this->loyalty_tier),
            'tier' => ucfirst($this->loyalty_tier),
            'tier_code' => strtolower($this->loyalty_tier),
            'discount_percent' => self::tierDiscountPercent($this->loyalty_tier),
            'points_multiplier' => self::tierMultiplier($this->loyalty_tier),
            'points_balance' => (int) round($this->points_balance),
            'points' => (int) round($this->points_balance),
            'points_value_usd' => round($this->points_balance / 100, 2),
            'lifetime_spending' => (float) $this->lifetime_spending,
            'total_spent' => (float) $this->lifetime_spending,
            'total_points_earned' => (int) round($this->total_points_earned),
            'total_points_redeemed' => (int) round($this->total_points_redeemed),
            'status' => $this->status,
            'last_earning_at' => $this->last_earning_at?->toIso8601String(),
            'tier_info' => $info,
            'membership' => [
                'plan_name' => $isPrive ? 'Maison Privé' : 'Standard',
                'is_prive' => $isPrive,
                'price' => $isPrive ? 49.99 : 0.0,
                'status' => $activeSub ? $activeSub->status : 'active',
                'start_date' => $activeSub ? $activeSub->start_date->format('Y-m-d') : null,
                'end_date' => $activeSub ? $activeSub->end_date->format('Y-m-d') : null,
                'days_remaining' => $daysRemaining,
                'benefits' => $isPrive ? $priveBenefits : ['Standard Loyalty Tier Spending & Points Rewards'],
            ],
            'birthday_info' => [
                'is_birthday_month' => $isBirthdayMonth,
                'available_reward' => $birthdayReward ? [
                    'id' => $birthdayReward->id,
                    'description' => $birthdayReward->reward_description,
                    'status' => $birthdayReward->status,
                    'expires_at' => $birthdayReward->expires_at?->format('Y-m-d'),
                ] : null,
            ],
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
