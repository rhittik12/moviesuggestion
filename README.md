# Movie Suggestion

Movie Suggestion is a Next.js 15 application for discovering, searching, and exploring movies with a resilience-focused backend layer.
It combines server-rendered pages, API route orchestration, caching, and outbound request controls to stay responsive under real traffic.

## Core Capabilities

- Browse trending and popular movies
- Search movies with debounced client UX
- Filter by genre
- View movie details with recommendations
- Handle upstream failures with stale-on-error fallback
- Deduplicate concurrent identical requests (single-flight)
- Throttle outbound provider traffic with queue + token bucket
- Optionally share cache across instances via Upstash Redis

## Tech Stack

- Next.js 15 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 3
- Vitest 2
- Optional Upstash Redis (`@upstash/redis`)

## System Architecture

- `app/`
	Page routes (`/`, `/trending`, `/popular`, `/movie/[id]`) and API routes (`/api/*`)
- `components/`
	UI building blocks: cards, filters, search, skeleton loaders, navbar
- `lib/`
	API client, resilience config, outbound limiter, shared cache, single-flight, logger, rate limiting
- `tests/`
	Resilience and route-level behavior tests

The resilience path in `lib/api.ts` is designed to degrade gracefully instead of failing hard on transient upstream issues.

## Quick Start

### Prerequisites

- Node.js 18+
- A valid movie provider API key

### Install

```bash
npm install
```

### Configure

Create `.env.local`:

```env
TMDB_API_KEY=your_api_key_here
```

### Run

```bash
npm run dev
```

Application runs at `http://localhost:3000`.

## Environment Variables

### Required

- `TMDB_API_KEY`

### Optional: Shared Cache

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

If Redis variables are not set, the app falls back to in-memory cache.

## NPM Scripts

- `npm run dev` - clean `.next` then start development server
- `npm run build` - clean `.next` then production build
- `npm start` - start production server
- `npm run lint` - run lint checks
- `npm run clean` - remove `.next`
- `npm run test` - run Vitest once
- `npm run test:watch` - run Vitest in watch mode

## API Routes

| Route | Method | Notes |
|---|---|---|
| `/api/trending` | GET | Returns trending movies |
| `/api/popular` | GET | Returns popular movies |
| `/api/search?query=&page=` | GET | Search by query with pagination |
| `/api/discover?genreId=&page=` | GET | Discover by genre with pagination |
| `/api/prewarm` | POST | Internal cache warm endpoint (`x-prewarm-secret`) |

## Operational Notes

- API middleware applies same-origin checks and request rate limiting for `/api/*`.
- Responses include rate-limit headers where applicable.
- Debug logs should be disabled in production unless actively troubleshooting.

## Testing

The `tests/` suite covers:

- cache behavior
- resilience classification
- outbound limiter behavior
- single-flight deduplication
- prewarm route behavior

Run with:

```bash
npm run test
```

## License

Educational project.
