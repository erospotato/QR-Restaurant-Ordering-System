<?php

namespace App\Services;

use App\Models\BirthdayReward;
use App\Models\Customer;
use App\Models\CustomerMembership;
use App\Models\LoyaltyAuditLog;
use App\Models\LoyaltySetting;
use App\Models\MembershipPlan;
use App\Models\Order;
use App\Models\Reward;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class LoyaltyService
{
    protected PointsService $pointsService;

    public function __construct(PointsService $pointsService)
    {
        $this->pointsService = $pointsService;
    }

    public function getPointsService(): PointsService
    {
        return $this->pointsService;
    }

    /**
     * Determine tier based on cumulative lifetime spending
     */
    public function determineTier(float $lifetimeSpending): string
    {
        $vipThreshold = (float) LoyaltySetting::get('tier_threshold_vip', 600.0);
        $goldThreshold = (float) LoyaltySetting::get('tier_threshold_gold', 400.0);
        $silverThreshold = (float) LoyaltySetting::get('tier_threshold_silver', 200.0);

        if ($lifetimeSpending >= $vipThreshold) return 'vip';
        if ($lifetimeSpending >= $goldThreshold) return 'gold';
        if ($lifetimeSpending >= $silverThreshold) return 'silver';
        return 'bronze';
    }

    /**
     * Get discount percent for tier
     */
    public function getTierDiscountPercent(string $tier): int
    {
        return match (strtolower($tier)) {
            'vip' => (int) LoyaltySetting::get('tier_discount_vip', 10),
            'gold' => (int) LoyaltySetting::get('tier_discount_gold', 5),
            'silver' => (int) LoyaltySetting::get('tier_discount_silver', 3),
            default => 0,
        };
    }

    /**
     * Get currency info (configurable USD / KHR / etc.)
     */
    public function getCurrencyInfo(): array
    {
        return [
            'code' => LoyaltySetting::get('currency_code', 'USD'),
            'symbol' => LoyaltySetting::get('currency_symbol', '$'),
            'redemption_rate' => (float) LoyaltySetting::get('points_redemption_rate', 100),
        ];
    }

    /**
     * Format currency display
     */
    public function formatCurrency(float $amount): string
    {
        $symbol = LoyaltySetting::get('currency_symbol', '$');
        return $symbol . number_format($amount, 2);
    }

    /**
     * Subscribe or renew customer to Maison Privé annual membership
     */
    public function subscribeMaisonPrive(Customer $customer, float $amountPaid = 49.99, ?string $paymentMethod = null): CustomerMembership
    {
        return DB::transaction(function () use ($customer, $amountPaid, $paymentMethod) {
            $plan = MembershipPlan::firstOrCreate(
                ['name' => 'Maison Privé'],
                [
                    'price' => 49.99,
                    'duration_months' => 12,
                    'description' => 'Annual luxury membership with VIP priority table reservations, complimentary birthday dessert, welcome drinks, seasonal menu access & private tastings.',
                    'is_active' => true,
                ]
            );

            // If customer has an active subscription, extend it from the end date; otherwise start today
            $existing = $customer->activeMembership()->where('plan_id', $plan->id)->first();
            $startDate = Carbon::today();
            if ($existing && $existing->end_date && $existing->end_date->isFuture()) {
                $startDate = $existing->end_date;
            }
            $endDate = $startDate->copy()->addMonths($plan->duration_months ?: 12);

            $membership = CustomerMembership::create([
                'customer_id' => $customer->id,
                'plan_id' => $plan->id,
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
                'amount_paid' => $amountPaid,
                'status' => 'active',
            ]);

            $newValues = [
                'plan' => 'Maison Privé',
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
                'amount_paid' => $amountPaid,
            ];
            if ($paymentMethod) {
                $newValues['payment_method'] = $paymentMethod;
            }

            LoyaltyAuditLog::create([
                'user_id' => auth('sanctum')->id(),
                'customer_id' => $customer->id,
                'action' => 'membership_subscribed',
                'new_values' => $newValues,
                'reason' => 'Subscribed to Maison Privé Annual Plan ($' . number_format($amountPaid, 2) . ')' . ($paymentMethod ? " via {$paymentMethod}" : ''),
            ]);

            return $membership;
        });
    }

    /**
     * Check if customer has active Maison Privé membership
     */
    public function hasActiveMaisonPrive(Customer $customer): bool
    {
        return $customer->hasActiveMaisonPrive();
    }

    /**
     * Check and issue Birthday Reward for customer if in birthday month
     */
    public function checkAndGenerateBirthdayReward(Customer $customer): ?BirthdayReward
    {
        if (!$customer->date_of_birth) {
            return null;
        }

        $dob = Carbon::parse($customer->date_of_birth);
        $now = Carbon::now();

        // Check if current month is birthday month
        if ($dob->month !== $now->month) {
            return null;
        }

        // Check if already issued for this year
        $existing = BirthdayReward::where('customer_id', $customer->id)
            ->where('year', $now->year)
            ->first();

        if ($existing) {
            return $existing;
        }

        // Determine birthday reward by tier + Maison Privé
        $tier = strtolower($customer->loyalty_tier);
        $rewardDesc = match ($tier) {
            'vip' => 'Premium Birthday Dessert + Signature Cocktail',
            'gold' => 'Complimentary Dessert + Signature Drink',
            'silver' => 'Complimentary Dessert + 100 Bonus Points',
            default => 'Complimentary Birthday Dessert',
        };

        if ($customer->hasActiveMaisonPrive()) {
            $rewardDesc .= ' + Maison Privé Private Dining Invitation';
        }

        $expiresAt = $now->copy()->endOfMonth();

        return BirthdayReward::create([
            'customer_id' => $customer->id,
            'year' => $now->year,
            'reward_description' => $rewardDesc,
            'status' => 'available',
            'issued_at' => $now,
            'expires_at' => $expiresAt,
        ]);
    }

    /**
     * Process order checkout / payment with loyalty calculations:
     * - Tier discount (based on current tier before this order)
     * - Points redemption (validates minimum, updates points ledger)
     * - Points earning (calculated on net eligible amount after discounts)
     * - Lifetime spending accumulation
     * - Tier upgrade check (takes effect for subsequent orders)
     */
    public function processOrderPayment(
        Order $order,
        Customer $customer,
        float $orderSubtotal,
        int $pointsToRedeem = 0
    ): array {
        return DB::transaction(function () use ($order, $customer, $orderSubtotal, $pointsToRedeem) {
            // Lock customer record for atomic update
            $lockedCustomer = Customer::where('id', $customer->id)->lockForUpdate()->first();

            $previousTier = $lockedCustomer->loyalty_tier;

            // 1. Current tier discount (applied before payment based on CURRENT tier)
            $tierDiscountPercent = $this->getTierDiscountPercent($previousTier);
            $tierDiscountAmount = round(($orderSubtotal * $tierDiscountPercent) / 100, 2);

            // 2. Points Redemption Discount
            $discountFromPoints = 0.0;
            $pointsRedeemedTx = null;
            if ($pointsToRedeem > 0) {
                $discountFromPoints = $this->pointsService->pointsToCurrency($pointsToRedeem);
                // Validate discount cannot exceed remaining subtotal
                $remainingSubtotal = max(0, $orderSubtotal - $tierDiscountAmount);
                if ($discountFromPoints > $remainingSubtotal) {
                    $discountFromPoints = $remainingSubtotal;
                    $pointsToRedeem = $this->pointsService->currencyToPoints($discountFromPoints);
                }

                if ($pointsToRedeem >= 200) {
                    $pointsRedeemedTx = $this->pointsService->redeemPoints(
                        $lockedCustomer,
                        $pointsToRedeem,
                        $order,
                        "Redeemed {$pointsToRedeem} points for \${$discountFromPoints} dining discount"
                    );
                } else {
                    $pointsToRedeem = 0;
                    $discountFromPoints = 0.0;
                }
            }

            // 3. Net eligible spending = Subtotal minus all discounts
            $netEligibleSpending = max(0, $orderSubtotal - $tierDiscountAmount - $discountFromPoints);

            // 4. Points Earned = Net eligible spending * current tier multiplier
            $pointsEarned = 0;
            if ($netEligibleSpending > 0) {
                $earnTx = $this->pointsService->awardPoints(
                    $lockedCustomer,
                    $netEligibleSpending,
                    $order,
                    "Dining points earned from Order #{$order->id}"
                );
                $pointsEarned = (int) $earnTx->points;
            }

            // 5. Accumulate lifetime eligible spending
            $newLifetimeSpending = round($lockedCustomer->lifetime_spending + $netEligibleSpending, 2);
            $lockedCustomer->lifetime_spending = $newLifetimeSpending;

            // 6. Check for Tier Upgrade (takes effect for subsequent orders)
            $newTier = $this->determineTier($newLifetimeSpending);
            $tierUpgraded = false;
            if ($newTier !== $previousTier) {
                $lockedCustomer->loyalty_tier = $newTier;
                $tierUpgraded = true;

                LoyaltyAuditLog::create([
                    'user_id' => auth('sanctum')->id(),
                    'customer_id' => $lockedCustomer->id,
                    'action' => 'tier_upgraded',
                    'old_values' => ['tier' => $previousTier],
                    'new_values' => ['tier' => $newTier, 'lifetime_spending' => $newLifetimeSpending],
                    'reason' => "Tier upgraded from " . ucfirst($previousTier) . " to " . ucfirst($newTier) . " after Order #{$order->id}",
                ]);
            }

            $lockedCustomer->save();

            // Link customer and points to the order
            if ($order) {
                $order->customer_id = $lockedCustomer->id;
                $order->member_id = $lockedCustomer->id;
                $order->points_earned = $pointsEarned;
                $order->points_redeemed = $pointsToRedeem;
                $order->save();
            }

            // Check birthday reward availability
            $birthdayReward = $this->checkAndGenerateBirthdayReward($lockedCustomer);

            return [
                'customer_id' => $lockedCustomer->id,
                'customer_name' => $lockedCustomer->full_name,
                'previous_tier' => ucfirst($previousTier),
                'current_tier' => ucfirst($newTier),
                'tier_upgraded' => $tierUpgraded,
                'tier_discount_percent' => $tierDiscountPercent,
                'tier_discount_amount' => $tierDiscountAmount,
                'points_redeemed' => $pointsToRedeem,
                'discount_from_points' => $discountFromPoints,
                'net_eligible_spending' => $netEligibleSpending,
                'points_earned' => $pointsEarned,
                'points_balance' => (int) round($lockedCustomer->points_balance),
                'lifetime_spending' => $newLifetimeSpending,
                'is_maison_prive' => $lockedCustomer->hasActiveMaisonPrive(),
                'birthday_reward' => $birthdayReward ? $birthdayReward->reward_description : null,
            ];
        });
    }

    /**
     * Refund an order: reverse points and eligible lifetime spending proportionally.
     * Recalculates tier; tier downgrades happen only when corrected spending falls below threshold.
     */
    public function processRefund(Order $order, float $refundAmount): array
    {
        return DB::transaction(function () use ($order, $refundAmount) {
            $customer = $order->customer_id ? Customer::find($order->customer_id) : null;
            if (!$customer && $order->member_id) {
                $customer = Customer::find($order->member_id);
            }

            if (!$customer) {
                return ['success' => true, 'reversed_points' => 0];
            }

            $lockedCustomer = Customer::where('id', $customer->id)->lockForUpdate()->first();

            // Proportional points reversal
            $orderTotal = (float) $order->total;
            $pointsEarnedOnOrder = (int) $order->points_earned;
            $pointsToReverse = 0;

            if ($orderTotal > 0 && $pointsEarnedOnOrder > 0) {
                $ratio = min(1.0, $refundAmount / $orderTotal);
                $pointsToReverse = (int) round($pointsEarnedOnOrder * $ratio, 0, PHP_ROUND_HALF_UP);
            }

            if ($pointsToReverse > 0) {
                $this->pointsService->reversePoints(
                    $lockedCustomer,
                    $pointsToReverse,
                    $order,
                    "Order #{$order->id} refund: {$pointsToReverse} points reversed"
                );
            }

            // Reverse lifetime spending
            $correctedSpending = max(0.0, round($lockedCustomer->lifetime_spending - $refundAmount, 2));
            $lockedCustomer->lifetime_spending = $correctedSpending;

            // Recalculate tier (downgrade if corrected spending drops below threshold)
            $oldTier = $lockedCustomer->loyalty_tier;
            $newTier = $this->determineTier($correctedSpending);
            $tierChanged = false;
            if ($newTier !== $oldTier) {
                $lockedCustomer->loyalty_tier = $newTier;
                $tierChanged = true;
            }

            $lockedCustomer->save();

            return [
                'success' => true,
                'reversed_points' => $pointsToReverse,
                'new_points_balance' => (int) round($lockedCustomer->points_balance),
                'new_lifetime_spending' => $correctedSpending,
                'old_tier' => $oldTier,
                'new_tier' => $newTier,
                'tier_changed' => $tierChanged,
            ];
        });
    }
}
