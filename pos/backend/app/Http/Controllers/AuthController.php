<?php
namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $r)
    {
        $r->validate(['email' => 'required|email', 'password' => 'required|string']);
        $u = User::where('email', $r->email)->first();
        if (!$u || !Hash::check($r->password, $u->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }
        return ['token' => $u->createToken('pos')->plainTextToken, 'user' => $u->only('name', 'role')];
    }

    public function logout(Request $r)
    {
        $r->user()->currentAccessToken()->delete();
        return ['ok' => true];
    }

    public function me(Request $r) { return $r->user()->only('name', 'role'); }
}
