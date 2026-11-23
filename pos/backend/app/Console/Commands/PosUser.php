<?php
namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class PosUser extends Command
{
    protected $signature = 'pos:user {name} {email} {password} {role=kitchen}';
    protected $description = 'Create or update a staff user (roles: admin, owner, manager, cashier, kitchen)';

    public function handle(): int
    {
        $allowed = ['admin', 'owner', 'manager', 'cashier', 'kitchen'];
        $role = strtolower($this->argument('role'));
        if (!in_array($role, $allowed)) {
            $this->error('Role must be one of: ' . implode(', ', $allowed));
            return 1;
        }

        User::updateOrCreate(['email' => $this->argument('email')], [
            'name' => $this->argument('name'),
            'password' => Hash::make($this->argument('password')),
            'role' => $role,
        ]);
        $this->info("User '{$this->argument('name')}' saved with role '{$role}'.");
        return 0;
    }
}
