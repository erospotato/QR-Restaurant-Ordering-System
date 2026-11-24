<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $t) {
            $t->decimal('amount_tendered', 10, 2)->nullable()->after('payment_method');
            $t->decimal('change_due', 10, 2)->nullable()->after('amount_tendered');
            $t->decimal('tip', 10, 2)->default(0)->after('change_due');
            $t->decimal('tax', 10, 2)->default(0)->after('tip');
            $t->decimal('discount_amount', 10, 2)->default(0)->after('tax');
            $t->string('customer_name')->nullable()->after('discount_amount');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $t) {
            $t->dropColumn(['amount_tendered', 'change_due', 'tip', 'tax', 'discount_amount', 'customer_name']);
        });
    }
};
