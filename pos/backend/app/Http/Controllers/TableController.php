<?php
namespace App\Http\Controllers;

use App\Events\PosUpdated;
use App\Models\DiningTable;
use App\Models\Member;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TableController extends Controller
{
    // Staff table list with occupancy and status
    public function index(Request $r)
    {
        $user = $r->user();
        $canSeeToken = in_array($user->role, ['admin', 'owner', 'manager', 'cashier']);

        $tables = DiningTable::orderBy('number')->get();
        $unpaidOrders = Order::whereNull('paid_at')->get();

        return $tables->map(function ($t) use ($canSeeToken, $unpaidOrders) {
            $tableOrders = $unpaidOrders->where('dining_table_id', $t->id);
            $totalBill = $tableOrders->sum('total');
            $activeCount = $tableOrders->where('status', '!=', 'served')->count();

            $tableMemberId = cache()->get("table_member:{$t->number}");
            $tableMember = $tableMemberId ? \App\Models\Customer::find($tableMemberId) : null;
            if (!$tableMember && $tableOrders->isNotEmpty()) {
                $orderWithMem = $tableOrders->first(fn($o) => !empty($o->customer_id) || !empty($o->member_id));
                if ($orderWithMem) {
                    $tableMember = \App\Models\Customer::find($orderWithMem->customer_id ?: $orderWithMem->member_id);
                }
            }

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
                'member' => $tableMember ? $tableMember->toApi() : null,
                'redeemed_discounts' => cache()->get("table_reward_discounts:{$t->number}", []),
            ];
        });
    }

    // Customer table check
    public function show(string $token)
    {
        $t = DiningTable::where('token', $token)->first();
        if (!$t) {
            $settled = cache()->get("settled_token:{$token}");
            if ($settled && !empty($settled['table_number'])) {
                return response()->json([
                    'table' => (int) $settled['table_number'],
                    'settled' => true,
                    'receipt' => $settled['receipt'] ?? null,
                    'message' => 'This dining session has ended and the bill has been settled. Please scan the QR code on your table to start a new session.',
                ], 403);
            }
            abort(404, 'Invalid table QR token.');
        }

        $tableMemberId = cache()->get("table_member:{$t->number}");
        $tableMember = $tableMemberId ? \App\Models\Customer::find($tableMemberId) : null;

        return response()->json([
            'table' => $t->number,
            'capacity' => $t->capacity,
            'status' => $t->status,
            'merged_with' => $t->merged_with,
            'token' => $t->token,
            'settled' => false,
            'member' => $tableMember ? $tableMember->toApi() : null,
            'redeemed_discounts' => cache()->get("table_reward_discounts:{$t->number}", []),
        ]);
    }

    // Customer scans table QR code (resolves to active dining session token)
    public function scan($number)
    {
        $num = (int) $number;
        if ($num <= 0) {
            abort(404, 'Invalid table number.');
        }

        $t = DiningTable::where('number', $num)->first();
        if (!$t) {
            $t = DiningTable::create([
                'number' => $num,
                'capacity' => 4,
                'token' => Str::random(12),
                'status' => 'available',
            ]);
        } elseif (empty($t->token)) {
            $t->update(['token' => Str::random(12)]);
        }

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
            $settled = cache()->get("settled_token:{$token}");
            if ($settled) {
                return response()->json([
                    'settled' => true,
                    'receipt' => $settled['receipt'] ?? null,
                    'message' => 'This dining session has ended and the bill has been settled.',
                ], 403);
            }
            return response()->json([]);
        }

        return Order::with(['items', 'diningTable'])
            ->where('dining_table_id', $t->id)
            ->whereNull('paid_at')
            ->orderBy('id')
            ->get()
            ->map->toApi();
    }

    // Link customer/member to table QR dining session
    public function linkMember(Request $r, string $token)
    {
        $table = DiningTable::where('token', $token)->first();
        if (!$table) {
            abort(404, 'Invalid table token');
        }

        $r->validate([
            'customer_id' => 'nullable|integer',
            'phone' => 'nullable|string',
            'member_id' => 'nullable|integer',
        ]);

        $customerId = $r->input('customer_id') ?: $r->input('member_id');
        $customer = null;
        if ($customerId) {
            $customer = \App\Models\Customer::find($customerId);
        }
        if (!$customer && $r->filled('phone')) {
            $cleanPhone = preg_replace('/\s+/', '', $r->input('phone'));
            $customer = \App\Models\Customer::where('phone', $cleanPhone)->first();
        }

        if (!$customer) {
            abort(404, 'Customer membership profile not found.');
        }

        // Cache customer association for this table number
        cache()->put("table_member:{$table->number}", $customer->id, now()->addHours(12));

        // Also update any unpaid orders for this table
        Order::where('dining_table_id', $table->id)
            ->whereNull('paid_at')
            ->update([
                'member_id' => $customer->id,
                'customer_id' => $customer->id,
                'customer_name' => "{$customer->full_name} ({$customer->phone})",
            ]);

        PosUpdated::safeDispatch();

        return response()->json([
            'ok' => true,
            'table' => $table->number,
            'member' => $customer->toApi(),
            'message' => "Table #{$table->number} successfully linked to member {$customer->full_name}.",
        ]);
    }

    // Unlink member from table
    public function unlinkMember(Request $r, string $token)
    {
        $table = DiningTable::where('token', $token)->first();
        if (!$table) {
            abort(404, 'Invalid table token');
        }

        cache()->forget("table_member:{$table->number}");

        Order::where('dining_table_id', $table->id)
            ->whereNull('paid_at')
            ->update([
                'member_id' => null,
                'customer_id' => null,
            ]);

        PosUpdated::safeDispatch();

        return response()->json([
            'ok' => true,
            'table' => $table->number,
            'message' => "Membership unlinked from Table #{$table->number}.",
        ]);
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
        DiningTable::where('merged_with', "Table {$table->number}")->update(['merged_with' => null]);

        PosUpdated::safeDispatch();
        return response()->json(['ok' => true, 'message' => "Table {$table->number} unmerged."]);
    }

    // Cashier or Manager adds dishes to a table directly
    public function addItem(Request $r, int $number)
    {
        $r->validate([
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|integer',
            'items.*.qty' => 'required|integer|min:1',
            'items.*.notes' => 'nullable|string|max:255',
            'order_notes' => 'nullable|string|max:255',
        ]);

        $table = DiningTable::where('number', $number)->firstOrFail();

        DB::transaction(function () use ($r, $table) {
            $order = Order::where('dining_table_id', $table->id)->whereNull('paid_at')->latest()->first();
            $hasExisting = $order !== null;

            if (!$order) {
                $order = Order::create([
                    'dining_table_id' => $table->id,
                    'status' => 'new',
                    'is_addon' => false,
                    'notes' => $r->input('order_notes', 'Added at Cashier Station'),
                ]);
            }

            foreach ($r->items as $i) {
                $menuItem = MenuItem::where('is_available', true)->find($i['id']);
                if (!$menuItem) continue;

                $qty = (int) ($i['qty'] ?? 1);
                $notes = !empty($i['notes']) ? trim($i['notes']) : null;

                $existingItem = $order->items()
                    ->where('menu_item_id', $menuItem->id)
                    ->where('notes', $notes)
                    ->first();

                $itemPrice = (float) $menuItem->price;

                if ($existingItem) {
                    $existingItem->increment('quantity', $qty);
                } else {
                    $order->items()->create([
                        'menu_item_id' => $menuItem->id,
                        'name' => $menuItem->name,
                        'price' => $itemPrice,
                        'quantity' => $qty,
                        'notes' => $notes ? trim($notes) : null,
                        'is_member_exclusive' => (bool) $menuItem->is_member_exclusive,
                    ]);
                }
            }

            $orderTotal = (float) $order->items()->sum(DB::raw('price * quantity'));
            $order->update([
                'total' => $orderTotal,
                'is_addon' => $hasExisting,
            ]);

            $table->update(['status' => 'occupied']);
        });

        PosUpdated::safeDispatch();
        return response()->json(['ok' => true]);
    }

    // Cashier or Manager removes/decrements an item from a table's unpaid order
    public function removeItem(Request $r, int $number)
    {
        $r->validate([
            'item_id' => 'required|integer',
            'decrement_only' => 'nullable|boolean',
        ]);

        $table = DiningTable::where('number', $number)->firstOrFail();

        DB::transaction(function () use ($r, $table) {
            $item = OrderItem::whereHas('order', function ($q) use ($table) {
                $q->where('dining_table_id', $table->id)->whereNull('paid_at');
            })->findOrFail($r->item_id);

            $order = $item->order;

            if ($r->boolean('decrement_only') && $item->quantity > 1) {
                $item->decrement('quantity', 1);
            } else {
                $item->delete();
            }

            $remainingCount = $order->items()->count();
            if ($remainingCount === 0) {
                $order->delete();
            } else {
                $orderTotal = (float) $order->items()->sum(DB::raw('price * quantity'));
                $order->update(['total' => $orderTotal]);
            }

            $hasActiveOrders = Order::where('dining_table_id', $table->id)->whereNull('paid_at')->exists();
            if (!$hasActiveOrders) {
                $table->update(['status' => 'available']);
            }
        });

        PosUpdated::safeDispatch();
        return response()->json(['ok' => true]);
    }

    // Cashier or Manager cancels the entire order for a table and removes all items
    public function cancelOrder(Request $r, int $number)
    {
        $table = DiningTable::where('number', $number)->firstOrFail();
        $reason = $r->input('reason', 'Cancelled by Cashier');

        $activeOrders = Order::where('dining_table_id', $table->id)->whereNull('paid_at')->get();
        if ($activeOrders->isEmpty()) {
            abort(422, "Table #{$number} has no active orders to cancel.");
        }

        DB::transaction(function () use ($table, $activeOrders) {
            foreach ($activeOrders as $order) {
                // Delete all order items associated with the order
                $order->items()->delete();
                // Delete the unpaid order itself
                $order->delete();
            }

            // Reset table status to available
            $table->update(['status' => 'available']);

            // Clear table member cache if any
            cache()->forget("table_member:{$table->number}");
            cache()->forget("table_reward_discounts:{$table->number}");

            // Reset any merged tables if merged
            DiningTable::where('merged_with', "Table {$table->number}")->update(['status' => 'available']);
        });

        PosUpdated::safeDispatch();

        return response()->json([
            'ok' => true,
            'message' => "Order for Table #{$number} has been completely cancelled and all items removed.",
            'table' => $number,
        ]);
    }

    // Pay and close table (Cashier, Manager, Owner, Admin)
    public function pay(Request $r, int $number)
    {
        $t = DiningTable::where('number', $number)->firstOrFail();
        $method = $r->input('payment_method', 'cash');

        $unpaidOrders = Order::with('items')->where('dining_table_id', $t->id)->whereNull('paid_at')->get();
        if ($unpaidOrders->isEmpty()) {
            abort(422, "Table #{$number} has no active orders to settle.");
        }

        $subtotal = (float) $unpaidOrders->sum('total');
        $discountAmount = max(0, (float) $r->input('discount_amount', 0));
        $tip = max(0, (float) $r->input('tip', 0));
        $tax = max(0, (float) $r->input('tax', 0));
        $finalTotal = max(0, round($subtotal - $discountAmount + $tip + $tax, 2));

        $tendered = null;
        $change = 0;

        if ($method === 'cash') {
            $tendered = (float) $r->input('amount_tendered', 0);
            if ($tendered < $finalTotal) {
                abort(422, "Cash amount given ($" . number_format($tendered, 2) . ") is less than total due ($" . number_format($finalTotal, 2) . "). Please enter the exact or greater amount.");
            }
            $change = max(0, round($tendered - $finalTotal, 2));
        } else {
            $tendered = $finalTotal;
            $change = 0;
        }

        // Process Membership & Loyalty via LoyaltyService
        $memberId = $r->input('member_id');
        $memberPhone = $r->input('member_phone');
        $member = null;

        if ($memberId) {
            $member = \App\Models\Customer::find($memberId);
        } elseif ($memberPhone) {
            $cleanP = trim($memberPhone);
            $member = \App\Models\Customer::where('phone', $cleanP)->first();
        }

        // If not explicitly provided in payment request, check cached table member or active orders
        if (!$member) {
            $cachedMid = cache()->get("table_member:{$t->number}");
            if ($cachedMid) {
                $member = \App\Models\Customer::find($cachedMid);
            }
        }
        if (!$member && $unpaidOrders->isNotEmpty()) {
            $orderWithMid = $unpaidOrders->first(fn($o) => !empty($o->customer_id) || !empty($o->member_id));
            if ($orderWithMid) {
                $member = \App\Models\Customer::find($orderWithMid->customer_id ?: $orderWithMid->member_id);
            }
        }

        $pointsEarned = 0;
        $pointsRedeemed = max(0, (int) $r->input('points_redeemed', 0));
        $loyaltyResult = null;

        $primaryOrder = $unpaidOrders->first();

        if ($member && $primaryOrder) {
            $loyaltyService = app(\App\Services\LoyaltyService::class);
            $loyaltyResult = $loyaltyService->processOrderPayment(
                $primaryOrder,
                $member,
                $finalTotal,
                $pointsRedeemed
            );
            $pointsEarned = $loyaltyResult['points_earned'];
            $pointsRedeemed = $loyaltyResult['points_redeemed'];
        }

        Order::where('dining_table_id', $t->id)
            ->whereNull('paid_at')
            ->update([
                'paid_at' => now(),
                'payment_method' => $method,
                'amount_tendered' => $tendered,
                'change_due' => $change,
                'tip' => $tip,
                'tax' => $tax,
                'discount_amount' => $discountAmount,
                'customer_name' => $member ? "{$member->full_name} ({$member->phone})" : $r->input('customer_name'),
                'member_id' => $member?->id,
                'customer_id' => $member?->id,
                'points_earned' => $pointsEarned,
                'points_redeemed' => $pointsRedeemed,
            ]);

        // Build receipt snapshot for customer & staff display
        $receiptItems = $unpaidOrders->flatMap(fn ($o) => $o->items)->map(fn ($it) => [
            'name' => $it->name,
            'price' => (float) $it->price,
            'qty' => (int) $it->quantity,
        ])->values()->all();

        $receiptPayload = [
            'receipt_no' => $primaryOrder ? str_pad((string) $primaryOrder->id, 4, '0', STR_PAD_LEFT) : '0001',
            'table' => $t->number,
            'date' => now()->toIso8601String(),
            'items' => $receiptItems,
            'subtotal' => round($subtotal, 2),
            'discount_amount' => round($discountAmount, 2),
            'discount_note' => $r->input('discount_note'),
            'tip' => round($tip, 2),
            'tax' => round($tax, 2),
            'final_total' => $finalTotal,
            'payment_method' => $method,
            'amount_tendered' => $tendered,
            'change_due' => $change,
            'customer_name' => $member ? $member->full_name : ($r->input('customer_name') ?: null),
            'member' => $member ? [
                'name' => $member->full_name,
                'tier' => ucfirst($member->loyalty_tier),
                'is_prive' => $member->hasActiveMaisonPrive(),
                'points_earned' => $pointsEarned,
                'points_redeemed' => $pointsRedeemed,
                'points_balance' => (int) round($member->points_balance),
                'tier_upgraded' => $loyaltyResult ? $loyaltyResult['tier_upgraded'] : false,
            ] : null,
        ];

        // Invalidate current table session token and clear linked member
        cache()->forget("table_member:{$t->number}");
        cache()->forget("table_reward_discounts:{$t->number}");
        $oldToken = $t->token;
        if ($oldToken) {
            cache()->put("settled_token:{$oldToken}", [
                'table_number' => $t->number,
                'settled_at' => now()->toIso8601String(),
                'receipt' => $receiptPayload,
            ], now()->addHours(48));
        }

        // Generate fresh secret token for next dining session
        $newToken = Str::random(12);
        $t->update([
            'token' => $newToken,
            'status' => 'available',
            'merged_with' => null,
        ]);

        // Also unmerge and rotate tokens for any auxiliary tables that were merged into this table
        $auxTables = DiningTable::where('merged_with', "Table {$number}")->get();
        foreach ($auxTables as $aux) {
            cache()->forget("table_member:{$aux->number}");
            cache()->forget("table_reward_discounts:{$aux->number}");
            if ($aux->token) {
                cache()->put("settled_token:{$aux->token}", [
                    'table_number' => $aux->number,
                    'settled_at' => now()->toIso8601String(),
                    'receipt' => $receiptPayload,
                ], now()->addHours(48));
            }
            $aux->update([
                'token' => Str::random(12),
                'merged_with' => null,
                'status' => 'available',
            ]);
        }

        PosUpdated::safeDispatch();
        return response()->json([
            'ok' => true,
            'table' => $number,
            'amount_tendered' => $tendered,
            'change_due' => $change,
            'final_total' => $finalTotal,
            'member' => $member ? array_merge($member->toApi(), [
                'points_earned_this_visit' => $pointsEarned,
                'points_redeemed_this_visit' => $pointsRedeemed,
                'tier_upgraded' => $loyaltyResult ? $loyaltyResult['tier_upgraded'] : false,
                'previous_tier' => $loyaltyResult ? $loyaltyResult['previous_tier'] : null,
                'is_maison_prive' => $member->hasActiveMaisonPrive(),
            ]) : null,
        ]);
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
            $settled = cache()->get("settled_token:{$token}");
            if ($settled) {
                abort(403, 'This dining session has ended and the bill has been settled. Please scan the QR code on your table to request service.');
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

    // Network host discovery for mobile QR code scanning
    public function networkInfo(Request $r)
    {
        $serverHost = $r->getHost();
        $hostname = @gethostname() ?: 'localhost';
        $hostIp = @gethostbyname($hostname) ?: '127.0.0.1';

        // Known candidate LAN IPs
        $candidateIps = ['172.20.10.2'];
        if ($hostIp && !in_array($hostIp, ['127.0.0.1', '::1', '0.0.0.0'])) {
            $candidateIps[] = $hostIp;
        }

        return response()->json([
            'wifi_ip' => '172.20.10.2',
            'ips' => array_values(array_unique($candidateIps)),
            'server_host' => $serverHost,
            'port' => 5173,
        ]);
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
