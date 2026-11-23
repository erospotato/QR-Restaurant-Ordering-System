<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('service_requests', function (Blueprint $t) {
            $t->id();
            $t->foreignId('dining_table_id')->constrained()->cascadeOnDelete();
            $t->unsignedInteger('table_number');
            $t->string('type')->default('waiter'); // 'waiter', 'bill', 'water', 'cutlery'
            $t->string('notes')->nullable();
            $t->boolean('is_resolved')->default(false);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_requests');
    }
};
