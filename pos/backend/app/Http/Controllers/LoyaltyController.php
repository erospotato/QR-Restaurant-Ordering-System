<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\CustomerMembership;
use App\Models\LoyaltyAuditLog;
use App\Models\LoyaltySetting;
use App\Models\LoyaltyTransaction;
use App\Models\MembershipPlan;
use App\Models\Reward;
use App\Services\LoyaltyService;
use App\Services\PointsService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LoyaltyController extends Controller
{
    protected LoyaltyService $loyaltyService;
    protected PointsService $pointsService;

    public function __construct(LoyaltyService $loyaltyService, PointsService $pointsService)
    {
        $this->loyaltyService = $loyaltyService;
        $this->pointsService = $pointsService;
    }

    /**
     * Get Tier Settings & Structure
     */
    public function getTiers()
    {
        $tiers = [
            [
                'tier' => 'Bronze',
                'code' => 'bronze',
                'lifetime_spending' => '$0 – $199.99',
                'min_spending' => 0.0,
                'max_spending' => 199.99,
                'discount_percent' => 0,
                'points_multiplier' => 1.0,
                'perk' => '1x Point per $1 spent',
                'birthday_benefit' => 'Complimentary birthday dessert',
            ],
            [
                'tier' => 'Silver',
                'code' => 'silver',
                'lifetime_spending' => '$200 – $399.99',
                'min_spending' => 200.0,
                'max_spending' => 399.99,
                'discount_percent' => 3,
                'points_multiplier' => 1.25,
                'perk' => '3% Off All Orders + 1.25x Points',
                'birthday_benefit' => 'Dessert + 100 bonus points',
            ],
            [
                'tier' => 'Gold',
                'code' => 'gold',
                'lifetime_spending' => '$400 – $599.99',
                'min_spending' => 400.0,
                'max_spending' => 599.99,
                'discount_percent' => 5,
                'points_multiplier' => 1.5,
                'perk' => '5% Off All Orders + 1.5x Points',
                'birthday_benefit' => 'Dessert + signature drink',
            ],
            [
                'tier' => 'VIP',
                'code' => 'vip',
                'lifetime_spending' => '$600+',
                'min_spending' => 600.0,
                'max_spending' => null,
                'discount_percent' => 10,
                'points_multiplier' => 2.0,
                'perk' => '10% Off All Orders + 2x Points Multiplier',
                'birthday_benefit' => 'Premium birthday dessert + complimentary drink',
            ],
        ];

        return response()->json([
            'tiers' => $tiers,
            'currency' => $this->loyaltyService->getCurrencyInfo(),
        ]);
    }

    /**
     * Get Rewards Catalog
     */
    public function getRewards()
    {
        $rewards = Reward::where('is_active', true)
            ->orderBy('points_required', 'asc')
            ->get();

        return response()->json($rewards);
    }

    /**
     * Create Reward (Admin / Manager)
     */
    public function createReward(Request $r)
    {
        $d = $r->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'reward_type' => 'required|in:discount,free_item,bonus_points',
            'points_required' => 'required|numeric|min:50',
            'reward_value' => 'nullable|numeric|min:0',
        ]);

        $reward = Reward::create(array_merge($d, ['is_active' => true]));

        LoyaltyAuditLog::create([
            'user_id' => auth('sanctum')->id(),
            'action' => 'reward_created',
            'new_values' => $reward->toArray(),
            'reason' => "Created reward {$reward->name}",
        ]);

        return response()->json($reward, 201);
    }

    /**
     * Update Reward (Admin / Manager)
     */
    public function updateReward(Request $r, $id)
    {
        $reward = Reward::findOrFail($id);

        $d = $r->validate([
            'name' => 'sometimes|string|max:150',
            'description' => 'nullable|string',
            'reward_type' => 'sometimes|in:discount,free_item,bonus_points',
            'points_required' => 'sometimes|numeric|min:50',
            'reward_value' => 'nullable|numeric|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $oldValues = $reward->only(array_keys($d));
        $reward->update($d);

        LoyaltyAuditLog::create([
            'user_id' => auth('sanctum')->id(),
            'action' => 'reward_updated',
            'old_values' => $oldValues,
            'new_values' => $d,
            'reason' => "Updated reward {$reward->name}",
        ]);

        return response()->json($reward);
    }

    /**
     * Get Membership Plans (Standard vs Maison Privé)
     */
    public function getPlans()
    {
        $plans = MembershipPlan::where('is_active', true)->get();

        $benefits = [
            'Maison Privé' => [
                'Priority table reservations',
                'Complimentary birthday dessert',
                'Complimentary welcome drink',
                'Exclusive seasonal menu access',
                'Invitations to private dining events',
                'Special member promotions',
            ],
            'Standard' => [
                'Free lifetime account',
                'Automatic spending tier progression (Bronze, Silver, Gold, VIP)',
                'Points earning & rewards redemption',
            ],
        ];

        return response()->json([
            'plans' => $plans->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'price' => (float) $p->price,
                'duration_months' => (int) $p->duration_months,
                'description' => $p->description,
                'benefits' => $benefits[$p->name] ?? [],
            ]),
        ]);
    }

    /**
     * Subscribe or Renew Customer to Maison Privé
     */
    public function subscribe(Request $r)
    {
        $d = $r->validate([
            'customer_id' => 'required|exists:customers,id',
            'plan_name' => 'nullable|string',
            'amount_paid' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|in:cash,card,qr,transfer,ewallet',
            'amount_tendered' => 'nullable|numeric|min:0',
        ]);

        $customer = Customer::findOrFail($d['customer_id']);
        $amount = isset($d['amount_paid']) ? (float) $d['amount_paid'] : 49.99;
        $paymentMethod = $d['payment_method'] ?? null;

        $membership = $this->loyaltyService->subscribeMaisonPrive($customer, $amount, $paymentMethod);

        return response()->json([
            'ok' => true,
            'message' => "Successfully subscribed {$customer->full_name} to Maison Privé (12 Months)!",
            'membership' => [
                'id' => $membership->id,
                'plan_name' => 'Maison Privé',
                'start_date' => $membership->start_date->format('Y-m-d'),
                'end_date' => $membership->end_date->format('Y-m-d'),
                'amount_paid' => $membership->amount_paid,
                'payment_method' => $paymentMethod,
                'status' => $membership->status,
            ],
            'customer' => $customer->fresh()->toApi(),
        ]);
    }

    /**
     * Get Customer Membership Details
     */
    public function getCustomerMembership($customerId)
    {
        $customer = Customer::findOrFail($customerId);
        $activeSub = $customer->activeMembership()->with('plan')->first();

        return response()->json([
            'customer_id' => $customer->id,
            'full_name' => $customer->full_name,
            'phone' => $customer->phone,
            'active_membership' => $activeSub ? [
                'plan_name' => $activeSub->plan?->name ?? 'Maison Privé',
                'start_date' => $activeSub->start_date->format('Y-m-d'),
                'end_date' => $activeSub->end_date->format('Y-m-d'),
                'amount_paid' => (float) $activeSub->amount_paid,
                'status' => $activeSub->status,
                'days_remaining' => max(0, Carbon::today()->diffInDays($activeSub->end_date, false)),
            ] : null,
            'history' => $customer->memberships()->with('plan')->orderByDesc('id')->get(),
        ]);
    }

    /**
     * Loyalty Statistics & Analytics
     */
    public function statistics()
    {
        $allCustomers = Customer::all();
        $totalMembers = $allCustomers->count();
        $activeMembers = $allCustomers->where('status', 'active')->count();

        $vipCount = $allCustomers->where('loyalty_tier', 'vip')->count();
        $goldCount = $allCustomers->where('loyalty_tier', 'gold')->count();
        $silverCount = $allCustomers->where('loyalty_tier', 'silver')->count();
        $bronzeCount = $allCustomers->where('loyalty_tier', 'bronze')->count();

        // Active Maison Privé subscriptions
        $priveCount = CustomerMembership::where('status', 'active')
            ->where('end_date', '>=', Carbon::today())
            ->whereHas('plan', fn ($q) => $q->where('name', 'Maison Privé'))
            ->count();

        $totalPointsIssued = (float) $allCustomers->sum('total_points_earned');
        $totalPointsRedeemed = (float) $allCustomers->sum('total_points_redeemed');
        $outstandingPoints = (float) $allCustomers->sum('points_balance');
        $totalSpending = (float) $allCustomers->sum('lifetime_spending');

        $pointsLiabilityUsd = round($outstandingPoints / 100, 2);

        // Membership revenue (all paid subscriptions)
        $membershipRevenue = (float) CustomerMembership::sum('amount_paid');

        // Rewards redeemed count
        $rewardsRedeemedCount = DB::table('customer_rewards')->where('status', 'redeemed')->count();

        return response()->json([
            'total_members' => $totalMembers,
            'active_members' => $activeMembers,
            'vip_count' => $vipCount,
            'gold_count' => $goldCount,
            'silver_count' => $silverCount,
            'bronze_count' => $bronzeCount,
            'prive_members' => $priveCount,
            'points_issued' => (int) round($totalPointsIssued),
            'points_redeemed' => (int) round($totalPointsRedeemed),
            'outstanding_points' => (int) round($outstandingPoints),
            'points_liability_usd' => $pointsLiabilityUsd,
            'total_lifetime_spending' => round($totalSpending, 2),
            'membership_revenue' => round($membershipRevenue, 2),
            'rewards_redeemed_count' => $rewardsRedeemedCount,
            'currency' => $this->loyaltyService->getCurrencyInfo(),
        ]);
    }

    /**
     * Manual Points Adjustment (Manager / Admin with audit logging)
     */
    public function adjustPoints(Request $r)
    {
        $d = $r->validate([
            'customer_id' => 'required|exists:customers,id',
            'points' => 'required|numeric',
            'reason' => 'required|string|max:255',
        ]);

        $customer = Customer::findOrFail($d['customer_id']);
        $adjustment = (float) $d['points'];

        $result = DB::transaction(function () use ($customer, $adjustment, $d) {
            $newBalance = max(0, $customer->points_balance + $adjustment);
            $customer->points_balance = $newBalance;
            $customer->save();

            $tx = LoyaltyTransaction::create([
                'customer_id' => $customer->id,
                'type' => 'adjustment',
                'points' => $adjustment,
                'balance_after' => $newBalance,
                'description' => "Manual adjustment: " . $d['reason'],
            ]);

            LoyaltyAuditLog::create([
                'user_id' => auth('sanctum')->id(),
                'customer_id' => $customer->id,
                'action' => 'points_adjusted',
                'new_values' => ['points' => $adjustment, 'balance_after' => $newBalance],
                'reason' => $d['reason'],
            ]);

            return [
                'transaction' => $tx,
                'new_balance' => (int) round($newBalance),
            ];
        });

        return response()->json([
            'ok' => true,
            'message' => "Points adjusted successfully by " . ($adjustment >= 0 ? "+{$adjustment}" : "{$adjustment}"),
            'new_points_balance' => $result['new_balance'],
            'customer' => $customer->fresh()->toApi(),
        ]);
    }

    /**
     * Update Loyalty Settings
     */
    public function updateSettings(Request $r)
    {
        $settings = $r->input('settings', []);
        foreach ($settings as $k => $v) {
            LoyaltySetting::set($k, $v);
        }

        return response()->json([
            'ok' => true,
            'message' => 'Loyalty settings updated successfully.',
            'currency' => $this->loyaltyService->getCurrencyInfo(),
        ]);
    }
}
