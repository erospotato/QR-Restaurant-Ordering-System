<?php
use App\Http\Controllers\{AuthController, CustomerController, IngredientController, LoyaltyController, MemberController, MenuController, OrderController, StaffUserController, TableController};
use App\Http\Middleware\EnsureRole;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

// Public (customers)
Route::post('/login', [AuthController::class, 'login'])->name('login')->middleware('throttle:20,1');
Route::get('/menu', [MenuController::class, 'index']);
Route::get('/tables/scan/{number}', [TableController::class, 'scan']);
Route::get('/tables/{token}', [TableController::class, 'show']);
Route::get('/tables/{token}/orders', [TableController::class, 'orders']);
Route::post('/tables/{token}/link-member', [TableController::class, 'linkMember']);
Route::post('/tables/{token}/unlink-member', [TableController::class, 'unlinkMember']);
Route::post('/tables/{token}/call-waiter', [TableController::class, 'callService']);
Route::post('/orders', [OrderController::class, 'store']);
Route::get('/network-info', [TableController::class, 'networkInfo']);

// Public Customer Loyalty, Membership & Rewards
Route::get('/members/lookup', [MemberController::class, 'lookup']);
Route::post('/members/lookup', [MemberController::class, 'lookup']);
Route::post('/members/verify', [MemberController::class, 'verify']);
Route::post('/members/register', [MemberController::class, 'register']);
Route::get('/members/{phone}', [MemberController::class, 'lookup']);

// Customer & Loyalty API Specification Endpoints
Route::post('/customers', [CustomerController::class, 'store']);
Route::post('/customers/verify', [CustomerController::class, 'verify']);
Route::get('/customers/{id}', [CustomerController::class, 'show']);
Route::put('/customers/{id}', [CustomerController::class, 'update']);
Route::get('/customers/{id}/loyalty', [CustomerController::class, 'loyaltySummary']);
Route::get('/customers/{id}/transactions', [CustomerController::class, 'transactions']);
Route::get('/customers/{id}/rewards', [CustomerController::class, 'rewards']);
Route::post('/customers/{id}/redeem', [CustomerController::class, 'redeem']);
Route::get('/loyalty/tiers', [LoyaltyController::class, 'getTiers']);
Route::get('/loyalty/rewards', [LoyaltyController::class, 'getRewards']);
Route::get('/memberships/plans', [LoyaltyController::class, 'getPlans']);
Route::post('/memberships/subscribe', [LoyaltyController::class, 'subscribe']);
Route::get('/memberships/{customerId}', [LoyaltyController::class, 'getCustomerMembership']);
Route::get('/loyalty/statistics', [LoyaltyController::class, 'statistics']);

// Websocket auth for private "staff" channel
Broadcast::routes(['middleware' => ['auth:sanctum']]);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Kitchen + Cashier + Manager (and Owner + Admin)
    Route::middleware(EnsureRole::class . ':kitchen,cashier,manager')->group(function () {
        Route::get('/staff/orders', [OrderController::class, 'staff']);
        Route::get('/staff/tables', [TableController::class, 'index']);
        Route::get('/staff/service-calls', [TableController::class, 'serviceCalls']);
        Route::patch('/staff/service-calls/{call}/resolve', [TableController::class, 'resolveServiceCall']);
        Route::patch('/orders/{order}', [OrderController::class, 'status']);
    });

    // Kitchen + Manager (and Owner + Admin) - Inventory usage & restock (Cashier excluded)
    Route::middleware(EnsureRole::class . ':kitchen,manager')->group(function () {
        Route::get('/staff/ingredients', [IngredientController::class, 'index']);
        Route::patch('/staff/ingredients/{ingredient}', [IngredientController::class, 'update']);
        Route::post('/staff/ingredients/{ingredient}/restock', [IngredientController::class, 'restock']);
        Route::post('/staff/ingredients/{ingredient}/notify-low', [IngredientController::class, 'notifyLow']);
    });

    // Cashier + Manager (and Owner + Admin) - Billing, Table Management & Order Editing
    Route::middleware(EnsureRole::class . ':cashier,manager')->group(function () {
        Route::get('/staff/menu', [MenuController::class, 'all']);
        Route::post('/tables/{number}/pay', [TableController::class, 'pay']);
        Route::post('/staff/tables/{number}/add-items', [TableController::class, 'addItem']);
        Route::post('/staff/tables/{number}/remove-item', [TableController::class, 'removeItem']);
        Route::post('/staff/tables/{number}/cancel-order', [TableController::class, 'cancelOrder']);
        Route::post('/staff/tables/move', [TableController::class, 'move']);
        Route::post('/staff/tables/merge', [TableController::class, 'merge']);
        Route::post('/staff/tables/unmerge', [TableController::class, 'unmerge']);
        Route::post('/tables/{number}/rotate', [TableController::class, 'rotate']);

        // VIP Customers & Membership Management (Owner, Manager, Admin, Cashier)
        Route::get('/customers', [CustomerController::class, 'index']);
        Route::get('/staff/members', [MemberController::class, 'index']);
        Route::get('/staff/members/search', [MemberController::class, 'search']);
        Route::get('/staff/members/lookup', [MemberController::class, 'lookup']);
        Route::get('/staff/members/{id}', [MemberController::class, 'show']);
        Route::post('/staff/members', [MemberController::class, 'register']);

        // Loyalty & Rewards Management
        Route::post('/loyalty/rewards', [LoyaltyController::class, 'createReward']);
        Route::put('/loyalty/rewards/{id}', [LoyaltyController::class, 'updateReward']);
        Route::post('/loyalty/adjust-points', [LoyaltyController::class, 'adjustPoints']);
        Route::post('/loyalty/settings', [LoyaltyController::class, 'updateSettings']);
    });

    // Manager (and Owner + Admin): Table creation, Menu Admin, Inventory Admin & Sales
    Route::middleware(EnsureRole::class . ':manager')->group(function () {
        // Menu modification
        Route::post('/menu', [MenuController::class, 'store']);
        Route::patch('/menu/{item}', [MenuController::class, 'update']);
        Route::delete('/menu/{item}', [MenuController::class, 'destroy']);

        // Table creation & removal
        Route::post('/staff/tables', [TableController::class, 'store']);
        Route::delete('/staff/tables/{number}', [TableController::class, 'destroy']);

        // Inventory management & alert resolution (Cashier excluded)
        Route::post('/staff/ingredients', [IngredientController::class, 'store']);
        Route::delete('/staff/ingredients/{ingredient}', [IngredientController::class, 'destroy']);
        Route::get('/staff/stock-alerts', [IngredientController::class, 'alerts']);
        Route::patch('/staff/stock-alerts/{alert}/resolve', [IngredientController::class, 'resolveAlert']);

        // Sales report & analytics
        Route::get('/staff/sales', [OrderController::class, 'sales']);
    });

    // Manager, Admin & Owner: Staff user accounts management (CRUD)
    Route::middleware(EnsureRole::class . ':admin,owner,manager')->group(function () {
        Route::get('/staff/users', [StaffUserController::class, 'index']);
        Route::post('/staff/users', [StaffUserController::class, 'store']);
        Route::patch('/staff/users/{user}', [StaffUserController::class, 'update']);
        Route::delete('/staff/users/{user}', [StaffUserController::class, 'destroy']);
    });
});
