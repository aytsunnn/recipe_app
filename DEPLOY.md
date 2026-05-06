# Deploy to 188.233.238.70:3000

## 1) Server prerequisites
- Node.js 20+
- npm
- pm2 (optional, recommended): `npm i -g pm2`

## 2) Upload project
Place project in:
- `/var/www/recipe_app`

## 3) Production env
Create `.env.production` in project root:

```env
NEXT_PUBLIC_API_URL=http://188.233.238.70:5000
NEXT_PUBLIC_STORAGE_URL=http://188.233.238.70:9000
```

## 4) Install and build
```bash
cd /var/www/recipe_app
npm ci
npm run build
```

## 5A) Run with pm2 (recommended)
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Check status:
```bash
pm2 status
pm2 logs recipe-app
```

## 5B) Run without pm2
```bash
npm run start:prod
```

App URL:
- `http://188.233.238.70:3000`

## 6) Nginx reverse proxy (optional but recommended)
Use nginx in front of Next.js and proxy to `127.0.0.1:3000`.
