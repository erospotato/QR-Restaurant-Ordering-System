<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('members', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('phone')->unique()->index();
            $t->string('email')->nullable();
            $t->string('tier')->default('bronze'); // bronze, silver, gold, vip
            $t->integer('points')->default(0);
            $t->decimal('total_spent', 10, 2)->default(0);
            $t->integer('visits_count')->default(0);
            $t->text('notes')->nullable();
            $t->timestamps();
        });

        Schema::table('orders', function (Blueprint $t) {
            $t->unsignedBigInteger('member_id')->nullable()->after('customer_name');
            $t->integer('points_earned')->default(0)->after('member_id');
            $t->integer('points_redeemed')->default(0)->after('points_earned');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $t) {
            $t->dropColumn(['member_id', 'points_earned', 'points_redeemed']);
        });
        Schema::dropIfExists('members');
    }
};
