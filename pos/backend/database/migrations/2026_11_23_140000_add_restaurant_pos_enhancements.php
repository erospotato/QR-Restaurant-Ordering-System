<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Menu Items: Top Sales & Signature Dish flags
        Schema::table('menu_items', function (Blueprint $t) {
            $t->boolean('is_top_sale')->default(false)->after('is_available');
            $t->boolean('is_signature')->default(false)->after('is_top_sale');
        });

        // 2. Order Items: Customer Dish Notes
        Schema::table('order_items', function (Blueprint $t) {
            $t->text('notes')->nullable()->after('quantity');
        });

        // 3. Orders: Customer Order Notes & Payment Method
        Schema::table('orders', function (Blueprint $t) {
            $t->text('notes')->nullable()->after('total');
            $t->string('payment_method')->nullable()->after('paid_at');
        });

        // 4. Dining Tables: Capacity, Status, Merged With
        Schema::table('dining_tables', function (Blueprint $t) {
            $t->unsignedSmallInteger('capacity')->default(4)->after('number');
            $t->string('status')->default('available')->after('capacity');
            $t->string('merged_with')->nullable()->after('status');
        });

        // 5. Ingredients / Stocks
        Schema::create('ingredients', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->decimal('quantity', 10, 2)->default(0);
            $t->string('unit')->default('kg');
            $t->decimal('min_threshold', 10, 2)->default(5);
            $t->decimal('cost_per_unit', 10, 2)->nullable();
            $t->timestamps();
        });

        // 6. Stock Alerts (Kitchen to Manager/Owner notifications)
        Schema::create('stock_alerts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('ingredient_id')->nullable()->constrained('ingredients')->nullOnDelete();
            $t->string('ingredient_name');
            $t->string('message');
            $t->string('reported_by')->default('Kitchen');
            $t->boolean('is_resolved')->default(false);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_alerts');
        Schema::dropIfExists('ingredients');

        Schema::table('dining_tables', function (Blueprint $t) {
            $t->dropColumn(['capacity', 'status', 'merged_with']);
        });

        Schema::table('orders', function (Blueprint $t) {
            $t->dropColumn(['notes', 'payment_method']);
        });

        Schema::table('order_items', function (Blueprint $t) {
            $t->dropColumn(['notes']);
        });

        Schema::table('menu_items', function (Blueprint $t) {
            $t->dropColumn(['is_top_sale', 'is_signature']);
        });
    }
};
