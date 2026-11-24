<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('menu_items', function (Blueprint $table) {
            $table->boolean('is_member_exclusive')->default(false)->after('is_signature');
            $table->decimal('promo_price', 8, 2)->nullable()->after('is_member_exclusive');
            $table->string('min_member_tier', 30)->nullable()->default('Bronze')->after('promo_price');
            $table->string('promo_badge', 60)->nullable()->default('MEMBER EXCLUSIVE')->after('min_member_tier');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->boolean('is_member_exclusive')->default(false)->after('quantity');
        });
    }

    public function down(): void
    {
        Schema::table('menu_items', function (Blueprint $table) {
            $table->dropColumn(['is_member_exclusive', 'promo_price', 'min_member_tier', 'promo_badge']);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn(['is_member_exclusive']);
        });
    }
};
