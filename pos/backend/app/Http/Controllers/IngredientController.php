<?php
namespace App\Http\Controllers;

use App\Events\PosUpdated;
use App\Models\Ingredient;
use App\Models\StockAlert;
use Illuminate\Http\Request;

class IngredientController extends Controller
{
    public function index()
    {
        $ingredients = Ingredient::orderBy('name')->get();
        $unresolvedAlerts = StockAlert::where('is_resolved', false)->latest()->get();
        return response()->json([
            'ingredients' => $ingredients,
            'alerts' => $unresolvedAlerts,
            'low_count' => $ingredients->whereIn('status', ['low_stock', 'out_of_stock'])->count(),
        ]);
    }

    public function store(Request $r)
    {
        $d = $r->validate([
            'name' => 'required|string|max:100',
            'quantity' => 'required|numeric|min:0',
            'unit' => 'required|string|max:20',
            'min_threshold' => 'required|numeric|min:0',
            'cost_per_unit' => 'nullable|numeric|min:0',
        ]);

        $ingredient = Ingredient::create($d);

        if ($ingredient->quantity <= $ingredient->min_threshold) {
            StockAlert::create([
                'ingredient_id' => $ingredient->id,
                'ingredient_name' => $ingredient->name,
                'message' => "Stock is low ({$ingredient->quantity} {$ingredient->unit} remaining, min: {$ingredient->min_threshold})",
                'reported_by' => 'System',
            ]);
        }

        PosUpdated::safeDispatch();
        return response()->json($ingredient, 201);
    }

    public function update(Request $r, $ingredient)
    {
        $item = $ingredient instanceof Ingredient ? $ingredient : Ingredient::findOrFail($ingredient);
        $d = $r->validate([
            'name' => 'sometimes|string|max:100',
            'quantity' => 'sometimes|numeric|min:0',
            'unit' => 'sometimes|string|max:20',
            'min_threshold' => 'sometimes|numeric|min:0',
            'cost_per_unit' => 'nullable|numeric|min:0',
        ]);

        $item->update($d);

        // Auto alert if stock drops to or below threshold, or auto-resolve if restored
        if ($item->quantity <= $item->min_threshold) {
            $hasActive = StockAlert::where('ingredient_id', $item->id)->where('is_resolved', false)->exists();
            if (!$hasActive) {
                StockAlert::create([
                    'ingredient_id' => $item->id,
                    'ingredient_name' => $item->name,
                    'message' => "Stock is low ({$item->quantity} {$item->unit} remaining)",
                    'reported_by' => 'System Alert',
                ]);
            }
        } elseif ($item->quantity > $item->min_threshold) {
            StockAlert::where('ingredient_id', $item->id)->where('is_resolved', false)->update(['is_resolved' => true]);
        }

        PosUpdated::safeDispatch();
        return response()->json($item);
    }

    // Quick restock delivery shipment
    public function restock(Request $r, $ingredient)
    {
        $item = $ingredient instanceof Ingredient ? $ingredient : Ingredient::findOrFail($ingredient);
        $d = $r->validate([
            'amount' => 'required|numeric|min:0.01',
            'cost_per_unit' => 'nullable|numeric|min:0',
            'note' => 'nullable|string|max:200',
        ]);

        $newQty = round($item->quantity + $d['amount'], 2);
        $updateData = ['quantity' => $newQty];
        if (isset($d['cost_per_unit']) && $d['cost_per_unit'] !== null && $d['cost_per_unit'] !== '') {
            $updateData['cost_per_unit'] = $d['cost_per_unit'];
        }

        $item->update($updateData);

        if ($item->quantity > $item->min_threshold) {
            StockAlert::where('ingredient_id', $item->id)->where('is_resolved', false)->update(['is_resolved' => true]);
        }

        PosUpdated::safeDispatch();
        return response()->json($item);
    }

    public function destroy($ingredient)
    {
        $item = $ingredient instanceof Ingredient ? $ingredient : Ingredient::findOrFail($ingredient);
        $item->delete();
        PosUpdated::safeDispatch();
        return response()->json(['ok' => true]);
    }

    // Kitchen staff 1-click low stock notification to Manager / Owner
    public function notifyLow(Request $r, $ingredient)
    {
        $item = $ingredient instanceof Ingredient ? $ingredient : Ingredient::findOrFail($ingredient);
        $customNote = $r->input('note', 'Reported running low during shift');
        $alert = StockAlert::create([
            'ingredient_id' => $item->id,
            'ingredient_name' => $item->name,
            'message' => "Kitchen Alert: {$item->name} is running low! ({$item->quantity} {$item->unit} left. {$customNote})",
            'reported_by' => $r->user() ? $r->user()->name : 'Kitchen Staff',
        ]);

        PosUpdated::safeDispatch();
        return response()->json(['ok' => true, 'alert' => $alert]);
    }

    public function alerts()
    {
        return StockAlert::where('is_resolved', false)->latest()->get();
    }

    public function resolveAlert($alert)
    {
        $item = $alert instanceof StockAlert ? $alert : StockAlert::findOrFail($alert);
        $item->update(['is_resolved' => true]);
        PosUpdated::safeDispatch();
        return response()->json(['ok' => true]);
    }
}
