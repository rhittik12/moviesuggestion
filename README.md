# Movie Suggestion

A modern web app that helps you discover your next favorite movie. Built with Next.js 15 and React 19, it features a clean interface for browsing trending releases, popular titles, and exploring movies by genre.

## What It Does

The app pulls real-time movie data to show you:
- **Trending Movies** - Films people are watching and discussing this week
- **Popular Movies** - Crowd favorites curated from a large movie catalog
- **Genre Exploration** - Browse films by specific genres (Action, Comedy, Drama, etc.)
- **Search & Discover** - Find specific titles or discover new ones through recommendations

Each movie page includes detailed information, ratings, release dates, and personalized recommendations based on what you're viewing.

## Tech Stack

- **Framework:** Next.js 15.0.0 (App Router)
- **UI:** React 19.0.0 with TypeScript
- **Styling:** Tailwind CSS 3.4.17
- **Data Source:** External movie API
- **Font:** Outfit (Google Fonts)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A valid API key

### Installation

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Create a `.env.local` file in the root directory:

```
TMDB_API_KEY=your_actual_api_key_here
```

3. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app running.

### Optional Environment Variables

These are optional and only needed if you want specific features:

```
UPSTASH_REDIS_REST_URL=your_upstash_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_rest_token
PREWARM_SECRET=choose_a_long_random_secret
```

- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`: optional, used for Redis-backed caching. The app runs without Upstash Redis and falls back to in-memory caching.
- `PREWARM_SECRET`: optional, only required if you use the `/api/prewarm` endpoint and want it protected.

## Project Structure

```
app/
├── api/              # API routes for movie data fetching
│   ├── discover/     # Genre-based movie discovery
│   ├── popular/      # Popular movies endpoint
│   ├── search/       # Movie search functionality
│   └── trending/     # Trending movies endpoint
├── movie/[id]/       # Individual movie detail pages
├── globals.css       # Global styles and Tailwind config
├── layout.tsx        # Root layout with font setup
└── page.tsx          # Home page with server-side data loading

components/
├── GenreFilter.tsx   # Genre selection UI
├── HomeContent.tsx   # Main content area with movie grids
├── MovieCard.tsx     # Individual movie card component
├── Navbar.tsx        # Navigation header
├── SearchBar.tsx     # Search input and suggestions
└── SectionHeader.tsx # Section titles with descriptions

lib/
├── api.ts            # API client with error handling
└── rateLimit.ts      # Rate limiting utilities
```

## Key Features

**Server-Side Rendering:** The home page loads initial data on the server for faster first paint and better SEO.

**Client-Side Navigation:** Once loaded, navigation between tabs (trending, popular, genres) happens instantly without full page reloads.

**Error Handling:** Robust error handling for network issues, invalid API keys, and upstream service interruptions. Includes automatic retry for transient network errors.

**Responsive Design:** Mobile-first design that scales from phones to desktop screens, using Tailwind's utility classes.

**Performance:** 
- Clean build cache before each build for consistent results
- Optimized images loaded from a remote image CDN
- Skeleton loaders during data fetching
- AbortController for canceling stale requests

## Available Scripts

- `npm run dev` - Start development server (cleans build cache first)
- `npm run build` - Create production build
- `npm start` - Run production server
- `npm run lint` - Run ESLint checks

## Configuration

The app uses minimal configuration beyond the API key:

- **Revalidation:** Trending/popular movies revalidate every 30 minutes (1800 seconds)
- **Genre Cache:** Movie genres cache for 24 hours (86400 seconds)
- **Image Domains:** Configured in [next.config.ts](next.config.ts)

### Resilience Configuration

The server includes a resilient TMDB fetch path with shared caching, stale-on-error fallback, single-flight deduplication, and outbound queueing. You can tune these with `.env.local` values:

- `TMDB_DETAILS_FRESH_TTL_MS` and `TMDB_DETAILS_STALE_TTL_MS`
- `TMDB_DETAILS_RETRY_SOON_TTL_MS` and `TMDB_DETAILS_QUICK_FALLBACK_TIMEOUT_MS`
- `TMDB_RECS_FRESH_TTL_MS` and `TMDB_RECS_STALE_TTL_MS`
- `TMDB_SEARCH_FRESH_TTL_MS` and `TMDB_SEARCH_STALE_TTL_MS`
- `TMDB_OUTBOUND_TOKENS_PER_SECOND`
- `TMDB_OUTBOUND_BUCKET_SIZE`
- `TMDB_OUTBOUND_QUEUE_LIMIT`
- `TMDB_OUTBOUND_QUEUE_TIMEOUT_MS`
- `TMDB_RESILIENCE_LOGS`
- `PREWARM_MOVIE_LIMIT`, `PREWARM_POPULAR_PAGES`, `PREWARM_BATCH_SIZE`, and `PREWARM_CONCURRENCY`

Recommended production defaults:

- `TMDB_DETAILS_STALE_TTL_MS=86400000`
- `TMDB_RECS_STALE_TTL_MS=86400000`
- `TMDB_OUTBOUND_TOKENS_PER_SECOND=6`
- `TMDB_OUTBOUND_BUCKET_SIZE=40`
- `TMDB_OUTBOUND_QUEUE_LIMIT=500`
- `TMDB_OUTBOUND_QUEUE_TIMEOUT_MS=8000`
- `PREWARM_MOVIE_LIMIT=200`

### Cache Prewarm Endpoint

Use `POST /api/prewarm` with header `x-prewarm-secret: <PREWARM_SECRET>` to prewarm top trending/popular movie details and recommendations. The endpoint now warms multiple popular pages with bounded batching/concurrency and returns run metrics (`attempted`, `warmed`, `failedCount`, `skipped`, `durationMs`). This endpoint is designed for internal automation (for example cron jobs).

## Development Notes

The codebase uses Next.js 15's App Router with React Server Components. Data fetching happens at multiple levels:

1. **Server Component (page.tsx):** Initial load of trending/popular movies and genres
2. **Client Components:** Fetch-on-demand for tab switching and genre filtering
3. **API Routes:** Backend endpoints that proxy provider requests with proper error handling

TypeScript is configured with strict mode enabled. All components are typed with explicit prop types and return types.

## Known Limitations

- Requires a valid API key (won't work without one)
- Network-dependent (no offline mode)
- English language only (hardcoded in API calls)
- No user authentication or watchlist features (yet)

## License

This project is for educational purposes.

---

Built with Next.js, React, and Tailwind CSS.
