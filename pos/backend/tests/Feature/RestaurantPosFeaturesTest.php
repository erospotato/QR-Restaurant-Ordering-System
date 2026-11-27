<?php

namespace Tests\Feature;

use App\Models\{DiningTable, Ingredient, MenuItem, Order, StockAlert, User};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RestaurantPosFeaturesTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Seed database
        $this->artisan('db:seed');
    }

    public function test_customer_menu_filtering_and_images(): void
    {
        // 1. All available items
        $res = $this->getJson('/api/menu');
        $res->assertStatus(200);
        $items = $res->json();
        $this->assertNotEmpty($items);
        $this->assertArrayHasKey('is_top_sale', $items[0]);
        $this->assertArrayHasKey('is_signature', $items[0]);
        $this->assertArrayHasKey('image_url', $items[0]);

        // 2. Filter by top sales
        $topRes = $this->getJson('/api/menu?category=top_sale');
        $topRes->assertStatus(200);
        foreach ($topRes->json() as $item) {
            $this->assertTrue($item['is_top_sale']);
        }

        // 3. Filter by signatures
        $sigRes = $this->getJson('/api/menu?category=signature');
        $sigRes->assertStatus(200);
        foreach ($sigRes->json() as $item) {
            $this->assertTrue($item['is_signature']);
        }

        // 4. Search query
        $searchRes = $this->getJson('/api/menu?search=Pizza');
        $searchRes->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, count($searchRes->json()));
    }

    public function test_customer_can_place_order_with_dish_notes_and_reorder(): void
    {
        $table = DiningTable::first();
        $dish1 = MenuItem::first();
        $dish2 = MenuItem::skip(1)->first();

        // 1. Customer checks table
        $tableRes = $this->getJson("/api/tables/{$table->token}");
        $tableRes->assertStatus(200)->assertJson(['table' => $table->number]);

        // 2. Place round 1 order with dish notes
        $orderRes = $this->postJson('/api/orders', [
            'token' => $table->token,
            'notes' => 'Please bring cold water first',
            'items' => [
                ['id' => $dish1->id, 'qty' => 2, 'notes' => 'Extra crispy please'],
                ['id' => $dish2->id, 'qty' => 1, 'notes' => 'No spicy, mild'],
            ],
        ]);
        $orderRes->assertStatus(201)->assertJson(['ok' => true]);

        // Verify table status is now occupied
        $this->assertEquals('occupied', $table->fresh()->status);

        // 3. Customer checks their active orders
        $myOrders = $this->getJson("/api/tables/{$table->token}/orders");
        $myOrders->assertStatus(200);
        $ordersList = $myOrders->json();
        $this->assertCount(1, $ordersList);
        $this->assertEquals('Extra crispy please', $ordersList[0]['items'][0]['notes']);
        $this->assertEquals('Please bring cold water first', $ordersList[0]['notes']);
        $this->assertFalse($ordersList[0]['addon']);

        // 4. Customer re-orders (Round 2 add-on order)
        $reorderRes = $this->postJson('/api/orders', [
            'token' => $table->token,
            'notes' => 'Second round drinks',
            'items' => [
                ['id' => $dish1->id, 'qty' => 1, 'notes' => 'Less ice'],
            ],
        ]);
        $reorderRes->assertStatus(201);

        $updatedOrders = $this->getJson("/api/tables/{$table->token}/orders")->json();
        $this->assertCount(2, $updatedOrders);
        $this->assertTrue($updatedOrders[1]['addon']); // second order marked as add-on!
    }

    public function test_kitchen_kds_and_stock_alert_flow(): void
    {
        $kitchenUser = User::where('role', 'kitchen')->first();
        $table = DiningTable::first();
        $dish = MenuItem::first();

        // Place an order first
        $this->postJson('/api/orders', [
            'token' => $table->token,
            'items' => [['id' => $dish->id, 'qty' => 1, 'notes' => 'Gluten free']],
        ]);

        // 1. Kitchen staff login
        $loginRes = $this->postJson('/api/login', [
            'email' => $kitchenUser->email,
            'password' => 'password123',
        ]);
        $loginRes->assertStatus(200);
        $token = $loginRes->json('token');

        // 2. Kitchen fetches active orders
        $ordersRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/staff/orders');
        $ordersRes->assertStatus(200);
        $activeOrders = $ordersRes->json();
        $this->assertNotEmpty($activeOrders);
        $orderId = $activeOrders[0]['id'];

        // 3. Kitchen marks order preparing then ready
        $status1 = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/orders/{$orderId}", ['status' => 'preparing']);
        $status1->assertStatus(200);

        $status2 = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/orders/{$orderId}", ['status' => 'ready']);
        $status2->assertStatus(200);

        // 4. Kitchen reports low ingredient stock
        $ingredient = Ingredient::first();
        $notifyRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/staff/ingredients/{$ingredient->id}/notify-low", [
                'note' => 'Only 1 container left on counter',
            ]);
        $notifyRes->assertStatus(200)->assertJson(['ok' => true]);

        // Verify alert was created
        $this->assertDatabaseHas('stock_alerts', [
            'ingredient_id' => $ingredient->id,
            'is_resolved' => false,
        ]);

        // 5. Kitchen removes an unavailable item from a table's active order
        $dish2 = MenuItem::skip(1)->first();
        $table2 = DiningTable::skip(1)->first();
        $this->postJson('/api/orders', [
            'token' => $table2->token,
            'items' => [
                ['id' => $dish->id, 'qty' => 1],
                ['id' => $dish2->id, 'qty' => 2],
            ],
        ])->assertStatus(201);

        $table2Orders = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/staff/orders')
            ->json();
        $targetOrder = collect($table2Orders)->firstWhere('table', $table2->number);
        $this->assertNotNull($targetOrder);
        $itemToRemove = $targetOrder['items'][0];

        $removeRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/staff/tables/{$table2->number}/remove-item", [
                'item_id' => $itemToRemove['id'],
            ]);
        $removeRes->assertStatus(200)->assertJson(['ok' => true]);

        $this->assertDatabaseMissing('order_items', ['id' => $itemToRemove['id']]);
        $this->assertEquals(
            round((float) $dish2->price * 2, 2),
            round((float) Order::find($targetOrder['id'])->total, 2)
        );
    }

    public function test_cashier_and_table_payment(): void
    {
        $cashier = User::where('role', 'cashier')->first();
        $table = DiningTable::first();
        $dish = MenuItem::first();

        // Place order
        $this->postJson('/api/orders', [
            'token' => $table->token,
            'items' => [['id' => $dish->id, 'qty' => 2]],
        ]);

        // Cashier login
        $token = $this->postJson('/api/login', [
            'email' => $cashier->email,
            'password' => 'password123',
        ])->json('token');

        // Fetch tables
        $tablesRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/staff/tables');
        $tablesRes->assertStatus(200);

        // Process table payment with payment method
        $payRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/tables/{$table->number}/pay", [
                'payment_method' => 'card',
            ]);
        $payRes->assertStatus(200)->assertJson(['ok' => true]);

        // Verify orders are paid and table status is free/available
        $this->assertEquals(0, Order::where('dining_table_id', $table->id)->whereNull('paid_at')->count());
        $this->assertEquals('available', $table->fresh()->status);
    }

    public function test_manager_table_management_and_dashboard(): void
    {
        $manager = User::where('role', 'manager')->first();
        $token = $this->postJson('/api/login', [
            'email' => $manager->email,
            'password' => 'password123',
        ])->json('token');

        // 1. Add table
        $addRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/staff/tables', ['number' => 88, 'capacity' => 6]);
        $addRes->assertStatus(201);
        $this->assertDatabaseHas('dining_tables', ['number' => 88]);

        // 2. Move table orders
        $t1 = DiningTable::where('number', 1)->first();
        $t2 = DiningTable::where('number', 2)->first();
        $dish = MenuItem::first();

        $this->postJson('/api/orders', [
            'token' => $t1->token,
            'items' => [['id' => $dish->id, 'qty' => 1]],
        ]);

        $moveRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/staff/tables/move', [
                'from_number' => 1,
                'to_number' => 2,
            ]);
        $moveRes->assertStatus(200)->assertJson(['ok' => true]);

        // 3. Merge tables
        $mergeRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/staff/tables/merge', [
                'source_number' => 3,
                'target_number' => 4,
            ]);
        $mergeRes->assertStatus(200)->assertJson(['ok' => true]);
        $this->assertEquals('Table 4', DiningTable::where('number', 3)->value('merged_with'));

        // 4. Unmerge table
        $unmergeRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/staff/tables/unmerge', ['number' => 3]);
        $unmergeRes->assertStatus(200);
        $this->assertNull(DiningTable::where('number', 3)->value('merged_with'));

        // 5. Delete empty table
        $delRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson('/api/staff/tables/88');
        $delRes->assertStatus(200);
        $this->assertDatabaseMissing('dining_tables', ['number' => 88]);

        // 6. Check Sales Dashboard
        $salesRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/staff/sales');
        $salesRes->assertStatus(200);
        $this->assertArrayHasKey('today', $salesRes->json());
        $this->assertArrayHasKey('top_dishes', $salesRes->json());
        $this->assertArrayHasKey('recent_orders', $salesRes->json());
    }

    public function test_admin_staff_management(): void
    {
        $admin = User::where('role', 'admin')->first();
        $token = $this->postJson('/api/login', [
            'email' => $admin->email,
            'password' => 'password123',
        ])->json('token');

        // 1. List staff users
        $listRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/staff/users');
        $listRes->assertStatus(200);

        // 2. Create new staff member
        $createRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/staff/users', [
                'name' => 'Sous Chef Marco',
                'email' => 'marco@mail.com',
                'password' => 'password123',
                'role' => 'kitchen',
            ]);
        $createRes->assertStatus(201);
        $this->assertDatabaseHas('users', ['email' => 'marco@mail.com', 'role' => 'kitchen']);
    }
}
