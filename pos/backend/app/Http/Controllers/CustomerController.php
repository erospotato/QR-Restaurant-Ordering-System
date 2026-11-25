<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\CustomerReward;
use App\Models\LoyaltyAuditLog;
use App\Models\LoyaltyTransaction;
use App\Models\Order;
use App\Models\Reward;
use App\Services\LoyaltyService;
use App\Services\PointsService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class CustomerController extends Controller
{
    protected LoyaltyService $loyaltyService;
    protected PointsService $pointsService;

    public function __construct(LoyaltyService $loyaltyService, PointsService $pointsService)
    {
        $this->loyaltyService = $loyaltyService;
        $this->pointsService = $pointsService;
    }

    /**
     * List customers (Staff / Admin with search, filter, and pagination/limits)
     */
    public function index(Request $r)
    {
        $q = trim($r->query('q', ''));
        $tier = trim($r->query('tier', 'all'));
        $plan = trim($r->query('plan', 'all')); // 'all' | 'prive' | 'standard'
        $sort = $r->query('sort', 'points_balance');
        $dir = strtolower($r->query('dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $query = Customer::query();

        if ($q) {
            $cleanQ = preg_replace('/[^0-9]/', '', $q);
            $query->where(function ($sub) use ($q, $cleanQ) {
                $sub->where('full_name', 'like', "%{$q}%")
                    ->orWhere('phone', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%");
                if ($cleanQ) {
                    $sub->orWhere('phone', 'like', "%{$cleanQ}%");
                }
            });
        }

        if ($tier && $tier !== 'all') {
            $query->where('loyalty_tier', strtolower($tier));
        }

        if ($plan === 'prive') {
            $query->whereHas('activeMembership.plan', fn ($sq) => $sq->where('name', 'Maison Privé'));
        } elseif ($plan === 'standard') {
            $query->whereDoesntHave('activeMembership.plan', fn ($sq) => $sq->where('name', 'Maison Privé'));
        }

        $sortMap = [
            'points' => 'points_balance',
            'points_balance' => 'points_balance',
            'total_spent' => 'lifetime_spending',
            'lifetime_spending' => 'lifetime_spending',
            'name' => 'full_name',
            'full_name' => 'full_name',
            'created_at' => 'created_at',
            'updated_at' => 'updated_at',
        ];
        $column = $sortMap[$sort] ?? 'points_balance';
        $query->orderBy($column, $dir);

        $customers = $query->get();

        return response()->json([
            'customers' => $customers->map->toApi(),
            'total' => $customers->count(),
        ]);
    }

    /**
     * Customer verification (Dual field: Number/Phone + Password/PIN)
     */
    public function verify(Request $r)
    {
        $identifier = trim($r->input('number', $r->input('phone', '')));
        $password = trim($r->input('password', ''));

        if (!$identifier) {
            abort(422, 'Membership number or phone number is required.');
        }
        if (!$password) {
            abort(422, 'Membership password or PIN is required.');
        }

        $cleanPhone = preg_replace('/[^0-9]/', '', $identifier);

        $customer = Customer::where('phone', $identifier)
            ->orWhere('phone', $cleanPhone)
            ->orWhere('id', $identifier)
            ->first();

        if (!$customer) {
            abort(404, 'No customer membership found matching that number or phone.');
        }

        if (!$customer->verifyPassword($password)) {
            abort(401, 'Incorrect membership password or PIN. Please try again.');
        }

        // Check for birthday reward issuance
        $this->loyaltyService->checkAndGenerateBirthdayReward($customer);

        // Include recent order history for this verified customer
        $recentOrders = Order::where(function ($q) use ($customer) {
                $q->where('customer_id', $customer->id)
                  ->orWhere('member_id', $customer->id);
            })
            ->whereNotNull('paid_at')
            ->orderByDesc('paid_at')
            ->limit(10)
            ->get()
            ->map(fn ($o) => [
                'id' => $o->id,
                'table' => $o->diningTable?->number,
                'total' => (float) $o->total,
                'points_earned' => (int) $o->points_earned,
                'points_redeemed' => (int) $o->points_redeemed,
                'paid_at' => $o->paid_at->toIso8601String(),
                'items_count' => $o->items->sum('quantity'),
            ]);

        $data = $customer->toApi();
        $data['recent_orders'] = $recentOrders;

        return response()->json([
            'ok' => true,
            'customer' => $data,
            'member' => $data, // backward compatibility
            'message' => "Welcome back, {$customer->full_name}!",
        ]);
    }

    /**
     * Register customer
     */
    public function store(Request $r)
    {
        $d = $r->validate([
            'full_name' => 'nullable|string|max:150',
            'name' => 'nullable|string|max:150',
            'phone' => 'required|string|max:30',
            'email' => 'nullable|email|max:150',
            'password' => 'nullable|string|min:4|max:50',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|string|max:20',
            'notes' => 'nullable|string',
        ]);

        $name = trim($d['full_name'] ?? $d['name'] ?? 'Guest');
        $cleanPhone = trim($d['phone']);

        $existing = Customer::where('phone', $cleanPhone)->first();
        if ($existing) {
            if ($r->filled('password')) {
                $existing->update(['password' => Hash::make(trim($d['password']))]);
            }
            return response()->json([
                'customer' => $existing->toApi(),
                'member' => $existing->toApi(),
                'already_registered' => true,
                'message' => 'Welcome back! You are already registered.',
            ]);
        }

        $password = !empty($d['password'])
            ? Hash::make(trim($d['password']))
            : Hash::make('1234');

        $customer = Customer::create([
            'full_name' => $name,
            'phone' => $cleanPhone,
            'email' => $d['email'] ?? null,
            'password' => $password,
            'date_of_birth' => $d['date_of_birth'] ?? null,
            'gender' => $d['gender'] ?? null,
            'loyalty_tier' => 'bronze',
            'lifetime_spending' => 0.0,
            'points_balance' => 0.0,
            'total_points_earned' => 0.0,
            'total_points_redeemed' => 0.0,
            'status' => 'active',
            'notes' => $d['notes'] ?? null,
        ]);

        return response()->json([
            'customer' => $customer->toApi(),
            'member' => $customer->toApi(),
            'already_registered' => false,
            'message' => 'Customer registered successfully in Bronze tier.',
        ], 201);
    }

    /**
     * Show customer details
     */
    public function show($id)
    {
        $customer = Customer::findOrFail($id);

        // Check birthday reward issuance
        $this->loyaltyService->checkAndGenerateBirthdayReward($customer);

        $recentOrders = Order::where(function ($q) use ($customer) {
                $q->where('customer_id', $customer->id)
                  ->orWhere('member_id', $customer->id);
            })
            ->whereNotNull('paid_at')
            ->orderByDesc('paid_at')
            ->limit(20)
            ->get()
            ->map(fn ($o) => [
                'id' => $o->id,
                'table' => $o->diningTable?->number,
                'total' => (float) $o->total,
                'points_earned' => (int) $o->points_earned,
                'points_redeemed' => (int) $o->points_redeemed,
                'paid_at' => $o->paid_at->toIso8601String(),
                'payment_method' => $o->payment_method,
                'items_count' => $o->items->sum('quantity'),
                'items_summary' => $o->items->map(fn ($it) => "{$it->quantity}x {$it->name}")->filter()->join(', '),
            ]);

        $data = $customer->toApi();
        $data['recent_orders'] = $recentOrders;
        $data['transactions'] = $customer->transactions()->limit(20)->get();

        return response()->json($data);
    }

    /**
     * Update customer
     */
    public function update(Request $r, $id)
    {
        $customer = Customer::findOrFail($id);

        $d = $r->validate([
            'full_name' => 'sometimes|string|max:150',
            'name' => 'sometimes|string|max:150',
            'phone' => 'sometimes|string|max:30|unique:customers,phone,' . $customer->id,
            'email' => 'nullable|email|max:150',
            'password' => 'nullable|string|min:4',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|string|max:20',
            'status' => 'sometimes|in:active,suspended',
            'notes' => 'nullable|string',
        ]);

        if (isset($d['name']) && !isset($d['full_name'])) {
            $d['full_name'] = $d['name'];
            unset($d['name']);
        }

        if (!empty($d['password'])) {
            $d['password'] = Hash::make(trim($d['password']));
        } else {
            unset($d['password']);
        }

        $oldValues = $customer->only(array_keys($d));
        $customer->update($d);

        LoyaltyAuditLog::create([
            'user_id' => auth('sanctum')->id(),
            'customer_id' => $customer->id,
            'action' => 'customer_updated',
            'old_values' => $oldValues,
            'new_values' => $d,
            'reason' => 'Customer profile updated by staff',
        ]);

        return response()->json([
            'ok' => true,
            'customer' => $customer->toApi(),
            'message' => 'Customer profile updated successfully.',
        ]);
    }

    /**
     * Loyalty Summary
     */
    public function loyaltySummary($id)
    {
        $customer = Customer::findOrFail($id);
        $this->loyaltyService->checkAndGenerateBirthdayReward($customer);

        return response()->json([
            'customer_id' => $customer->id,
            'full_name' => $customer->full_name,
            'loyalty_tier' => ucfirst($customer->loyalty_tier),
            'lifetime_spending' => (float) $customer->lifetime_spending,
            'points_balance' => (int) round($customer->points_balance),
            'points_value_usd' => $this->pointsService->pointsToCurrency($customer->points_balance),
            'tier_info' => Customer::nextTierInfo($customer->lifetime_spending),
            'tier_discount_percent' => Customer::tierDiscountPercent($customer->loyalty_tier),
            'tier_multiplier' => Customer::tierMultiplier($customer->loyalty_tier),
            'is_maison_prive' => $customer->hasActiveMaisonPrive(),
            'currency' => $this->loyaltyService->getCurrencyInfo(),
        ]);
    }

    /**
     * Points Transaction History
     */
    public function transactions($id)
    {
        $customer = Customer::findOrFail($id);
        $transactions = $customer->transactions()->limit(50)->get();

        return response()->json([
            'customer_id' => $customer->id,
            'current_balance' => (int) round($customer->points_balance),
            'transactions' => $transactions->map(fn ($t) => [
                'id' => $t->id,
                'order_id' => $t->order_id,
                'type' => $t->type,
                'points' => (float) $t->points,
                'balance_after' => (float) $t->balance_after,
                'description' => $t->description,
                'created_at' => $t->created_at->toIso8601String(),
                'expires_at' => $t->expires_at?->toIso8601String(),
            ]),
        ]);
    }

    /**
     * Available rewards for customer
     */
    public function rewards($id)
    {
        $customer = Customer::findOrFail($id);
        $this->loyaltyService->checkAndGenerateBirthdayReward($customer);

        $catalog = Reward::where('is_active', true)->orderBy('points_required', 'asc')->get();

        // Customer's active unredeemed rewards (e.g. vouchers, birthday)
        $customerRewards = CustomerReward::where('customer_id', $customer->id)
            ->where('status', 'available')
            ->with('reward')
            ->get();

        $birthdayRewards = $customer->birthdayRewards()
            ->where('status', 'available')
            ->get();

        return response()->json([
            'customer_points' => (int) round($customer->points_balance),
            'catalog' => $catalog->map(fn ($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'description' => $r->description,
                'reward_type' => $r->reward_type,
                'points_required' => (int) $r->points_required,
                'reward_value' => (float) $r->reward_value,
                'can_afford' => $customer->points_balance >= $r->points_required,
            ]),
            'my_rewards' => $customerRewards,
            'birthday_rewards' => $birthdayRewards,
        ]);
    }

    /**
     * Customer redeems points for a reward
     */
    public function redeem(Request $r, $id)
    {
        $customer = Customer::findOrFail($id);

        $d = $r->validate([
            'reward_id' => 'required|exists:rewards,id',
        ]);

        $reward = Reward::findOrFail($d['reward_id']);

        if (!$reward->is_active) {
            abort(422, 'This reward is currently inactive.');
        }

        if ($customer->points_balance < $reward->points_required) {
            abort(422, "Insufficient points. You need " . (int)$reward->points_required . " points, but only have " . (int)$customer->points_balance . " points.");
        }

        $result = DB::transaction(function () use ($customer, $reward) {
            // Deduct points
            $tx = $this->pointsService->redeemPoints(
                $customer,
                (int) $reward->points_required,
                null,
                "Redeemed for: {$reward->name}"
            );

            // Create customer reward record
            $cr = CustomerReward::create([
                'customer_id' => $customer->id,
                'reward_id' => $reward->id,
                'status' => 'available',
                'issued_at' => Carbon::now(),
                'expires_at' => Carbon::now()->addDays(30),
            ]);

            return [
                'customer_reward' => $cr,
                'transaction' => $tx,
                'new_points_balance' => (int) round($customer->points_balance),
            ];
        });

        return response()->json([
            'ok' => true,
            'message' => "Successfully redeemed {$reward->name}!",
            'reward' => $reward,
            'new_points_balance' => $result['new_points_balance'],
            'customer_reward_id' => $result['customer_reward']->id,
        ]);
    }
}
