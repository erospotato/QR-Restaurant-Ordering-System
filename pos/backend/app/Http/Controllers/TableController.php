<?php
namespace App\Http\Controllers;

use App\Events\PosUpdated;
use App\Models\DiningTable;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TableController extends Controller
{
    // Staff table list with occupancy and status
    public function index(Request $r)
    {
        $user = $r->user();
        $canSeeToken = in_array($user->role, ['admin', 'owner', 'manager']);

        $tables = DiningTable::orderBy('number')->get();
        $unpaidOrders = Order::whereNull('paid_at')->get();

        return $tables->map(function ($t) use ($canSeeToken, $unpaidOrders) {
            $tableOrders = $unpaidOrders->where('dining_table_id', $t->id);
            $totalBill = $tableOrders->sum('total');
            $activeCount = $tableOrders->where('status', '!=', 'served')->count();

            return [
                'id' => $t->id,
                'number' => $t->number,
                'capacity' => $t->capacity ?: 4,
                'status' => $tableOrders->isNotEmpty() ? 'occupied' : ($t->status ?: 'available'),
                'merged_with' => $t->merged_with,
                'order_count' => $tableOrders->count(),
                'active_order_count' => $activeCount,
                'unpaid_total' => (float) $totalBill,
                'token' => $canSeeToken ? $t->token : null,
            ];
        });
    }

    // Customer table check
    public function show(string $token)
    {
        $t = DiningTable::where('token', $token)->first();
        if (!$t) {
            $settled = cache()->get("settled_token:{$token}");
            if ($settled) {
                return response()->json([
                    'settled' => true,
                    'table' => $settled['table_number'] ?? null,
                    'settled_at' => $settled['settled_at'] ?? null,
                    'message' => 'The bill for this table has been settled and this dining session is closed. Please rescan the table QR code to start a new order.',
                ], 200);
            }
            abort(404, 'Invalid table QR token.');
        }

        return [
            'table' => $t->number,
            'capacity' => $t->capacity,
            'status' => $t->status,
            'merged_with' => $t->merged_with,
            'settled' => false,
        ];
    }

    // Customer scans table QR code (resolves to active dining session token)
    public function scan(int $number)
    {
        $t = DiningTable::where('number', $number)->firstOrFail();
        return response()->json([
            'ok' => true,
            'table' => $t->number,
            'token' => $t->token,
        ]);
    }

    // Customer active orders
    public function orders(string $token)
    {
        $t = DiningTable::where('token', $token)->first();
        if (!$t) {
            if (cache()->has("settled_token:{$token}")) {
                return response()->json([]);
            }
            abort(404, 'Invalid table QR token.');
        }

        return Order::with(['items', 'diningTable'])
            ->where('dining_table_id', $t->id)
            ->whereNull('paid_at')
            ->orderBy('id')
            ->get()
            ->map->toApi();
    }

    // Add table (Admin, Owner, Manager)
    public function store(Request $r)
    {
        $d = $r->validate([
            'number' => 'required|integer|min:1|unique:dining_tables,number',
            'capacity' => 'nullable|integer|min:1|max:30',
        ]);

        $table = DiningTable::create([
            'number' => $d['number'],
            'capacity' => $d['capacity'] ?? 4,
            'token' => Str::random(12),
            'status' => 'available',
        ]);

        PosUpdated::safeDispatch();
        return response()->json($table, 201);
    }

    // Delete table (Admin, Owner, Manager)
    public function destroy(int $number)
    {
        $t = DiningTable::where('number', $number)->firstOrFail();
        $hasActive = Order::where('dining_table_id', $t->id)->whereNull('paid_at')->exists();
        if ($hasActive) {
            abort(400, "Cannot remove Table {$number} while it has active unpaid orders.");
        }

        $t->delete();
        PosUpdated::safeDispatch();
        return response()->json(['ok' => true]);
    }

    // Move table orders to another table
    public function move(Request $r)
    {
        $r->validate([
            'from_number' => 'required|integer',
            'to_number' => 'required|integer|different:from_number',
        ]);

        $from = DiningTable::where('number', $r->from_number)->firstOrFail();
        $to = DiningTable::where('number', $r->to_number)->firstOrFail();

        // Move all unpaid orders to destination table
        Order::where('dining_table_id', $from->id)
            ->whereNull('paid_at')
            ->update(['dining_table_id' => $to->id]);

        $from->update(['status' => 'available']);
        $to->update(['status' => 'occupied']);

        PosUpdated::safeDispatch();
        return response()->json(['ok' => true, 'message' => "Orders moved from Table {$from->number} to Table {$to->number}"]);
    }

    // Merge table into another table
    public function merge(Request $r)
    {
        $r->validate([
            'source_number' => 'required|integer',
            'target_number' => 'required|integer|different:source_number',
        ]);

        $source = DiningTable::where('number', $r->source_number)->firstOrFail();
        $target = DiningTable::where('number', $r->target_number)->firstOrFail();

        // Move unpaid orders from source to target
        Order::where('dining_table_id', $source->id)
            ->whereNull('paid_at')
            ->update(['dining_table_id' => $target->id]);

        $source->update(['merged_with' => "Table {$target->number}", 'status' => 'available']);
        $target->update(['status' => 'occupied']);

        PosUpdated::safeDispatch();
        return response()->json(['ok' => true, 'message' => "Table {$source->number} merged with Table {$target->number}"]);
    }

    // Unmerge table
    public function unmerge(Request $r)
    {
        $r->validate(['number' => 'required|integer']);
        $table = DiningTable::where('number', $r->number)->firstOrFail();
        $table->update(['merged_with' => null]);

        PosUpdated::safeDispatch();
        return response()->json(['ok' => true, 'message' => "Table {$table->number} unmerged."]);
    }

    // Pay and close table (Cashier, Manager, Owner, Admin)
    public function pay(Request $r, int $number)
    {
        $t = DiningTable::where('number', $number)->firstOrFail();
        $method = $r->input('payment_method', 'cash');

        Order::where('dining_table_id', $t->id)
            ->whereNull('paid_at')
            ->update([
                'paid_at' => now(),
                'payment_method' => $method,
            ]);

        // Invalidate current table session token so customer cannot access or re-order
        $oldToken = $t->token;
        if ($oldToken) {
            cache()->put("settled_token:{$oldToken}", [
                'table_number' => $t->number,
                'settled_at' => now()->toIso8601String(),
            ], now()->addHours(48));
        }

        // Generate fresh secret token for next dining session
        $newToken = Str::random(12);
        $t->update([
            'token' => $newToken,
            'status' => 'available',
            'merged_with' => null,
        ]);

        // Also unmerge any auxiliary tables that were merged into this table
        DiningTable::where('merged_with', "Table {$number}")
            ->update(['merged_with' => null, 'status' => 'available']);

        PosUpdated::safeDispatch();
        return response()->json(['ok' => true]);
    }

    // Rotate QR code token
    public function rotate(int $number)
    {
        $t = DiningTable::where('number', $number)->firstOrFail();
        $oldToken = $t->token;
        if ($oldToken) {
            cache()->put("settled_token:{$oldToken}", [
                'table_number' => $t->number,
                'settled_at' => now()->toIso8601String(),
            ], now()->addHours(48));
        }

        $t->update(['token' => Str::random(12)]);
        PosUpdated::safeDispatch();
        return response()->json(['ok' => true]);
    }

    // Customer requests assistance (Call Waiter, Water, Bill, Cutlery)
    public function callService(Request $r, string $token)
    {
        $table = DiningTable::where('token', $token)->first();
        if (!$table) {
            if (cache()->has("settled_token:{$token}")) {
                abort(403, 'This dining session is closed because the bill was settled. Please rescan the table QR code.');
            }
            abort(404, 'Invalid table QR token.');
        }

        $type = $r->input('type', 'waiter');
        $notes = $r->input('notes');

        $req = \App\Models\ServiceRequest::create([
            'dining_table_id' => $table->id,
            'table_number' => $table->number,
            'type' => $type,
            'notes' => $notes,
            'is_resolved' => false,
        ]);

        PosUpdated::safeDispatch();
        return response()->json(['ok' => true, 'message' => 'Staff has been notified and will assist you shortly.', 'request' => $req]);
    }

    // Staff list of active service requests
    public function serviceCalls()
    {
        return \App\Models\ServiceRequest::where('is_resolved', false)->latest()->get();
    }

    // Staff resolves service request
    public function resolveServiceCall($call)
    {
        $item = $call instanceof \App\Models\ServiceRequest ? $call : \App\Models\ServiceRequest::findOrFail($call);
        $item->update(['is_resolved' => true]);
        PosUpdated::safeDispatch();
        return response()->json(['ok' => true]);
    }
}
