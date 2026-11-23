<?php
namespace Database\Seeders;

use App\Models\{DiningTable, Ingredient, MenuItem, StockAlert, User};
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Staff Users for each role
        $users = [
            ['name' => 'Restaurant Owner', 'email' => 'owner@mail.com', 'password' => 'password123', 'role' => 'owner'],
            ['name' => 'Floor Manager', 'email' => 'manager@mail.com', 'password' => 'password123', 'role' => 'manager'],
            ['name' => 'Front Cashier', 'email' => 'cashier@mail.com', 'password' => 'password123', 'role' => 'cashier'],
            ['name' => 'Head Chef Anna', 'email' => 'kitchen@mail.com', 'password' => 'password123', 'role' => 'kitchen'],
            ['name' => 'System Admin', 'email' => 'admin@mail.com', 'password' => 'password123', 'role' => 'admin'],
        ];

        foreach ($users as $u) {
            User::updateOrCreate(['email' => $u['email']], [
                'name' => $u['name'],
                'password' => Hash::make($u['password']),
                'role' => $u['role'],
            ]);
        }

        // 2. Dining Tables 1..10
        for ($n = 1; $n <= 10; $n++) {
            DiningTable::firstOrCreate(
                ['number' => $n],
                [
                    'token' => Str::random(12),
                    'capacity' => $n <= 2 ? 2 : ($n <= 6 ? 4 : 6),
                    'status' => 'available',
                ]
            );
        }

        // 3. Menu Items with Top Sales, Signatures, and Food Images
        $items = [
            // Mains
            [
                'name' => 'Truffle Wagyu Burger',
                'description' => 'A5 Wagyu patty, black truffle aioli, aged cheddar, caramelized onion, brioche bun.',
                'price' => 18.50,
                'category' => 'Mains',
                'image_path' => 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => true,
                'is_signature' => true,
            ],
            [
                'name' => 'Wood-Fired Margherita Pizza',
                'description' => 'San Marzano tomatoes, fresh buffalo mozzarella, aromatic sweet basil, extra virgin olive oil.',
                'price' => 14.00,
                'category' => 'Mains',
                'image_path' => 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => true,
                'is_signature' => false,
            ],
            [
                'name' => 'Spicy Diavola Pizza',
                'description' => 'Spicy Calabrian salami, chili infused honey, crushed tomatoes, fresh fior di latte.',
                'price' => 16.50,
                'category' => 'Mains',
                'image_path' => 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => false,
                'is_signature' => true,
            ],
            [
                'name' => 'Creamy Garlic Butter Salmon',
                'description' => 'Pan-seared Atlantic salmon fillet with garlic butter cream sauce and roasted asparagus.',
                'price' => 22.00,
                'category' => 'Mains',
                'image_path' => 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => false,
                'is_signature' => true,
            ],
            [
                'name' => 'Prime Angus Ribeye (250g)',
                'description' => 'Char-grilled grain-fed Angus ribeye with roasted garlic herb butter, chimichurri, and sea salt.',
                'price' => 28.50,
                'category' => 'Mains',
                'image_path' => 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => true,
                'is_signature' => true,
            ],
            [
                'name' => 'Truffle Carbonara Tagliatelle',
                'description' => 'Fresh handmade pasta, crispy guanciale, pecorino romano, egg yolk cream, shaved summer truffle.',
                'price' => 17.50,
                'category' => 'Mains',
                'image_path' => 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => false,
                'is_signature' => true,
            ],
            [
                'name' => 'Crispy Skin Roast Half Chicken',
                'description' => 'Herb-brined slow roasted chicken with creamy polenta, charred broccolini, and thyme jus.',
                'price' => 19.00,
                'category' => 'Mains',
                'image_path' => 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => false,
                'is_signature' => false,
            ],
            [
                'name' => 'Seafood Marinara Linguine',
                'description' => 'Wild tiger prawns, calamari rings, black mussels in white wine garlic tomato passata.',
                'price' => 21.00,
                'category' => 'Mains',
                'image_path' => 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => true,
                'is_signature' => false,
            ],
            [
                'name' => 'Wild Forest Mushroom Risotto',
                'description' => 'Carnaroli rice simmered with porcini broth, sautéed wild mushrooms, white truffle, aged parmesan.',
                'price' => 16.00,
                'category' => 'Mains',
                'image_path' => 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => false,
                'is_signature' => false,
            ],
            [
                'name' => 'Glazed Beef Short Rib Rice Bowl',
                'description' => 'Slow-braised short rib glazed in sweet soy mirin over koshihikari rice, onsen egg, and scallions.',
                'price' => 18.00,
                'category' => 'Mains',
                'image_path' => 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => true,
                'is_signature' => false,
            ],

            // Starters
            [
                'name' => 'Crispy Truffle Fries',
                'description' => 'Golden hand-cut fries tossed in white truffle oil, shaved parmesan, and rosemary.',
                'price' => 8.50,
                'category' => 'Starters',
                'image_path' => 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => true,
                'is_signature' => false,
            ],
            [
                'name' => 'Classic Caesar Salad',
                'description' => 'Crisp romaine lettuce, house-made croutons, bacon crisps, creamy garlic dressing, shaved parmesan.',
                'price' => 9.50,
                'category' => 'Starters',
                'image_path' => 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => false,
                'is_signature' => false,
            ],
            [
                'name' => 'Buffalo Chicken Wings',
                'description' => 'Crispy wings glazed in zesty buffalo sauce served with blue cheese dip and celery sticks.',
                'price' => 11.00,
                'category' => 'Starters',
                'image_path' => 'https://images.unsplash.com/photo-1527477321055-436158a2b005?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => true,
                'is_signature' => false,
            ],
            [
                'name' => 'Burrata & Heirloom Tomatoes',
                'description' => 'Fresh Pugliese burrata, marinated heirloom tomatoes, basil pesto, balsamic reduction, grilled sourdough.',
                'price' => 12.50,
                'category' => 'Starters',
                'image_path' => 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => false,
                'is_signature' => true,
            ],
            [
                'name' => 'Crispy Salt & Pepper Calamari',
                'description' => 'Flash-fried tender squid dusted with Sichuan pepper, sea salt, smoked paprika aioli, lime.',
                'price' => 10.50,
                'category' => 'Starters',
                'image_path' => 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => false,
                'is_signature' => false,
            ],
            [
                'name' => 'Sizzling Garlic Butter Prawns',
                'description' => 'Wild tiger prawns sizzled in extra virgin olive oil, garlic confit, chili flakes, warm baguette.',
                'price' => 13.00,
                'category' => 'Starters',
                'image_path' => 'https://images.unsplash.com/photo-1559742811-822873691df8?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => false,
                'is_signature' => true,
            ],
            [
                'name' => 'Truffle Mushroom Arancini (4 pcs)',
                'description' => 'Crispy saffron risotto croquettes filled with melted fontina cheese and black truffle emulsion.',
                'price' => 9.00,
                'category' => 'Starters',
                'image_path' => 'https://images.unsplash.com/photo-1541529086526-db283c563270?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => false,
                'is_signature' => false,
            ],
            [
                'name' => 'Roasted Tomato Basil Soup',
                'description' => 'Slow-roasted San Marzano tomato velouté with garlic herb croutons and fresh basil cream.',
                'price' => 7.50,
                'category' => 'Starters',
                'image_path' => 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => false,
                'is_signature' => false,
            ],

            // Desserts
            [
                'name' => 'Traditional Tiramisu',
                'description' => 'Espresso-soaked ladyfingers layered with rich mascarpone zabaglione and Dutch cocoa powder.',
                'price' => 8.00,
                'category' => 'Desserts',
                'image_path' => 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => true,
                'is_signature' => true,
            ],
            [
                'name' => 'Warm Chocolate Lava Cake',
                'description' => 'Decadent Belgian molten chocolate cake with vanilla bean gelato and berry compote.',
                'price' => 9.00,
                'category' => 'Desserts',
                'image_path' => 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => false,
                'is_signature' => true,
            ],
            [
                'name' => 'Madagascar Vanilla Crème Brûlée',
                'description' => 'Silky French custard infused with Bourbon vanilla beans and crisp caramelized sugar shell.',
                'price' => 8.50,
                'category' => 'Desserts',
                'image_path' => 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => true,
                'is_signature' => false,
            ],
            [
                'name' => 'New York Baked Cheesecake',
                'description' => 'Dense velvety cream cheese on buttery graham crust topped with wild strawberry reduction.',
                'price' => 8.00,
                'category' => 'Desserts',
                'image_path' => 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => false,
                'is_signature' => false,
            ],
            [
                'name' => 'Cinnamon Sugar Churros',
                'description' => 'Crisp golden churros tossed in Ceylon cinnamon and sugar, served with warm chocolate ganache.',
                'price' => 7.50,
                'category' => 'Desserts',
                'image_path' => 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => false,
                'is_signature' => false,
            ],
            [
                'name' => 'Berry Pistachio Frangipane Tart',
                'description' => 'Shortcrust shell filled with Bronte pistachio cream, whipped white chocolate, and fresh raspberries.',
                'price' => 8.50,
                'category' => 'Desserts',
                'image_path' => 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => false,
                'is_signature' => true,
            ],

            // Drinks
            [
                'name' => 'Signature Iced Matcha Latte',
                'description' => 'Ceremonial grade Uji matcha whisked with oat milk and Madagascar vanilla syrup.',
                'price' => 5.50,
                'category' => 'Drinks',
                'image_path' => 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => true,
                'is_signature' => true,
            ],
            [
                'name' => 'Single-Origin Cold Brew',
                'description' => '18-hour slow steeped single-origin Ethiopian beans with floral and citrus undertones.',
                'price' => 4.50,
                'category' => 'Drinks',
                'image_path' => 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => false,
                'is_signature' => false,
            ],
            [
                'name' => 'Fresh Lemon Mint Sparkler',
                'description' => 'Freshly squeezed Sicilian lemon, crushed garden mint, sparkling water, organic agave.',
                'price' => 4.00,
                'category' => 'Drinks',
                'image_path' => 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => false,
                'is_signature' => false,
            ],
            [
                'name' => 'Passionfruit Lychee Fizz',
                'description' => 'Crushed fresh passionfruit pulp, lychee nectar, sparkling soda water, and kaffir lime.',
                'price' => 5.00,
                'category' => 'Drinks',
                'image_path' => 'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => true,
                'is_signature' => false,
            ],
            [
                'name' => 'Iced Salted Caramel Latte',
                'description' => 'Chilled whole milk, double shot espresso ristretto float, and house sea salt caramel drizzle.',
                'price' => 5.50,
                'category' => 'Drinks',
                'image_path' => 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => false,
                'is_signature' => true,
            ],
            [
                'name' => 'Hibiscus Strawberry Iced Tea',
                'description' => 'Cold-steeped organic Egyptian hibiscus flowers, fresh strawberry slices, and raw wildflower honey.',
                'price' => 4.50,
                'category' => 'Drinks',
                'image_path' => 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => false,
                'is_signature' => false,
            ],
            [
                'name' => 'Fresh Cold-Pressed Orange Juice',
                'description' => '100% pure cold-pressed Valencia oranges, no added sugar, served chilled with pulp.',
                'price' => 4.50,
                'category' => 'Drinks',
                'image_path' => 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => false,
                'is_signature' => false,
            ],
            [
                'name' => 'Sparkling Mineral Water (750ml)',
                'description' => 'Italian natural sparkling mineral water served chilled with fresh lime and lemon wheels.',
                'price' => 4.00,
                'category' => 'Drinks',
                'image_path' => 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => false,
                'is_signature' => false,
            ],

            // Sides & Snacks
            [
                'name' => 'Rosemary Garlic Focaccia',
                'description' => 'Warm house-baked sourdough focaccia with sea salt, rosemary, and whipped garlic butter.',
                'price' => 5.50,
                'category' => 'Sides',
                'image_path' => 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => false,
                'is_signature' => false,
            ],
            [
                'name' => 'Charred Baby Broccolini',
                'description' => 'Wok-charred baby broccolini with toasted garlic chips, crushed chili flakes, and cold-pressed lemon oil.',
                'price' => 6.00,
                'category' => 'Sides',
                'image_path' => 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => false,
                'is_signature' => false,
            ],
            [
                'name' => 'Crispy Sweet Potato Fries',
                'description' => 'Shoestring sweet potato fries dusted with smoked paprika and sea salt, tangy honey mustard dip.',
                'price' => 6.50,
                'category' => 'Sides',
                'image_path' => 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => true,
                'is_signature' => false,
            ],
            [
                'name' => 'Creamy Truffle Potato Puree',
                'description' => 'Yukon Gold potatoes whipped with French butter, cream, and infused white truffle essence.',
                'price' => 6.00,
                'category' => 'Sides',
                'image_path' => 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
                'is_top_sale' => false,
                'is_signature' => true,
            ],
        ];

        foreach ($items as $it) {
            MenuItem::updateOrCreate(['name' => $it['name']], $it);
        }

        // 4. Sample Ingredients / Stocks
        $ingredients = [
            ['name' => 'Wagyu Beef Patties', 'quantity' => 24, 'unit' => 'pcs', 'min_threshold' => 10, 'cost_per_unit' => 4.50],
            ['name' => 'Prime Angus Ribeye Cuts', 'quantity' => 16, 'unit' => 'pcs', 'min_threshold' => 6, 'cost_per_unit' => 11.50],
            ['name' => 'Buffalo Mozzarella', 'quantity' => 12.5, 'unit' => 'kg', 'min_threshold' => 5.0, 'cost_per_unit' => 12.00],
            ['name' => 'San Marzano Tomatoes', 'quantity' => 18, 'unit' => 'cans', 'min_threshold' => 8, 'cost_per_unit' => 2.50],
            ['name' => 'White Truffle Oil', 'quantity' => 1.5, 'unit' => 'L', 'min_threshold' => 0.5, 'cost_per_unit' => 28.00],
            ['name' => 'Fresh Basil Leaves', 'quantity' => 0.35, 'unit' => 'kg', 'min_threshold' => 0.5, 'cost_per_unit' => 15.00],
            ['name' => 'Salmon Fillets', 'quantity' => 15, 'unit' => 'pcs', 'min_threshold' => 6, 'cost_per_unit' => 7.00],
            ['name' => 'Wild Tiger Prawns', 'quantity' => 8.0, 'unit' => 'kg', 'min_threshold' => 3.0, 'cost_per_unit' => 16.50],
            ['name' => 'Fresh Calamari', 'quantity' => 5.5, 'unit' => 'kg', 'min_threshold' => 2.5, 'cost_per_unit' => 9.00],
            ['name' => 'Handmade Tagliatelle Pasta', 'quantity' => 10.0, 'unit' => 'kg', 'min_threshold' => 4.0, 'cost_per_unit' => 3.80],
            ['name' => 'Carnaroli Risotto Rice', 'quantity' => 14.0, 'unit' => 'kg', 'min_threshold' => 5.0, 'cost_per_unit' => 4.50],
            ['name' => 'Burrata Cheese (Pugliese)', 'quantity' => 18, 'unit' => 'pcs', 'min_threshold' => 8, 'cost_per_unit' => 3.20],
            ['name' => 'Matcha Powder (Ceremonial)', 'quantity' => 0.8, 'unit' => 'kg', 'min_threshold' => 0.4, 'cost_per_unit' => 45.00],
            ['name' => 'Single-Origin Coffee Beans', 'quantity' => 6.0, 'unit' => 'kg', 'min_threshold' => 2.5, 'cost_per_unit' => 18.00],
            ['name' => 'Heavy Cream', 'quantity' => 8.0, 'unit' => 'L', 'min_threshold' => 3.0, 'cost_per_unit' => 4.20],
            ['name' => 'Brioche Burger Buns', 'quantity' => 8, 'unit' => 'pcs', 'min_threshold' => 15, 'cost_per_unit' => 0.80],
            ['name' => 'Sweet Potatoes', 'quantity' => 20.0, 'unit' => 'kg', 'min_threshold' => 8.0, 'cost_per_unit' => 1.80],
            ['name' => 'Valencia Oranges', 'quantity' => 25.0, 'unit' => 'kg', 'min_threshold' => 10.0, 'cost_per_unit' => 2.20],
        ];

        foreach ($ingredients as $ing) {
            $created = Ingredient::updateOrCreate(['name' => $ing['name']], $ing);
            if ($created->quantity <= $created->min_threshold) {
                StockAlert::firstOrCreate(
                    ['ingredient_id' => $created->id, 'is_resolved' => false],
                    [
                        'ingredient_name' => $created->name,
                        'message' => "Stock is low: {$created->quantity} {$created->unit} remaining (minimum threshold: {$created->min_threshold} {$created->unit})",
                        'reported_by' => 'System Inventory Alert',
                    ]
                );
            }
        }
    }
}
