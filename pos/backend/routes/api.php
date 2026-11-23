<?php
use App\Http\Controllers\{AuthController, IngredientController, MenuController, OrderController, StaffUserController, TableController};
use App\Http\Middleware\EnsureRole;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

// Public (customers)
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:20,1');
Route::get('/menu', [MenuController::class, 'index']);
Route::get('/tables/{token}', [TableController::class, 'show']);
Route::get('/tables/{token}/orders', [TableController::class, 'orders']);
Route::post('/tables/{token}/call-waiter', [TableController::class, 'callService']);
Route::post('/orders', [OrderController::class, 'store']);

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
        Route::get('/staff/ingredients', [IngredientController::class, 'index']);
        Route::patch('/staff/ingredients/{ingredient}', [IngredientController::class, 'update']);
        Route::post('/staff/ingredients/{ingredient}/restock', [IngredientController::class, 'restock']);
        Route::post('/staff/ingredients/{ingredient}/notify-low', [IngredientController::class, 'notifyLow']);
    });

    // Cashier + Manager (and Owner + Admin)
    Route::middleware(EnsureRole::class . ':cashier,manager')->group(function () {
        Route::post('/tables/{number}/pay', [TableController::class, 'pay']);
    });

    // Manager (and Owner + Admin): Table management, Inventory, Menu, Sales & Dashboard
    Route::middleware(EnsureRole::class . ':manager')->group(function () {
        // Menu management
        Route::get('/staff/menu', [MenuController::class, 'all']);
        Route::post('/menu', [MenuController::class, 'store']);
        Route::patch('/menu/{item}', [MenuController::class, 'update']);
        Route::delete('/menu/{item}', [MenuController::class, 'destroy']);

        // Table management (add, remove, move, merge, unmerge, rotate)
        Route::post('/staff/tables', [TableController::class, 'store']);
        Route::delete('/staff/tables/{number}', [TableController::class, 'destroy']);
        Route::post('/staff/tables/move', [TableController::class, 'move']);
        Route::post('/staff/tables/merge', [TableController::class, 'merge']);
        Route::post('/staff/tables/unmerge', [TableController::class, 'unmerge']);
        Route::post('/tables/{number}/rotate', [TableController::class, 'rotate']);

        // Inventory management & alerts
        Route::post('/staff/ingredients', [IngredientController::class, 'store']);
        Route::delete('/staff/ingredients/{ingredient}', [IngredientController::class, 'destroy']);
        Route::get('/staff/stock-alerts', [IngredientController::class, 'alerts']);
        Route::patch('/staff/stock-alerts/{alert}/resolve', [IngredientController::class, 'resolveAlert']);

        // Sales report & analytics
        Route::get('/staff/sales', [OrderController::class, 'sales']);
    });

    // Admin & Owner only: Staff user accounts management
    Route::middleware(EnsureRole::class . ':admin,owner')->group(function () {
        Route::get('/staff/users', [StaffUserController::class, 'index']);
        Route::post('/staff/users', [StaffUserController::class, 'store']);
        Route::patch('/staff/users/{user}', [StaffUserController::class, 'update']);
        Route::delete('/staff/users/{user}', [StaffUserController::class, 'destroy']);
    });
});
