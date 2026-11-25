<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\LoyaltySetting;
use App\Models\LoyaltyTransaction;
use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PointsService
{
    /**
     * Convert points to currency value (USD). Default 100 pts = $1.00
     */
    public function pointsToCurrency(float $points): float
    {
        $rate = (float) LoyaltySetting::get('points_redemption_rate', 100);
        if ($rate <= 0) $rate = 100;
        return round($points / $rate, 2);
    }

    /**
     * Convert currency value to required points. Default $1.00 = 100 pts
     */
    public function currencyToPoints(float $amount): int
    {
        $rate = (float) LoyaltySetting::get('points_redemption_rate', 100);
        if ($rate <= 0) $rate = 100;
        return (int) round($amount * $rate);
    }

    /**
     * Get multiplier for tier
     */
    public function getMultiplierForTier(string $tier): float
    {
        return match (strtolower($tier)) {
            'vip' => (float) LoyaltySetting::get('tier_multiplier_vip', 2.0),
            'gold' => (float) LoyaltySetting::get('tier_multiplier_gold', 1.5),
            'silver' => (float) LoyaltySetting::get('tier_multiplier_silver', 1.25),
            default => (float) LoyaltySetting::get('tier_multiplier_bronze', 1.0),
        };
    }

    /**
     * Calculate points earned for an eligible order amount and tier.
     * Round to nearest whole point (half rounded up).
     */
    public function calculatePointsEarned(float $eligibleAmount, string $tier): int
    {
        if ($eligibleAmount <= 0) {
            return 0;
        }

        $multiplier = $this->getMultiplierForTier($tier);
        $rawPoints = $eligibleAmount * $multiplier;

        return (int) round($rawPoints, 0, PHP_ROUND_HALF_UP);
    }

    /**
     * Award points to customer on order payment.
     * Must be run within a DB transaction.
     */
    public function awardPoints(Customer $customer, float $eligibleAmount, ?Order $order = null, string $description = 'Points earned from dining'): LoyaltyTransaction
    {
        $pointsEarned = $this->calculatePointsEarned($eligibleAmount, $customer->loyalty_tier);

        $newBalance = $customer->points_balance + $pointsEarned;
        $newTotalEarned = $customer->total_points_earned + $pointsEarned;

        $customer->points_balance = $newBalance;
        $customer->total_points_earned = $newTotalEarned;
        $customer->last_earning_at = Carbon::now();
        $customer->save();

        return LoyaltyTransaction::create([
            'customer_id' => $customer->id,
            'order_id' => $order?->id,
            'type' => 'earned',
            'points' => $pointsEarned,
            'balance_after' => $newBalance,
            'description' => $description,
            'expires_at' => Carbon::now()->addMonths((int) LoyaltySetting::get('inactivity_expiry_months', 12)),
        ]);
    }

    /**
     * Redeem customer points for a discount or voucher.
     * Validates minimum points and available balance.
     */
    public function redeemPoints(Customer $customer, int $pointsToRedeem, ?Order $order = null, string $description = 'Points redeemed for dining discount'): LoyaltyTransaction
    {
        $minPoints = (int) LoyaltySetting::get('min_redemption_points', 200);

        if ($pointsToRedeem < $minPoints) {
            throw new InvalidArgumentException("Minimum redemption is {$minPoints} points.");
        }

        if ($customer->points_balance < $pointsToRedeem) {
            throw new InvalidArgumentException("Insufficient points balance. Available: " . (int)$customer->points_balance . ", Requested: {$pointsToRedeem}");
        }

        $newBalance = max(0, $customer->points_balance - $pointsToRedeem);
        $newTotalRedeemed = $customer->total_points_redeemed + $pointsToRedeem;

        $customer->points_balance = $newBalance;
        $customer->total_points_redeemed = $newTotalRedeemed;
        // Note: redeeming points does NOT reset inactivity date per specification
        $customer->save();

        return LoyaltyTransaction::create([
            'customer_id' => $customer->id,
            'order_id' => $order?->id,
            'type' => 'redeemed',
            'points' => -$pointsToRedeem,
            'balance_after' => $newBalance,
            'description' => $description,
        ]);
    }

    /**
     * Reverse points proportionally on order refund or cancellation.
     */
    public function reversePoints(Customer $customer, int $pointsToReverse, ?Order $order = null, string $description = 'Refund: Points reversed'): LoyaltyTransaction
    {
        if ($pointsToReverse <= 0) {
            throw new InvalidArgumentException("Points to reverse must be greater than zero.");
        }

        $newBalance = max(0, $customer->points_balance - $pointsToReverse);
        $customer->points_balance = $newBalance;
        $customer->total_points_earned = max(0, $customer->total_points_earned - $pointsToReverse);
        $customer->save();

        return LoyaltyTransaction::create([
            'customer_id' => $customer->id,
            'order_id' => $order?->id,
            'type' => 'refund',
            'points' => -$pointsToReverse,
            'balance_after' => $newBalance,
            'description' => $description,
        ]);
    }

    /**
     * Check and expire points for customers inactive for 12 months.
     */
    public function expireInactivePoints(int $months = 12): int
    {
        $threshold = Carbon::now()->subMonths($months);
        $expiredCount = 0;

        $inactiveCustomers = Customer::where('points_balance', '>', 0)
            ->where(function ($q) use ($threshold) {
                $q->whereNull('last_earning_at')
                  ->where('created_at', '<=', $threshold);
            })
            ->orWhere(function ($q) use ($threshold) {
                $q->where('points_balance', '>', 0)
                  ->where('last_earning_at', '<=', $threshold);
            })
            ->get();

        foreach ($inactiveCustomers as $customer) {
            DB::transaction(function () use ($customer, &$expiredCount) {
                $pointsExpired = $customer->points_balance;
                if ($pointsExpired > 0) {
                    $customer->points_balance = 0;
                    $customer->save();

                    LoyaltyTransaction::create([
                        'customer_id' => $customer->id,
                        'type' => 'expired',
                        'points' => -$pointsExpired,
                        'balance_after' => 0,
                        'description' => 'Points expired due to 12 months of inactivity',
                    ]);

                    $expiredCount++;
                }
            });
        }

        return $expiredCount;
    }
}
