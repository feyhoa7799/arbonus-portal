# Setup checklist

## Supabase Auth
- [ ] Email / Password enabled
- [ ] Confirm email enabled
- [ ] SMTP подключен
- [ ] Site URL указан
- [ ] Redirect URL содержит `https://your-domain/auth/callback`

## Cloudflare Turnstile
- [ ] Site key добавлен в `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- [ ] Secret key добавлен в `TURNSTILE_SECRET_KEY`

## Storage
- [ ] В `storage.buckets` появились `site-private-files` и `site-private-media`

## Data
- [ ] Выполнен `npm run seed:resources`
- [ ] Выполнен `npm run import:allowlist -- /path/to/file.xlsx`

## Deploy
- [ ] `.env.production` заполнен
- [ ] `docker compose build`
- [ ] `docker compose up -d`
- [ ] `/register` работает
- [ ] `/portal` открывается после входа
