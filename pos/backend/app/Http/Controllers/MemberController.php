<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\Order;
use Illuminate\Http\Request;

class MemberController extends Controller
{
    /**
     * Search members for Cashier POS autocomplete / quick selection
     */
    public function search(Request $r)
    {
        $q = trim($r->query('q', ''));
        if (!$q) {
            return response()->json(Member::orderByDesc('updated_at')->limit(10)->get()->map->toApi());
        }

        $members = Member::where('phone', 'like', "%{$q}%")
            ->orWhere('name', 'like', "%{$q}%")
            ->limit(10)
            ->get();

        return response()->json($members->map->toApi());
    }

    /**
     * Single member lookup by phone or ID (Public / Customer & Staff)
     */
    public function lookup(Request $r)
    {
        $phone = trim($r->query('phone', $r->query('q', '')));
        if (!$phone) {
            abort(422, 'Phone number or member ID is required.');
        }

        // Clean phone number (strip whitespace or dashes)
        $cleanPhone = preg_replace('/[^0-9]/', '', $phone);

        $member = Member::where('phone', $phone)
            ->orWhere('phone', $cleanPhone)
            ->orWhere('id', $phone)
            ->first();

        if (!$member) {
            abort(404, 'Member not found. Check the phone number or register a new membership.');
        }

        // Include recent order history for this member
        $recentOrders = Order::where('member_id', $member->id)
            ->whereNotNull('paid_at')
            ->orderByDesc('paid_at')
            ->limit(10)
            ->get()
            ->map(fn ($o) => [
                'id' => $o->id,
                'table' => $o->diningTable?->number,
                'total' => (float) $o->total,
                'points_earned' => (int) $o->points_earned,
                'paid_at' => $o->paid_at->toIso8601String(),
                'items_count' => $o->items->sum('quantity'),
            ]);

        $data = $member->toApi();
        $data['recent_orders'] = $recentOrders;

        return response()->json($data);
    }

    /**
     * Customer or Staff registration of a new member
     */
    public function register(Request $r)
    {
        $d = $r->validate([
            'name' => 'required|string|max:100',
            'phone' => 'required|string|max:25',
            'email' => 'nullable|email|max:100',
        ]);

        $cleanPhone = trim($d['phone']);

        $existing = Member::where('phone', $cleanPhone)->first();
        if ($existing) {
            // If already exists, return existing profile
            return response()->json([
                'member' => $existing->toApi(),
                'already_registered' => true,
                'message' => 'Welcome back! You are already a member.',
            ]);
        }

        // 50 Welcome Points for new registrations!
        $member = Member::create([
            'name' => trim($d['name']),
            'phone' => $cleanPhone,
            'email' => isset($d['email']) ? trim($d['email']) : null,
            'tier' => 'bronze',
            'points' => 50,
            'total_spent' => 0,
            'visits_count' => 0,
        ]);

        return response()->json([
            'member' => $member->toApi(),
            'already_registered' => false,
            'message' => 'Congratulations! Welcome to MOLS MAISON Membership (50 Bonus Welcome Points added)!',
        ], 201);
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

        $query = Member::query();

        if ($q) {
            $cleanQ = preg_replace('/[^0-9]/', '', $q);
            $query->where(function ($sub) use ($q, $cleanQ) {
                $sub->where('name', 'like', "%{$q}%")
                    ->orWhere('phone', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%");
                if ($cleanQ) {
                    $sub->orWhere('phone', 'like', "%{$cleanQ}%");
                }
            });
        }

        if ($tier && $tier !== 'all') {
            $query->where('tier', strtolower($tier));
        }

        $allowedSorts = ['points', 'total_spent', 'visits_count', 'updated_at', 'name', 'created_at'];
        if (in_array($sort, $allowedSorts)) {
            $query->orderBy($sort, $dir);
        } else {
            $query->orderBy('points', 'desc');
        }

        $members = $query->get();

        // Calculate aggregate statistics for the entire membership base
        $allMembers = Member::all();
        $stats = [
            'total_members' => $allMembers->count(),
            'vip_count' => $allMembers->where('tier', 'vip')->count(),
            'gold_count' => $allMembers->where('tier', 'gold')->count(),
            'silver_count' => $allMembers->where('tier', 'silver')->count(),
            'bronze_count' => $allMembers->where('tier', 'bronze')->count(),
            'total_points' => (int) $allMembers->sum('points'),
            'total_spent' => (float) $allMembers->sum('total_spent'),
        ];

        return response()->json([
            'members' => $members->map->toApi(),
            'stats' => $stats,
        ]);
    }

    /**
     * Show single member with their order history
     */
    public function show($id)
    {
        $member = Member::findOrFail($id);

        $recentOrders = Order::where('member_id', $member->id)
            ->whereNotNull('paid_at')
            ->orderByDesc('paid_at')
            ->limit(20)
            ->get()
            ->map(fn ($o) => [
                'id' => $o->id,
                'table' => $o->diningTable?->number,
                'total' => (float) $o->total,
                'points_earned' => (int) $o->points_earned,
                'paid_at' => $o->paid_at->toIso8601String(),
                'payment_method' => $o->payment_method,
                'items_count' => $o->items->sum('quantity'),
                'items_summary' => $o->items->map(fn ($it) => "{$it->quantity}x {$it->menuItem?->name}")->filter()->join(', '),
            ]);

        $data = $member->toApi();
        $data['recent_orders'] = $recentOrders;

        return response()->json($data);
    }
}
