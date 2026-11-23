<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', fn (Blueprint $t) => $t->string('role')->default('kitchen')->after('email'));
        Schema::create('dining_tables', function (Blueprint $t) {
            $t->id();
            $t->unsignedInteger('number')->unique();
            $t->string('token')->unique();
            $t->timestamps();
        });
        Schema::create('menu_items', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('description')->nullable();
            $t->decimal('price', 8, 2);
            $t->string('category')->default('Other');
            $t->string('image_path')->nullable();
            $t->boolean('is_available')->default(true);
            $t->timestamps();
        });
        Schema::create('orders', function (Blueprint $t) {
            $t->id();
            $t->foreignId('dining_table_id')->constrained()->cascadeOnDelete();
            $t->string('status')->default('new');
            $t->boolean('is_addon')->default(false);
            $t->decimal('total', 10, 2)->default(0);
            $t->timestamp('paid_at')->nullable();
            $t->timestamps();
        });
        Schema::create('order_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('menu_item_id')->nullable();
            $t->string('name');
            $t->decimal('price', 8, 2);
            $t->unsignedSmallInteger('quantity');
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('menu_items');
        Schema::dropIfExists('dining_tables');
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('role'));
    }
};
