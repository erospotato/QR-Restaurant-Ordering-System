<?php

namespace Database\Seeders;

use App\Models\Member;
use Illuminate\Database\Seeder;

class MemberSeeder extends Seeder
{
    public function run(): void
    {
        $members = [
            [
                'name' => 'Alice Johnson',
                'phone' => '08123456789',
                'email' => 'alice@example.com',
                'tier' => 'gold',
                'points' => 380,
                'total_spent' => 420.50,
                'visits_count' => 12,
            ],
            [
                'name' => 'David Lee',
                'phone' => '08987654321',
                'email' => 'david@example.com',
                'tier' => 'silver',
                'points' => 140,
                'total_spent' => 175.00,
                'visits_count' => 5,
            ],
            [
                'name' => 'Samantha Ray',
                'phone' => '08112233445',
                'email' => 'samantha@example.com',
                'tier' => 'vip',
                'points' => 890,
                'total_spent' => 950.00,
                'visits_count' => 24,
            ],
            [
                'name' => 'Michael Chen',
                'phone' => '08778899001',
                'email' => 'michael@example.com',
                'tier' => 'bronze',
                'points' => 45,
                'total_spent' => 45.00,
                'visits_count' => 1,
            ],
        ];

        foreach ($members as $m) {
            Member::updateOrCreate(['phone' => $m['phone']], $m);
        }
    }
}
