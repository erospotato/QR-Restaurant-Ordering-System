<?php
namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Throwable;

// Tells staff (private channel) and customers (public channel) to refresh. Carries no data.
class PosUpdated implements ShouldBroadcastNow
{
    use Dispatchable;

    public static function safeDispatch(): void
    {
        try {
            static::dispatch();
        } catch (Throwable $e) {
            // Silently continue if Reverb websocket server is offline;
            // frontend polling fallback ensures updates continue smoothly.
        }
    }

    public function broadcastOn(): array { return [new PrivateChannel('staff'), new Channel('pos')]; }
    public function broadcastAs(): string { return 'pos.updated'; }
    public function broadcastWith(): array { return ['t' => time()]; }
}
