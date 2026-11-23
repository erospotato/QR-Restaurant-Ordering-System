<?php
namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class StaffUserController extends Controller
{
    public function index()
    {
        return User::orderBy('id')->get(['id', 'name', 'email', 'role', 'created_at']);
    }

    public function store(Request $r)
    {
        $d = $r->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'required|in:admin,owner,manager,cashier,kitchen',
        ]);

        $user = User::create([
            'name' => $d['name'],
            'email' => $d['email'],
            'password' => Hash::make($d['password']),
            'role' => $d['role'],
        ]);

        return response()->json($user, 201);
    }

    public function update(Request $r, User $user)
    {
        $d = $r->validate([
            'name' => 'sometimes|string|max:100',
            'email' => "sometimes|email|unique:users,email,{$user->id}",
            'password' => 'nullable|string|min:6',
            'role' => 'sometimes|in:admin,owner,manager,cashier,kitchen',
        ]);

        if (!empty($d['password'])) {
            $d['password'] = Hash::make($d['password']);
        } else {
            unset($d['password']);
        }

        $user->update($d);
        return response()->json($user);
    }

    public function destroy(Request $r, User $user)
    {
        if ($r->user()->id === $user->id) {
            abort(400, 'Cannot delete your own account');
        }
        $user->delete();
        return response()->json(['ok' => true]);
    }
}
