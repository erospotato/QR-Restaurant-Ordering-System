<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Customers Table
        if (!Schema::hasTable('customers')) {
            Schema::create('customers', function (Blueprint $t) {
                $t->id();
                $t->string('full_name', 150);
                $t->string('phone', 30)->unique()->index();
                $t->string('email', 150)->nullable();
                $t->string('password', 255)->nullable();
                $t->date('date_of_birth')->nullable();
                $t->string('gender', 20)->nullable();
                $t->string('loyalty_tier', 20)->default('bronze'); // bronze, silver, gold, vip
                $t->decimal('lifetime_spending', 12, 2)->default(0);
                $t->decimal('points_balance', 12, 2)->default(0);
                $t->decimal('total_points_earned', 12, 2)->default(0);
                $t->decimal('total_points_redeemed', 12, 2)->default(0);
                $t->string('status', 20)->default('active'); // active, suspended
                $t->timestamp('last_earning_at')->nullable();
                $t->text('notes')->nullable();
                $t->timestamps();
            });
        }

        // Migrate existing members to customers if members table exists
        if (Schema::hasTable('members')) {
            $existingMembers = DB::table('members')->get();
            foreach ($existingMembers as $m) {
                $exists = DB::table('customers')->where('phone', $m->phone)->exists();
                if (!$exists) {
                    DB::table('customers')->insert([
                        'full_name' => $m->name ?? 'Guest',
                        'phone' => $m->phone,
                        'email' => $m->email ?? null,
                        'password' => $m->password ?? null,
                        'loyalty_tier' => strtolower($m->tier ?? 'bronze'),
                        'lifetime_spending' => $m->total_spent ?? 0,
                        'points_balance' => $m->points ?? 0,
                        'total_points_earned' => $m->points ?? 0,
                        'total_points_redeemed' => 0,
                        'status' => 'active',
                        'notes' => $m->notes ?? null,
                        'created_at' => $m->created_at ?? now(),
                        'updated_at' => $m->updated_at ?? now(),
                    ]);
                }
            }
        }

        // 2. Membership Plans Table (Maison Privé vs Standard)
        if (!Schema::hasTable('membership_plans')) {
            Schema::create('membership_plans', function (Blueprint $t) {
                $t->id();
                $t->string('name', 100);
                $t->decimal('price', 10, 2)->default(0);
                $t->integer('duration_months')->default(12);
                $t->text('description')->nullable();
                $t->boolean('is_active')->default(true);
                $t->timestamps();
            });
        }

        // 3. Customer Memberships Table (Subscription tracking)
        if (!Schema::hasTable('customer_memberships')) {
            Schema::create('customer_memberships', function (Blueprint $t) {
                $t->id();
                $t->unsignedBigInteger('customer_id')->index();
                $t->unsignedBigInteger('plan_id')->index();
                $t->date('start_date');
                $t->date('end_date');
                $t->decimal('amount_paid', 10, 2)->default(0);
                $t->string('status', 20)->default('active'); // active, expired, cancelled
                $t->timestamps();
            });
        }

        // 4. Loyalty Transactions Table (Point ledger)
        if (!Schema::hasTable('loyalty_transactions')) {
            Schema::create('loyalty_transactions', function (Blueprint $t) {
                $t->id();
                $t->unsignedBigInteger('customer_id')->index();
                $t->unsignedBigInteger('order_id')->nullable()->index();
                $t->string('type', 30); // earned, redeemed, expired, refund, adjustment, reversed, bonus
                $t->decimal('points', 12, 2);
                $t->decimal('balance_after', 12, 2);
                $t->string('description', 255)->nullable();
                $t->dateTime('expires_at')->nullable();
                $t->timestamps();
            });
        }

        // 5. Rewards Catalog Table
        if (!Schema::hasTable('rewards')) {
            Schema::create('rewards', function (Blueprint $t) {
                $t->id();
                $t->string('name', 150);
                $t->text('description')->nullable();
                $t->string('reward_type', 30); // discount, free_item, bonus_points
                $t->decimal('points_required', 12, 2);
                $t->decimal('reward_value', 10, 2)->nullable();
                $t->boolean('is_active')->default(true);
                $t->timestamps();
            });
        }

        // 6. Customer Rewards Table (Vouchers / Redemptions)
        if (!Schema::hasTable('customer_rewards')) {
            Schema::create('customer_rewards', function (Blueprint $t) {
                $t->id();
                $t->unsignedBigInteger('customer_id')->index();
                $t->unsignedBigInteger('reward_id')->index();
                $t->string('status', 20)->default('available'); // available, redeemed, expired, cancelled
                $t->dateTime('issued_at');
                $t->dateTime('expires_at')->nullable();
                $t->dateTime('redeemed_at')->nullable();
                $t->unsignedBigInteger('order_id')->nullable();
                $t->timestamps();
            });
        }

        // 7. Birthday Rewards Table
        if (!Schema::hasTable('birthday_rewards')) {
            Schema::create('birthday_rewards', function (Blueprint $t) {
                $t->id();
                $t->unsignedBigInteger('customer_id')->index();
                $t->integer('year');
                $t->string('reward_description', 255);
                $t->string('status', 20)->default('available'); // available, redeemed, expired
                $t->dateTime('issued_at');
                $t->dateTime('expires_at')->nullable();
                $t->dateTime('redeemed_at')->nullable();
                $t->timestamps();
            });
        }

        // 8. Loyalty Settings Table (Configurable thresholds, currency, rules)
        if (!Schema::hasTable('loyalty_settings')) {
            Schema::create('loyalty_settings', function (Blueprint $t) {
                $t->string('key', 100)->primary();
                $t->text('value')->nullable();
                $t->timestamps();
            });
        }

        // 9. Loyalty Audit Logs Table
        if (!Schema::hasTable('loyalty_audit_logs')) {
            Schema::create('loyalty_audit_logs', function (Blueprint $t) {
                $t->id();
                $t->unsignedBigInteger('user_id')->nullable();
                $t->unsignedBigInteger('customer_id')->nullable()->index();
                $t->string('action', 50);
                $t->json('old_values')->nullable();
                $t->json('new_values')->nullable();
                $t->string('reason', 255)->nullable();
                $t->timestamps();
            });
        }

        // 10. Add customer_id to orders table if not present
        if (Schema::hasTable('orders') && !Schema::hasColumn('orders', 'customer_id')) {
            Schema::table('orders', function (Blueprint $t) {
                $t->unsignedBigInteger('customer_id')->nullable()->after('member_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_audit_logs');
        Schema::dropIfExists('loyalty_settings');
        Schema::dropIfExists('birthday_rewards');
        Schema::dropIfExists('customer_rewards');
        Schema::dropIfExists('rewards');
        Schema::dropIfExists('loyalty_transactions');
        Schema::dropIfExists('customer_memberships');
        Schema::dropIfExists('membership_plans');
        Schema::dropIfExists('customers');
        if (Schema::hasColumn('orders', 'customer_id')) {
            Schema::table('orders', function (Blueprint $t) {
                $t->dropColumn('customer_id');
            });
        }
    }
};
