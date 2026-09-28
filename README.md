# CropVision AI — Frontend

React + Vite app for CropVision AI: crop health checks from a photo, crop / fertilizer / irrigation /
yield tools, the Krishi Mitra chat assistant, farm records and an admin panel.

The API lives in [cropvision-backend](https://github.com/vishalpatilmaske/cropvision-backend).

## Setup

**Prerequisites:** Node 18+ and the backend running (locally on `:8000`, or deployed).

```bash
npm install
cp .env.example .env        # VITE_API_BASE_URL=http://localhost:8000
npm run dev                 # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |

## Configuration

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend URL, no trailing slash |

- Local dev (`.env`): `http://localhost:8000`
- Production builds (`.env.production`, committed): `https://cropvision-backend.vercel.app`

It is baked into the build, so a change needs a rebuild / redeploy. A `VITE_API_BASE_URL` set in
Vercel's Environment Variables (type **Config**, not Secret) overrides `.env.production`. Never put secrets in a `VITE_*`
variable — they end up in the browser bundle.

## Structure

```
src/
├── api/          axios client (auth header, session-expiry handling) + per-feature API calls
├── context/      AuthContext (farmer), AdminAuthContext
├── components/   Navbar, route guards, AnalysisResult (health report), FarmAssistant (chat),
│                 DigitalTwin (3D, lazy-loaded), tools/ (shared form pieces)
├── hooks/        useFarmLocation, useSeasonWeather, useScrolled
├── lib/          compressImage (shrinks photos before upload), cropSimulation, farmOptions, storage
├── pages/        One file per route (Home, Login, DiseaseDetection, History, Admin*, ...)
└── styles/       CSS per area; button colours are --btn / --btn-hover in index.css
```

## Deployment (Vercel)

Import this repo as a Vercel project (preset **Vite**) and deploy — the backend URL comes from
`.env.production`. `vercel.json` makes every route load the app and caches built assets. Then add this
site's URL to the backend's `ALLOWED_ORIGINS`.

Full walkthrough for both projects:
[DEPLOYMENT.md](https://github.com/vishalpatilmaske/cropvision-backend/blob/main/DEPLOYMENT.md).
