# Restaurant POS: QR table ordering

Stack: React + Vite + Tailwind · Laravel REST API · MySQL · Sanctum · Reverb + Echo · qrcode.react · local/Cloudinary images · VPS + Nginx · Git/GitHub

    pos/
      backend-overlay/   our Laravel files (copied onto a fresh Laravel install)
      frontend/          React app
      deploy/            nginx + systemd files

## 1. Create the backend (PHP 8.2+, Composer, MySQL)
    cd pos
    composer create-project laravel/laravel backend
    cd backend
    php artisan install:api            # Sanctum
    php artisan install:broadcasting   # answer yes to Reverb (and Node deps)
    cp -r ../backend-overlay/. . && rm -rf ../backend-overlay
Edit `backend/.env`:

    DB_CONNECTION=mysql  DB_DATABASE=pos  DB_USERNAME=...  DB_PASSWORD=...   (create the DB first)
    APP_URL=http://localhost:8000
    BROADCAST_CONNECTION=reverb        # set by the installer
    ADMIN_EMAIL=owner@yourmail.com  ADMIN_PASSWORD=choose-one  TABLES=10
    MENU_DISK=public

Then: `php artisan migrate --seed` (creates owner, tables 1..N with secret tokens, sample menu).
Optional: in `config/sanctum.php` set `'expiration' => 720` so staff tokens expire after 12 h.

## 2. Run locally
    cd backend && php artisan serve          # API :8000
    cd backend && php artisan reverb:start   # websockets :8080
    cd frontend && cp .env.example .env && npm install && npm run dev -- --host
Put `REVERB_APP_KEY` from backend/.env into `VITE_REVERB_APP_KEY`. Open http://YOUR-IP:5173/staff, log in, print QR codes (they point to the address you opened).

## 3. Staff accounts
    php artisan pos:user "Anna" anna@mail.com password123 kitchen     # roles: admin | kitchen
Kitchen: orders and billing. Admin: also menu, images, QR codes, sales.

## 4. Deploy on a VPS (Ubuntu)
    sudo apt install nginx mysql-server php8.3-fpm php8.3-{mysql,mbstring,xml,curl,zip,bcmath,gd} composer nodejs npm git certbot python3-certbot-nginx
    git clone <your-repo> /var/www/pos && cd /var/www/pos
    # backend: composer install --no-dev -o, cp .env, set APP_ENV=production APP_DEBUG=false APP_URL=https://DOMAIN
    #   REVERB_HOST=DOMAIN REVERB_PORT=443 REVERB_SCHEME=https  REVERB_SERVER_HOST=127.0.0.1 REVERB_SERVER_PORT=8080
    #   php artisan key:generate && php artisan migrate --force --seed && php artisan config:cache
    #   sudo chown -R www-data:www-data storage bootstrap/cache
    # frontend: .env -> VITE_REVERB_APP_KEY=<key> VITE_REVERB_HOST= VITE_REVERB_PORT= VITE_REVERB_SCHEME=https ; npm ci && npm run build
    sudo cp deploy/nginx.conf /etc/nginx/sites-available/pos   # edit domain
    sudo ln -s /etc/nginx/sites-available/pos /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx
    sudo certbot --nginx -d DOMAIN
    sudo cp deploy/reverb.service /etc/systemd/system/ && sudo systemctl enable --now reverb
Backups: `mysqldump pos > backup.sql` daily via cron.

## 5. Images
Default: local storage (`storage/app/public`, served by nginx at /storage). For Cloudinary: `composer require cloudinary-labs/cloudinary-laravel`, set its env vars, and `MENU_DISK=cloudinary`.

## 6. GitHub
    git init && git add . && git commit -m "Restaurant POS" && git branch -M main
    git remote add origin git@github.com:YOU/pos.git && git push -u origin main
Update the server later: `git pull`, `composer install --no-dev`, `php artisan migrate --force`, `npm ci && npm run build`, `sudo systemctl restart reverb`.
