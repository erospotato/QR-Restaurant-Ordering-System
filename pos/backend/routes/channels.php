<?php
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('staff', fn ($user) => in_array($user->role, ['admin', 'kitchen']));
