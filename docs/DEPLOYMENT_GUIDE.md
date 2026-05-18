# Deployment Guide

## GitHub

Commit source code, migrations, seed data, and docs. Do not commit `.env.local`.

## Vercel

1. Import the GitHub repository into Vercel.
2. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Build command:
   - `npm.cmd run build` on Windows locally
   - `npm run build` on Vercel
4. Output directory:
   - `dist`

## Supabase

Deploy SQL migrations before using the app. Run seed only for demo or initial setup.

## Production Checklist

- RLS enabled on all protected tables.
- Owner user linked to `user_profiles`.
- Business created and modules enabled.
- Storage buckets created for receipts/backups if file output is used.
- Backup links are signed or access-controlled.
- No service-role key in frontend variables.
- Test Owner, Manager, Staff, and Customer flows.

## Scaling

- Keep pagination for list pages.
- Use branch/date/status filters.
- Avoid broad dashboard queries.
- Move heavy backup generation and reports into background jobs when data grows.
