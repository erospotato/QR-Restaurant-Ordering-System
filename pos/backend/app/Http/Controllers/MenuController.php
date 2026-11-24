<?php
namespace App\Http\Controllers;

use App\Events\PosUpdated;
use App\Models\MenuItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MenuController extends Controller
{
    // Public menu for customers (with search & filtering)
    public function index(Request $r)
    {
        $q = MenuItem::where('is_available', true)
            ->whereNotNull('image_path')
            ->where('image_path', '!=', '')
            ->where('image_path', '!=', 'null');

        if ($search = $r->query('search')) {
            $q->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($category = $r->query('category')) {
            if ($category === 'top_sale') {
                $q->where('is_top_sale', true);
            } elseif ($category === 'signature') {
                $q->where('is_signature', true);
            } elseif ($category === 'promo' || $category === 'member_promo' || $category === 'exclusive') {
                $q->where('is_member_exclusive', true);
            } elseif ($category !== 'all') {
                $q->where('category', $category);
            }
        }

        if ($r->boolean('member_exclusive')) {
            $q->where('is_member_exclusive', true);
        }

        return $q->orderBy('is_member_exclusive', 'desc')->orderBy('category')->orderBy('name')->get();
    }

    // Staff menu with all filters (all items including unavailable)
    public function all(Request $r)
    {
        $q = MenuItem::query();

        if ($search = $r->query('search')) {
            $q->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%")
                      ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if ($cat = $r->query('category')) {
            if ($cat !== 'all') {
                $q->where('category', $cat);
            }
        }

        if ($status = $r->query('status')) {
            if ($status === 'available') $q->where('is_available', true);
            if ($status === 'unavailable') $q->where('is_available', false);
        }

        if ($tag = $r->query('tag')) {
            if ($tag === 'top_sale') $q->where('is_top_sale', true);
            if ($tag === 'signature') $q->where('is_signature', true);
            if ($tag === 'member_exclusive' || $tag === 'promo') $q->where('is_member_exclusive', true);
        }

        return $q->orderBy('is_member_exclusive', 'desc')->orderBy('category')->orderBy('name')->get();
    }

    public function store(Request $r)
    {
        $d = $r->validate([
            'name' => 'required|string|max:80',
            'price' => 'required|numeric|min:0|max:10000',
            'promo_price' => 'nullable|numeric|min:0|max:10000',
            'category' => 'nullable|string|max:40',
            'description' => 'nullable|string|max:500',
            'image' => 'nullable|image|max:5120',
            'image_url' => 'nullable|string|max:1000',
            'is_available' => 'nullable|boolean',
            'is_top_sale' => 'nullable|boolean',
            'is_signature' => 'nullable|boolean',
            'is_member_exclusive' => 'nullable|boolean',
            'min_member_tier' => 'nullable|string|max:30',
            'promo_badge' => 'nullable|string|max:60',
        ]);

        unset($d['image']);
        unset($d['image_url']);

        if ($r->hasFile('image')) {
            $d['image_path'] = $r->file('image')->store('menu', config('pos.disk', 'public'));
        } elseif ($r->filled('image_url')) {
            $d['image_path'] = $r->input('image_url');
        }

        $d['category'] = $d['category'] ?: 'Other';
        $d['is_available'] = $r->boolean('is_available', true);
        $d['is_top_sale'] = $r->boolean('is_top_sale', false);
        $d['is_signature'] = $r->boolean('is_signature', false);
        $d['is_member_exclusive'] = $r->boolean('is_member_exclusive', false);
        $d['promo_price'] = $r->filled('promo_price') ? (float) $r->input('promo_price') : null;
        $d['min_member_tier'] = $r->input('min_member_tier') ?: 'Bronze';
        $d['promo_badge'] = $r->input('promo_badge') ?: 'MEMBER EXCLUSIVE';

        $item = MenuItem::create($d);
        PosUpdated::safeDispatch();
        return response()->json($item, 201);
    }

    public function update(Request $r, $item)
    {
        $item = $item instanceof MenuItem ? $item : MenuItem::findOrFail($item);
        $d = $r->validate([
            'name' => 'sometimes|string|max:80',
            'price' => 'sometimes|numeric|min:0|max:10000',
            'promo_price' => 'nullable|numeric|min:0|max:10000',
            'category' => 'sometimes|string|max:40',
            'description' => 'nullable|string|max:500',
            'image' => 'nullable|image|max:5120',
            'image_url' => 'nullable|string|max:1000',
            'is_available' => 'sometimes|boolean',
            'is_top_sale' => 'sometimes|boolean',
            'is_signature' => 'sometimes|boolean',
            'is_member_exclusive' => 'sometimes|boolean',
            'min_member_tier' => 'nullable|string|max:30',
            'promo_badge' => 'nullable|string|max:60',
        ]);

        unset($d['image']);
        unset($d['image_url']);

        if ($r->hasFile('image')) {
            if ($item->image_path && !Str::startsWith($item->image_path, ['http://', 'https://'])) {
                Storage::disk(config('pos.disk', 'public'))->delete($item->image_path);
            }
            $d['image_path'] = $r->file('image')->store('menu', config('pos.disk', 'public'));
        } elseif ($r->has('image_url') && $r->filled('image_url')) {
            $d['image_path'] = $r->input('image_url');
        }

        if ($r->has('is_member_exclusive')) {
            $d['is_member_exclusive'] = $r->boolean('is_member_exclusive');
        }
        if ($r->has('promo_price')) {
            $d['promo_price'] = $r->filled('promo_price') ? (float) $r->input('promo_price') : null;
        }
        if ($r->has('min_member_tier')) {
            $d['min_member_tier'] = $r->input('min_member_tier') ?: 'Bronze';
        }
        if ($r->has('promo_badge')) {
            $d['promo_badge'] = $r->input('promo_badge') ?: 'MEMBER EXCLUSIVE';
        }

        $item->update($d);
        PosUpdated::safeDispatch();
        return response()->json($item);
    }

    public function destroy($item)
    {
        $item = $item instanceof MenuItem ? $item : MenuItem::findOrFail($item);
        if ($item->image_path && !Str::startsWith($item->image_path, ['http://', 'https://'])) {
            Storage::disk(config('pos.disk', 'public'))->delete($item->image_path);
        }
        $item->delete();
        PosUpdated::safeDispatch();
        return response()->json(['ok' => true]);
    }
}
