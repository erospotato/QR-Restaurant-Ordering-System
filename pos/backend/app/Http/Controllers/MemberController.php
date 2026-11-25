<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Member;
use App\Models\Order;
use App\Services\LoyaltyService;
use App\Services\PointsService;
use Illuminate\Http\Request;

class MemberController extends Controller
{
    protected LoyaltyService $loyaltyService;
    protected PointsService $pointsService;

    public function __construct(LoyaltyService $loyaltyService, PointsService $pointsService)
    {
        $this->loyaltyService = $loyaltyService;
        $this->pointsService = $pointsService;
    }

    /**
     * Search members for Cashier POS autocomplete / quick selection
     */
    public function search(Request $r)
    {
        $q = trim($r->query('q', ''));
        if (!$q) {
            return response()->json(Customer::orderByDesc('updated_at')->limit(10)->get()->map->toApi());
        }

        $customers = Customer::where('phone', 'like', "%{$q}%")
            ->orWhere('full_name', 'like', "%{$q}%")
            ->orWhere('id', $q)
            ->limit(10)
            ->get();

        return response()->json($customers->map->toApi());
    }

    /**
     * Customer verification of membership requiring BOTH member number/phone AND password
     */
    public function verify(Request $r)
    {
        return app(CustomerController::class)->verify($r);
    }

    /**
     * Single member lookup by phone or ID
     */
    public function lookup(Request $r)
    {
        $phone = trim($r->input('phone', $r->query('phone', $r->query('q', $r->input('number', '')))));
        if (!$phone) {
            abort(422, 'Phone number or member ID is required.');
        }

        $cleanPhone = preg_replace('/[^0-9]/', '', $phone);

        $customer = Customer::where('phone', $phone)
            ->orWhere('phone', $cleanPhone)
            ->orWhere('id', $phone)
            ->first();

        if (!$customer) {
            abort(404, 'Member not found. Check the phone number or register a new membership.');
        }

        // If not authenticated as staff, require password verification
        if (!auth('sanctum')->check()) {
            $password = trim($r->input('password', $r->query('password', '')));
            if (!$password) {
                abort(422, 'Membership password is required to access your account.');
            }
            if (!$customer->verifyPassword($password)) {
                abort(401, 'Incorrect membership password or PIN. Please try again.');
            }
        }

        $this->loyaltyService->checkAndGenerateBirthdayReward($customer);

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

        return response()->json($data);
    }

    /**
     * Customer or Staff registration of a new member
     */
    public function register(Request $r)
    {
        return app(CustomerController::class)->store($r);
    }

    /**
     * List all members for staff / manager / cashier / admin / owner
     */
    public function index(Request $r)
    {
        $q = trim($r->query('q', ''));
        $tier = trim($r->query('tier', 'all'));
        $sort = $r->query('sort', 'points');
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

        $sortMap = [
            'points' => 'points_balance',
            'points_balance' => 'points_balance',
            'total_spent' => 'lifetime_spending',
            'lifetime_spending' => 'lifetime_spending',
            'name' => 'full_name',
            'created_at' => 'created_at',
            'updated_at' => 'updated_at',
        ];
        $col = $sortMap[$sort] ?? 'points_balance';
        $query->orderBy($col, $dir);

        $customers = $query->get();

        $allCustomers = Customer::all();
        $stats = [
            'total_members' => $allCustomers->count(),
            'vip_count' => $allCustomers->where('loyalty_tier', 'vip')->count(),
            'gold_count' => $allCustomers->where('loyalty_tier', 'gold')->count(),
            'silver_count' => $allCustomers->where('loyalty_tier', 'silver')->count(),
            'bronze_count' => $allCustomers->where('loyalty_tier', 'bronze')->count(),
            'prive_count' => Customer::whereHas('activeMembership.plan', fn ($sq) => $sq->where('name', 'Maison Privé'))->count(),
            'total_points' => (int) round($allCustomers->sum('points_balance')),
            'total_spent' => (float) round($allCustomers->sum('lifetime_spending'), 2),
        ];

        return response()->json([
            'members' => $customers->map->toApi(),
            'customers' => $customers->map->toApi(),
            'stats' => $stats,
        ]);
    }

    /**
     * Show single member with their order history
     */
    public function show($id)
    {
        return app(CustomerController::class)->show($id);
    }
}
