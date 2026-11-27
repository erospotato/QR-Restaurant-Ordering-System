<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\CustomerReward;
use App\Models\DiningTable;
use App\Models\LoyaltyAuditLog;
use App\Models\LoyaltyTransaction;
use App\Models\Order;
use App\Models\Reward;
use App\Models\ServiceRequest;
use App\Events\PosUpdated;
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
     * Customer verification (Username / Phone / Card # + Password/PIN)
     */
    public function verify(Request $r)
    {
        $identifier = trim($r->input('number', $r->input('phone', $r->input('username', $r->input('identifier', '')))));
        $password = trim($r->input('password', ''));

        if (!$identifier) {
            abort(422, 'Username, phone number, or membership # is required.');
        }
        if (!$password) {
            abort(422, 'Membership password or PIN is required.');
        }

        $customer = Customer::findByLoginIdentifier($identifier, $password);

        if (!$customer) {
            abort(404, 'No customer membership found matching that username, phone number, or membership #.');
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

        $staffUser = auth('sanctum')->user();
        $isManagerialStaff = $staffUser && in_array($staffUser->role, ['admin', 'owner', 'manager'], true);

        $rules = [
            'full_name' => 'sometimes|string|max:150',
            'name' => 'sometimes|string|max:150',
            'phone' => 'sometimes|string|max:30|unique:customers,phone,' . $customer->id,
            'email' => 'nullable|email|max:150',
            'password' => 'nullable|string|min:4',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|string|max:20',
            'status' => 'sometimes|in:active,suspended',
            'notes' => 'nullable|string',
        ];

        if ($isManagerialStaff) {
            $rules['loyalty_tier'] = 'sometimes|in:bronze,silver,gold,vip';
            $rules['lifetime_spending'] = 'sometimes|numeric|min:0';
            $rules['points_balance'] = 'sometimes|numeric|min:0';
        }

        $d = $r->validate($rules);

        if (isset($d['name']) && !isset($d['full_name'])) {
            $d['full_name'] = $d['name'];
            unset($d['name']);
        }

        $passwordChanged = !empty($d['password']);
        if ($passwordChanged) {
            $d['password'] = Hash::make(trim($d['password']));
        } else {
            unset($d['password']);
        }

        $auditKeys = array_values(array_diff(array_keys($d), ['password']));
        $oldValues = $customer->only($auditKeys);
        $newValues = array_intersect_key($d, array_flip($auditKeys));
        if ($passwordChanged) {
            $newValues['password'] = '[UPDATED]';
        }

        $customer->update($d);

        if ($isManagerialStaff && !isset($d['loyalty_tier']) && isset($d['lifetime_spending'])) {
            $customer->recalculateTier();
            $customer->refresh();
        }

        LoyaltyAuditLog::create([
            'user_id' => $staffUser?->id,
            'customer_id' => $customer->id,
            'action' => 'customer_updated',
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'reason' => $isManagerialStaff
                ? ('Customer profile updated by ' . $staffUser->role)
                : 'Customer profile updated',
        ]);

        \App\Events\PosUpdated::safeDispatch('loyalty');

        return response()->json([
            'ok' => true,
            'customer' => $customer->fresh()->toApi(),
            'message' => 'Customer profile updated successfully.',
        ]);
    }

    public function destroy(Request $r, $id)
    {
        $customer = Customer::findOrFail($id);
        $staffUser = auth('sanctum')->user();

        $snapshot = [
            'id' => $customer->id,
            'member_code' => $customer->member_code,
            'full_name' => $customer->full_name,
            'phone' => $customer->phone,
            'loyalty_tier' => $customer->loyalty_tier,
        ];

        \Illuminate\Support\Facades\DB::transaction(function () use ($customer, $staffUser, $snapshot) {
            if (\Illuminate\Support\Facades\Schema::hasTable('orders')) {
                if (\Illuminate\Support\Facades\Schema::hasColumn('orders', 'customer_id')) {
                    \Illuminate\Support\Facades\DB::table('orders')
                        ->where('customer_id', $customer->id)
                        ->update(['customer_id' => null]);
                }
                if (\Illuminate\Support\Facades\Schema::hasColumn('orders', 'member_id')) {
                    \Illuminate\Support\Facades\DB::table('orders')
                        ->where('member_id', $customer->id)
                        ->update(['member_id' => null]);
                }
            }

            foreach (['customer_memberships', 'loyalty_transactions', 'customer_rewards', 'birthday_rewards'] as $table) {
                if (\Illuminate\Support\Facades\Schema::hasTable($table)) {
                    \Illuminate\Support\Facades\DB::table($table)->where('customer_id', $customer->id)->delete();
                }
            }

            if (\Illuminate\Support\Facades\Schema::hasTable('loyalty_audit_logs')) {
                \Illuminate\Support\Facades\DB::table('loyalty_audit_logs')->where('customer_id', $customer->id)->delete();
            }

            if (\Illuminate\Support\Facades\Schema::hasTable('dining_tables') && \Illuminate\Support\Facades\Schema::hasColumn('dining_tables', 'number')) {
                $tables = \Illuminate\Support\Facades\DB::table('dining_tables')->pluck('number');
                foreach ($tables as $tNum) {
                    $cached = \Illuminate\Support\Facades\Cache::get("table_member:{$tNum}");
                    if (is_array($cached) && (int) ($cached['id'] ?? 0) === (int) $customer->id) {
                        \Illuminate\Support\Facades\Cache::forget("table_member:{$tNum}");
                    }
                }
            }

            LoyaltyAuditLog::create([
                'user_id' => $staffUser?->id,
                'customer_id' => null,
                'action' => 'customer_deleted',
                'old_values' => $snapshot,
                'new_values' => null,
                'reason' => 'VIP member deleted by ' . ($staffUser?->role ?? 'staff'),
            ]);

            $customer->delete();
        });

        \App\Events\PosUpdated::safeDispatch('loyalty');

        return response()->json([
            'ok' => true,
            'message' => 'VIP member removed successfully.',
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
            'token' => 'nullable|string',
            'table_number' => 'nullable|integer',
        ]);

        $reward = Reward::findOrFail($d['reward_id']);

        if (!$reward->is_active) {
            abort(422, 'This reward is currently inactive.');
        }

        if ($customer->points_balance < $reward->points_required) {
            abort(422, "Insufficient points. You need " . (int)$reward->points_required . " points, but only have " . (int)$customer->points_balance . " points.");
        }

        // Determine dining table context
        $table = null;
        if (!empty($d['token'])) {
            $table = DiningTable::where('token', $d['token'])->first();
        }
        if (!$table && !empty($d['table_number'])) {
            $table = DiningTable::where('number', $d['table_number'])->first();
        }
        if (!$table) {
            $allTables = DiningTable::all();
            foreach ($allTables as $cand) {
                if (cache()->get("table_member:{$cand->number}") == $customer->id) {
                    $table = $cand;
                    break;
                }
            }
        }

        $result = DB::transaction(function () use ($customer, $reward, $table) {
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
                'status' => 'redeemed',
                'issued_at' => Carbon::now(),
                'expires_at' => Carbon::now()->addDays(30),
                'redeemed_at' => Carbon::now(),
            ]);

            // 1. Notify staff via ServiceRequest
            $staffNotice = "Points Reward Redeemed: {$customer->full_name} redeemed '{$reward->name}' ({$reward->points_required} pts)";
            if ($reward->reward_type === 'free_item') {
                $staffNotice .= " [Complimentary Item -> KDS Alerted]";
            } elseif ($reward->reward_type === 'discount') {
                $staffNotice .= " [Discount -$" . number_format($reward->reward_value, 2) . " Applied to Bill]";
            }

            ServiceRequest::create([
                'dining_table_id' => $table ? $table->id : null,
                'table_number' => $table ? $table->number : 0,
                'type' => 'reward_redemption',
                'notes' => $staffNotice,
                'is_resolved' => false,
            ]);

            // 2. If Food or Drink item, alert Kitchen KDS & Cashier by creating complimentary order ticket
            $complimentaryOrder = null;
            if ($reward->reward_type === 'free_item') {
                if ($table) {
                    $hasUnpaid = Order::where('dining_table_id', $table->id)->whereNull('paid_at')->exists();
                    $complimentaryOrder = Order::create([
                        'dining_table_id' => $table->id,
                        'status' => 'new',
                        'is_addon' => $hasUnpaid,
                        'notes' => "🎁 Complimentary VIP Reward: {$reward->name} (Redeemed with " . (int)$reward->points_required . " pts)",
                        'customer_name' => "{$customer->full_name} ({$customer->phone})",
                        'member_id' => $customer->id,
                        'customer_id' => $customer->id,
                        'total' => 0.00,
                    ]);

                    $complimentaryOrder->items()->create([
                        'menu_item_id' => null,
                        'name' => "🎁 {$reward->name}",
                        'price' => 0.00,
                        'quantity' => 1,
                        'notes' => "Complimentary VIP Reward (Free with " . (int)$reward->points_required . " pts)",
                        'is_member_exclusive' => true,
                    ]);

                    $cr->update(['order_id' => $complimentaryOrder->id]);
                    $table->update(['status' => 'occupied']);
                }
            }

            // 3. If Discount voucher, record to table's active redeemed discounts so it shows on their bills tab
            if ($reward->reward_type === 'discount') {
                if ($table) {
                    $discountKey = "table_reward_discounts:{$table->number}";
                    $currentDiscounts = cache()->get($discountKey, []);
                    $currentDiscounts[] = [
                        'customer_reward_id' => $cr->id,
                        'reward_id' => $reward->id,
                        'name' => $reward->name,
                        'discount_amount' => (float) $reward->reward_value,
                        'points_redeemed' => (int) $reward->points_required,
                        'customer_id' => $customer->id,
                        'customer_name' => $customer->full_name,
                        'customer_phone' => $customer->phone,
                        'redeemed_at' => Carbon::now()->toIso8601String(),
                    ];
                    cache()->put($discountKey, $currentDiscounts, Carbon::now()->addHours(12));
                }
            }

            return [
                'customer_reward' => $cr,
                'transaction' => $tx,
                'new_points_balance' => (int) round($customer->points_balance),
                'complimentary_order' => $complimentaryOrder,
            ];
        });

        // Broadcast to KDS, Cashier, and Customer in real time
        PosUpdated::safeDispatch();

        return response()->json([
            'ok' => true,
            'message' => "Successfully redeemed {$reward->name}! Staff and Kitchen have been notified.",
            'reward' => $reward,
            'new_points_balance' => $result['new_points_balance'],
            'customer_reward_id' => $result['customer_reward']->id,
            'complimentary_order' => $result['complimentary_order']?->toApi(),
        ]);
    }
}
