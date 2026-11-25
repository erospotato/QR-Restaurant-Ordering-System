<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class LoyaltySeeder extends Seeder
{
    public function run(): void
    {
        // 1. Membership Plans
        $plans = [
            [
                'name' => 'Standard',
                'price' => 0.00,
                'duration_months' => 0,
                'description' => 'Lifetime dining account with automatic spending tier progression and points rewards.',
                'is_active' => true,
            ],
            [
                'name' => 'Maison Privé',
                'price' => 49.99,
                'duration_months' => 12,
                'description' => 'Annual luxury membership with VIP priority table reservations, complimentary birthday dessert, welcome drinks, exclusive seasonal menus & private tastings.',
                'is_active' => true,
            ],
        ];

        foreach ($plans as $p) {
            DB::table('membership_plans')->updateOrInsert(
                ['name' => $p['name']],
                array_merge($p, ['updated_at' => now(), 'created_at' => now()])
            );
        }

        $privePlan = DB::table('membership_plans')->where('name', 'Maison Privé')->first();
        $stdPlan = DB::table('membership_plans')->where('name', 'Standard')->first();

        // 2. Rewards Catalog
        $rewards = [
            ['name' => '$2 Dining Discount', 'description' => 'Instant $2 off your dining bill.', 'reward_type' => 'discount', 'points_required' => 200, 'reward_value' => 2.00],
            ['name' => '$5 Dining Discount', 'description' => 'Instant $5 off your dining bill.', 'reward_type' => 'discount', 'points_required' => 500, 'reward_value' => 5.00],
            ['name' => '$10 Dining Discount', 'description' => 'Instant $10 off your dining bill.', 'reward_type' => 'discount', 'points_required' => 1000, 'reward_value' => 10.00],
            ['name' => '$20 Dining Discount', 'description' => 'Instant $20 off your dining bill.', 'reward_type' => 'discount', 'points_required' => 2000, 'reward_value' => 20.00],
            ['name' => 'Complimentary Dessert', 'description' => 'Chef signature dessert of your choice.', 'reward_type' => 'free_item', 'points_required' => 500, 'reward_value' => 5.00],
            ['name' => 'Signature Drink', 'description' => 'Handcrafted signature cocktail or mocktail.', 'reward_type' => 'free_item', 'points_required' => 700, 'reward_value' => 7.00],
            ['name' => 'Complimentary Appetizer', 'description' => 'Select any artisanal appetizer or truffle bites.', 'reward_type' => 'free_item', 'points_required' => 1000, 'reward_value' => 10.00],
        ];

        foreach ($rewards as $r) {
            DB::table('rewards')->updateOrInsert(
                ['name' => $r['name']],
                array_merge($r, ['is_active' => true, 'updated_at' => now(), 'created_at' => now()])
            );
        }

        // 3. Loyalty Settings
        $settings = [
            'currency_code' => 'USD',
            'currency_symbol' => '$',
            'points_redemption_rate' => '100', // 100 points = $1.00 USD
            'min_redemption_points' => '200',
            'inactivity_expiry_months' => '12',
            'annual_membership_price' => '49.99',
            'tier_threshold_silver' => '200',
            'tier_threshold_gold' => '400',
            'tier_threshold_vip' => '600',
            'tier_discount_silver' => '3',
            'tier_discount_gold' => '5',
            'tier_discount_vip' => '10',
            'tier_multiplier_bronze' => '1.0',
            'tier_multiplier_silver' => '1.25',
            'tier_multiplier_gold' => '1.5',
            'tier_multiplier_vip' => '2.0',
        ];

        foreach ($settings as $k => $v) {
            DB::table('loyalty_settings')->updateOrInsert(
                ['key' => $k],
                ['value' => $v, 'updated_at' => now(), 'created_at' => now()]
            );
        }

        // 4. Sample Customers
        $sampleCustomers = [
            [
                'full_name' => 'Mols Rocherfont',
                'phone' => '08112233445',
                'email' => 'mols@goat.com',
                'date_of_birth' => '2006-11-11',
                'loyalty_tier' => 'vip',
                'lifetime_spending' => 950.00,
                'points_balance' => 890,
                'total_points_earned' => 1140,
                'total_points_redeemed' => 250,
                'status' => 'active',
                'has_prive' => true,
            ],
            [
                'full_name' => 'Alice Johnson',
                'phone' => '08123456789',
                'email' => 'alice@example.com',
                'date_of_birth' => '1995-04-20',
                'loyalty_tier' => 'gold',
                'lifetime_spending' => 450.00,
                'points_balance' => 380,
                'total_points_earned' => 580,
                'total_points_redeemed' => 200,
                'status' => 'active',
                'has_prive' => true,
            ],
            [
                'full_name' => 'David Lee',
                'phone' => '08987654321',
                'email' => 'david@example.com',
                'date_of_birth' => '1988-08-10',
                'loyalty_tier' => 'silver',
                'lifetime_spending' => 280.00,
                'points_balance' => 240,
                'total_points_earned' => 240,
                'total_points_redeemed' => 0,
                'status' => 'active',
                'has_prive' => false,
            ],
            [
                'full_name' => 'Michael Chen',
                'phone' => '08778899001',
                'email' => 'michael@example.com',
                'date_of_birth' => '1998-12-05',
                'loyalty_tier' => 'bronze',
                'lifetime_spending' => 85.00,
                'points_balance' => 85,
                'total_points_earned' => 85,
                'total_points_redeemed' => 0,
                'status' => 'active',
                'has_prive' => false,
            ],
        ];

        foreach ($sampleCustomers as $sc) {
            $hasPrive = $sc['has_prive'];
            unset($sc['has_prive']);

            $sc['password'] = Hash::make('1234');
            $sc['last_earning_at'] = Carbon::now()->subDays(rand(2, 45));
            $sc['updated_at'] = now();
            $sc['created_at'] = Carbon::now()->subMonths(rand(3, 8));

            DB::table('customers')->updateOrInsert(['phone' => $sc['phone']], $sc);
            $c = DB::table('customers')->where('phone', $sc['phone'])->first();

            // Give initial loyalty transaction records
            $txCount = DB::table('loyalty_transactions')->where('customer_id', $c->id)->count();
            if ($txCount === 0) {
                DB::table('loyalty_transactions')->insert([
                    'customer_id' => $c->id,
                    'type' => 'earned',
                    'points' => $c->points_balance,
                    'balance_after' => $c->points_balance,
                    'description' => 'Initial dining visit points accrual',
                    'created_at' => Carbon::now()->subDays(15),
                    'updated_at' => Carbon::now()->subDays(15),
                ]);
            }

            // Also keep members table in sync for backward compatibility
            if (Schema::hasTable('members')) {
                DB::table('members')->updateOrInsert(
                    ['phone' => $sc['phone']],
                    [
                        'name' => $sc['full_name'],
                        'email' => $sc['email'],
                        'password' => $sc['password'],
                        'tier' => $sc['loyalty_tier'],
                        'points' => (int) $sc['points_balance'],
                        'total_spent' => (float) $sc['lifetime_spending'],
                        'visits_count' => rand(2, 10),
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );
            }

            // Assign Maison Privé membership subscription if applicable
            if ($hasPrive && $privePlan) {
                $subExists = DB::table('customer_memberships')
                    ->where('customer_id', $c->id)
                    ->where('plan_id', $privePlan->id)
                    ->where('status', 'active')
                    ->exists();

                if (!$subExists) {
                    DB::table('customer_memberships')->insert([
                        'customer_id' => $c->id,
                        'plan_id' => $privePlan->id,
                        'start_date' => Carbon::now()->subMonths(2)->toDateString(),
                        'end_date' => Carbon::now()->addMonths(10)->toDateString(),
                        'amount_paid' => 49.99,
                        'status' => 'active',
                        'created_at' => Carbon::now()->subMonths(2),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }
}
