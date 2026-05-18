# Environment Setup

## Requirements

- Node.js 20 or newer
- npm
- Supabase project
- GitHub repository
- Vercel project

## Local Setup

```powershell
npm.cmd install
Copy-Item .env.example .env.local
```

Set:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Only use the public anon key in the frontend. Never place service-role keys, database passwords, payment secrets, or storage admin tokens in Vite environment variables.

## Development

```powershell
npm.cmd run dev
```

## Production Build

```powershell
npm.cmd run build
```

## Validation

```powershell
npm.cmd run lint
```

The app uses loading states, empty states, protected routes, module guards, and an app-level error boundary for production runtime safety.
