<?php

require_once __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Customer;
use App\Models\CustomerMembership;
use App\Models\Order;
use App\Services\LoyaltyService;
use App\Services\PointsService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

echo "=== MOLS MAISON LOYALTY & REWARDS SPECIFICATION TEST SUITE ===\n\n";

$loyaltyService = app(LoyaltyService::class);
$pointsService = app(PointsService::class);

$passed = 0;
$failed = 0;

function assertTest(string $name, bool $condition, ?string $extra = null) {
    global $passed, $failed;
    if ($condition) {
        echo " [PASS] {$name}" . ($extra ? " ({$extra})" : "") . "\n";
        $passed++;
    } else {
        echo " [FAIL] {$name}" . ($extra ? " ({$extra})" : "") . "\n";
        $failed++;
    }
}

// 1. Register new customer -> Bronze, 0 points
$phone1 = '09900000001';
Customer::where('phone', $phone1)->delete();
$c1 = Customer::create([
    'full_name' => 'Test User One',
    'phone' => $phone1,
    'loyalty_tier' => 'bronze',
    'lifetime_spending' => 0.0,
    'points_balance' => 0.0,
    'total_points_earned' => 0.0,
    'total_points_redeemed' => 0.0,
]);
assertTest(
    "1. Register new customer",
    strtolower($c1->loyalty_tier) === 'bronze' && (int)$c1->points_balance === 0,
    "Tier: {$c1->loyalty_tier}, Points: {$c1->points_balance}"
);

// 2. Tier spending thresholds: $200 -> Silver, $400 -> Gold, $600 -> VIP
assertTest("2a. Spend $0-$199.99 is Bronze", $loyaltyService->determineTier(199.99) === 'bronze');
assertTest("2b. Spend $200 lifetime is Silver", $loyaltyService->determineTier(200.00) === 'silver');
assertTest("2c. Spend $399.99 lifetime is Silver", $loyaltyService->determineTier(399.99) === 'silver');
assertTest("2d. Spend $400 lifetime is Gold", $loyaltyService->determineTier(400.00) === 'gold');
assertTest("2e. Spend $599.99 lifetime is Gold", $loyaltyService->determineTier(599.99) === 'gold');
assertTest("2f. Spend $600 lifetime is VIP", $loyaltyService->determineTier(600.00) === 'vip');

// 3. Points calculation by tier:
// Bronze spends $100 -> 100 points (1x)
// Silver spends $100 -> 125 points (1.25x)
// Gold spends $100 -> 150 points (1.5x)
// VIP spends $100 -> 200 points (2x)
$ptsBronze = $pointsService->calculatePointsEarned(100.0, 'bronze');
$ptsSilver = $pointsService->calculatePointsEarned(100.0, 'silver');
$ptsGold = $pointsService->calculatePointsEarned(100.0, 'gold');
$ptsVip = $pointsService->calculatePointsEarned(100.0, 'vip');
assertTest("3a. Bronze spends $100 -> 100 pts", $ptsBronze === 100, "Got {$ptsBronze}");
assertTest("3b. Silver spends $100 -> 125 pts", $ptsSilver === 125, "Got {$ptsSilver}");
assertTest("3c. Gold spends $100 -> 150 pts", $ptsGold === 150, "Got {$ptsGold}");
assertTest("3d. VIP spends $100 -> 200 pts", $ptsVip === 200, "Got {$ptsVip}");

// 4. Redeem 500 points -> $5 discount
$dollarVal = $pointsService->pointsToCurrency(500);
assertTest("4. Redeem 500 points -> $5 discount", $dollarVal === 5.0, "Got \${$dollarVal}");

// 5. Redeem more than balance -> Rejected
$rejected = false;
try {
    $pointsService->redeemPoints($c1, 500);
} catch (\InvalidArgumentException $e) {
    $rejected = true;
}
assertTest("5. Redeem more than balance is rejected", $rejected);

// 6. Minimum redemption 200 points check
$minRejected = false;
$c1->points_balance = 500;
$c1->save();
try {
    $pointsService->redeemPoints($c1, 100);
} catch (\InvalidArgumentException $e) {
    $minRejected = true;
}
assertTest("6. Redeem below 200 pts minimum is rejected", $minRejected);

// 7. Successful redemption
$c1->points_balance = 500;
$c1->save();
$redeemTx = $pointsService->redeemPoints($c1, 200);
assertTest("7. Redeem 200 points deducts balance", (int)$c1->fresh()->points_balance === 300 && (float)$redeemTx->balance_after === 300.0);

// 8. Order payment with LoyaltyService:
// Customer spends $200 on an order -> unlocks Silver tier (upgrade happens after order is paid)
$order = Order::create([
    'dining_table_id' => 1,
    'total' => 200.0,
    'status' => 'completed',
]);
$c2Phone = '09900000002';
Customer::where('phone', $c2Phone)->delete();
$c2 = Customer::create([
    'full_name' => 'Tier Upgrade Tester',
    'phone' => $c2Phone,
    'loyalty_tier' => 'bronze',
    'lifetime_spending' => 0.0,
    'points_balance' => 0.0,
    'total_points_earned' => 0.0,
    'total_points_redeemed' => 0.0,
]);
$payRes = $loyaltyService->processOrderPayment($order, $c2, 200.0, 0);
assertTest(
    "8. Spend $200 upgrades Bronze to Silver after payment",
    $c2->fresh()->loyalty_tier === 'silver' && (float)$c2->fresh()->lifetime_spending === 200.0,
    "New tier: {$c2->fresh()->loyalty_tier}, Lifetime spend: \${$c2->fresh()->lifetime_spending}"
);

// 9. Refund paid order -> Points reversed proportionally and spending reversed
$refundRes = $loyaltyService->processRefund($order, 200.0);
assertTest(
    "9. Refund $200 reverses spending and downgrades to Bronze",
    $c2->fresh()->loyalty_tier === 'bronze' && (float)$c2->fresh()->lifetime_spending === 0.0,
    "Corrected tier: {$c2->fresh()->loyalty_tier}, Spending: \${$c2->fresh()->lifetime_spending}"
);

// 10. Maison Privé Annual Subscription ($49.99 / 12 mo)
$membership = $loyaltyService->subscribeMaisonPrive($c2, 49.99);
$hasPrive = $loyaltyService->hasActiveMaisonPrive($c2->fresh());
assertTest(
    "10. Subscribe Maison Privé ($49.99 / 12 mo)",
    $hasPrive && $membership->status === 'active' && $membership->end_date->isFuture(),
    "Active until: {$membership->end_date->toDateString()}"
);

// 11. Inactivity expiration after 12 months
$c3Phone = '09900000003';
Customer::where('phone', $c3Phone)->delete();
$c3 = Customer::create([
    'full_name' => 'Inactive User',
    'phone' => $c3Phone,
    'loyalty_tier' => 'silver',
    'lifetime_spending' => 300.0,
    'points_balance' => 450.0,
    'total_points_earned' => 450.0,
    'last_earning_at' => Carbon::now()->subMonths(13),
]);
$expiredCount = $pointsService->expireInactivePoints(12);
assertTest(
    "11. Inactive 12 months points expire",
    (int)$c3->fresh()->points_balance === 0,
    "Balance after expiry: {$c3->fresh()->points_balance}"
);

echo "\n--------------------------------------------------\n";
echo "SUMMARY: {$passed} PASSED, {$failed} FAILED\n";
echo "--------------------------------------------------\n";

if ($failed > 0) exit(1);
