<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles)
    {
        $user = $request->user();
        if (!$user) {
            abort(401, 'Unauthenticated');
        }

        // 'admin' and 'owner' have universal access
        if (in_array($user->role, ['admin', 'owner'])) {
            return $next($request);
        }

        abort_unless(in_array($user->role, $roles), 403, 'Unauthorized access for role: ' . $user->role);
        return $next($request);
    }
}
