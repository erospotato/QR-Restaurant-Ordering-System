<?php
namespace App\Http\Controllers;

use App\Events\PosUpdated;
use App\Models\DiningTable;
use App\Models\Member;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;

class OrderController extends Controller
{
    // Customer places an order. Table comes from secret QR token; prices come from DB.
    public function store(Request $r)
    {
        $r->validate([
            'token' => 'required|string',
            'notes' => 'nullable|string|max:500',
            'member_phone' => 'nullable|string|max:30',
            'member_id' => 'nullable|integer',
            'items' => 'required|array|min:1|max:50',
            'items.*.id' => 'required|integer',
            'items.*.qty' => 'required|integer|min:1|max:30',
            'items.*.notes' => 'nullable|string|max:255',
        ]);

        $table = DiningTable::where('token', $r->token)->first();
        if (!$table) {
            $settled = cache()->get("settled_token:{$r->token}");
            if ($settled) {
                abort(403, 'This dining session has ended and the bill has been settled. Please scan the QR code on your table to start a new order.');
            }
            abort(404, 'Invalid table QR token. Please scan the QR code on your table.');
        }
        abort_unless(RateLimiter::attempt('order:' . $table->id, 10, fn () => true, 60), 429, 'Too many orders, please wait a moment.');

        // Verify member if provided
        $member = null;
        if ($r->filled('member_id')) {
            $member = Member::find($r->input('member_id'));
        }
        if (!$member && $r->filled('member_phone')) {
            $cleanPhone = preg_replace('/\s+/', '', $r->input('member_phone'));
            $member = Member::where('phone', $cleanPhone)->first();
        }

        DB::transaction(function () use ($r, $table, $member) {
            $hasUnpaid = Order::where('dining_table_id', $table->id)->whereNull('paid_at')->exists();
            $order = Order::create([
                'dining_table_id' => $table->id,
                'is_addon' => $hasUnpaid,
                'notes' => $r->input('notes'),
                'customer_name' => $member ? "{$member->name} ({$member->phone})" : null,
            ]);

            $tierLevels = ['Bronze' => 1, 'Silver' => 2, 'Gold' => 3, 'VIP' => 4];
            $total = 0;
            foreach ($r->items as $i) {
                $m = MenuItem::where('is_available', true)->find($i['id']);
                if (!$m) continue;

                $unitPrice = (float) $m->price;
                $itemNotes = $i['notes'] ?? null;

                $order->items()->create([
                    'menu_item_id' => $m->id,
                    'name' => $m->name,
                    'price' => $unitPrice,
                    'quantity' => $i['qty'],
                    'notes' => $itemNotes ? trim($itemNotes) : null,
                    'is_member_exclusive' => (bool) $m->is_member_exclusive,
                ]);
                $total += $unitPrice * $i['qty'];
            }

            abort_if($total == 0, 422, 'No valid items found in order');
            $order->update(['total' => $total]);

            // Mark table occupied
            $table->update(['status' => 'occupied']);
        });

        PosUpdated::safeDispatch();
        return response()->json(['ok' => true], 201);
    }

    // Active (unpaid) orders for staff KDS & Cashier
    public function staff()
    {
        return Order::with(['items', 'diningTable'])
            ->whereNull('paid_at')
            ->orderBy('id')
            ->get()
            ->map->toApi();
    }

    // Kitchen staff advances status: new -> preparing -> ready -> served
    public function status(Request $r, $order)
    {
        $o = $order instanceof Order ? $order : Order::findOrFail($order);
        $o->update($r->validate(['status' => 'required|in:new,preparing,ready,served']));
        PosUpdated::safeDispatch();
        return response()->json(['ok' => true]);
    }

    // Sales and analytics dashboard for Owner and Manager
    public function sales(Request $r)
    {
        $today = Carbon::today();
        $startOfWeek = Carbon::now()->startOfWeek();
        $startOfMonth = Carbon::now()->startOfMonth();

        $todaySales = (float) Order::whereNotNull('paid_at')->whereDate('paid_at', $today)->sum('total');
        $weekSales = (float) Order::whereNotNull('paid_at')->where('paid_at', '>=', $startOfWeek)->sum('total');
        $monthSales = (float) Order::whereNotNull('paid_at')->where('paid_at', '>=', $startOfMonth)->sum('total');
        $allTimeSales = (float) Order::whereNotNull('paid_at')->sum('total');

        $todayOrdersCount = Order::whereNotNull('paid_at')->whereDate('paid_at', $today)->count();
        $allOrdersCount = Order::whereNotNull('paid_at')->count();
        $activeOrdersCount = Order::whereNull('paid_at')->where('status', '!=', 'served')->count();

        // Top selling dishes (from paid orders)
        $topDishes = OrderItem::join('orders', 'order_items.order_id', '=', 'orders.id')
            ->whereNotNull('orders.paid_at')
            ->select(
                'order_items.name',
                DB::raw('SUM(order_items.quantity) as total_qty'),
                DB::raw('SUM(order_items.quantity * order_items.price) as total_revenue')
            )
            ->groupBy('order_items.name')
            ->orderByDesc('total_qty')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'name' => $row->name,
                'qty' => (int) $row->total_qty,
                'revenue' => (float) $row->total_revenue,
            ]);

        // Recent paid orders history (up to 20)
        $recentOrders = Order::with(['items', 'diningTable'])
            ->whereNotNull('paid_at')
            ->orderByDesc('paid_at')
            ->limit(20)
            ->get()
            ->map(fn ($o) => [
                'id' => $o->id,
                'table' => $o->diningTable ? $o->diningTable->number : null,
                'total' => (float) $o->total,
                'payment_method' => $o->payment_method ?: 'cash',
                'paid_at' => $o->paid_at->toIso8601String(),
                'ts' => $o->paid_at->timestamp * 1000,
                'items_count' => $o->items->sum('quantity'),
                'items' => $o->items->map(fn ($i) => [
                    'name' => $i->name,
                    'qty' => (int) $i->quantity,
                    'price' => (float) $i->price,
                ]),
            ]);

        return response()->json([
            'today' => $todaySales,
            'week' => $weekSales,
            'month' => $monthSales,
            'total' => $allTimeSales,
            'today_orders' => $todayOrdersCount,
            'all_orders' => $allOrdersCount,
            'active_orders' => $activeOrdersCount,
            'top_dishes' => $topDishes,
            'recent_orders' => $recentOrders,
        ]);
    }
}
