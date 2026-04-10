<div align="center">

# Movie Suggestion

**A resilience-first movie discovery application built with Next.js 15, React 19, and the TMDB API.**

Browse trending titles, explore popular movies, search with live debounce, filter by genre, and dive into detailed movie pages with recommendations — all backed by a production-grade resilience layer that keeps the experience responsive even when the upstream provider falters.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-2-6E9F18?logo=vitest)](https://vitest.dev/)

</div>

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Running the Development Server](#running-the-development-server)
  - [Production Build](#production-build)
- [Environment Variables](#environment-variables)
  - [Required](#required)
  - [Optional — Shared Cache (Upstash Redis)](#optional--shared-cache-upstash-redis)
  - [Optional — Resilience Tuning](#optional--resilience-tuning)
  - [Optional — Outbound Traffic Control](#optional--outbound-traffic-control)
  - [Optional — Cache Prewarm](#optional--cache-prewarm)
  - [Optional — Debug / Logging](#optional--debug--logging)
- [NPM Scripts](#npm-scripts)
- [Application Pages](#application-pages)
- [API Routes](#api-routes)
- [Architecture Deep Dive](#architecture-deep-dive)
  - [Resilience Pipeline](#resilience-pipeline)
  - [Caching Strategy](#caching-strategy)
  - [Single-Flight Deduplication](#single-flight-deduplication)
  - [Outbound Token-Bucket Limiter](#outbound-token-bucket-limiter)
  - [Inbound Rate Limiting & Middleware](#inbound-rate-limiting--middleware)
  - [Movie Details Outcome Model](#movie-details-outcome-model)
  - [Retry Logic](#retry-logic)
  - [Cache Prewarm System](#cache-prewarm-system)
- [Component Reference](#component-reference)
- [Library Module Reference](#library-module-reference)
- [Testing](#testing)
  - [Test Suite Overview](#test-suite-overview)
  - [Running Tests](#running-tests)
- [Design & Theming](#design--theming)
- [Operational Notes](#operational-notes)
- [License](#license)

---

## Features

- **Trending Movies** — Weekly trending titles fetched from TMDB, server-rendered with revalidation.
- **Popular Movies** — Paginated popular movie browsing with genre filtering.
- **Live Search** — Client-side debounced search (450 ms) that auto-fires after the user stops typing; no button needed.
- **Genre Filtering** — Interactive genre pill buttons on both the trending/popular pages and the search experience.
- **Movie Detail Pages** — Full detail view with backdrop, poster, tagline, rating, runtime, release date, genres, and overview.
- **Recommendations** — "More like this" section on every movie detail page, loaded with Suspense boundaries.
- **Stale-on-Error Fallback** — If TMDB is unreachable, cached (even stale) data is served instead of an error.
- **Single-Flight Deduplication** — Concurrent identical upstream requests are collapsed into one in-flight fetch.
- **Token-Bucket Outbound Limiter** — Throttles outbound TMDB traffic with a configurable queue + token bucket to prevent rate-limit exhaustion.
- **Shared Cache via Upstash Redis** — Optionally share cache across multiple server instances; falls back to in-memory when Redis is not configured.
- **Inbound API Rate Limiting** — Per-client, per-route sliding-window rate limiter with standard `RateLimit-*` response headers.
- **Same-Origin API Protection** — Middleware rejects cross-origin API requests that don't originate from the application itself.
- **Cache Prewarm Endpoint** — Internal POST endpoint to eagerly warm the cache for top trending and popular movie details + recommendations.
- **Graceful Degradation UI** — Dedicated error, not-found, loading, and "details delayed" pages; never a raw stack trace.
- **RetryImage Component** — Client-side image component with exponential-backoff retry and fallback placeholders.
- **Skeleton Loaders** — Pulse-animated skeleton screens for hero sections, movie grids, and detail pages during data fetching.
- **Dark Cinematic UI** — Custom dark theme with a Netflix-inspired red accent, radial hero gradients, glassmorphism navbar, and smooth scrollbar styling.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Framework** | [Next.js](https://nextjs.org/) (App Router) | ^15.0.0 |
| **UI Library** | [React](https://react.dev/) | ^19.0.0 |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | ^5.7.2 |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | ^3.4.17 |
| **Font** | [Outfit](https://fonts.google.com/specimen/Outfit) (via `next/font/google`) | — |
| **Testing** | [Vitest](https://vitest.dev/) | ^2.1.8 |
| **Shared Cache** | [Upstash Redis](https://upstash.com/) (`@upstash/redis`) | ^1.35.3 |
| **Linting** | [ESLint](https://eslint.org/) + `next/core-web-vitals` | ^9.16.0 |
| **CSS Processing** | [PostCSS](https://postcss.org/) + [Autoprefixer](https://github.com/postcss/autoprefixer) | ^8.4.49 / ^10.4.20 |
| **Data Provider** | [TMDB API v3](https://developer.themoviedb.org/docs) | — |

---

## Project Structure

```
MovieSuggestion/
├── app/                          # Next.js App Router directory
│   ├── layout.tsx                # Root layout — HTML shell, Outfit font, global styles
│   ├── page.tsx                  # Home page — hero CTA + inline search experience
│   ├── loading.tsx               # Root-level loading skeleton
│   ├── error.tsx                 # Root-level error boundary (client component)
│   ├── not-found.tsx             # Custom 404 page
│   ├── globals.css               # Tailwind directives, dark color-scheme, scrollbar styles
│   ├── trending/
│   │   └── page.tsx              # /trending — server-rendered trending movies + genre filter
│   ├── popular/
│   │   └── page.tsx              # /popular — server-rendered popular movies + genre filter
│   ├── movie/
│   │   └── [id]/
│   │       ├── page.tsx          # /movie/:id — full movie details + recommendations
│   │       └── loading.tsx       # Detail-level loading skeleton
│   └── api/
│       ├── trending/
│       │   └── route.ts          # GET /api/trending
│       ├── popular/
│       │   └── route.ts          # GET /api/popular
│       ├── search/
│       │   └── route.ts          # GET /api/search?query=&page=
│       ├── discover/
│       │   └── route.ts          # GET /api/discover?genreId=&page=
│       └── prewarm/
│           └── route.ts          # POST /api/prewarm (secret-protected)
├── components/                   # Reusable React components
│   ├── Navbar.tsx                # Sticky glassmorphism navbar with active tab indicator
│   ├── MovieCard.tsx             # Individual movie card with poster, rating, overview
│   ├── MovieListContent.tsx      # Client component — genre-filtered movie wall
│   ├── SearchExperience.tsx      # Client component — debounced search + genre filter + pagination
│   ├── SearchBar.tsx             # Controlled text input with "Ctrl K" hint
│   ├── GenreFilter.tsx           # Horizontal genre pill buttons
│   ├── RetryImage.tsx            # next/image wrapper with exponential-backoff retry on error
│   ├── SectionHeader.tsx         # Eyebrow + title + description heading block
│   └── Skeletons.tsx             # MovieCardSkeleton, MovieGridSkeleton, HeroSkeleton, DetailsSkeleton
├── lib/                          # Core backend modules
│   ├── api.ts                    # TMDB API client, resilience orchestration, all data functions
│   ├── resilienceConfig.ts       # All tunable resilience parameters (env-driven with defaults)
│   ├── resilienceLogger.ts       # Structured resilience event logger with key redaction
│   ├── sharedCache.ts            # Dual-layer cache: in-memory Map + optional Upstash Redis
│   ├── singleFlight.ts           # In-flight request deduplication (single-flight pattern)
│   ├── outboundLimiter.ts        # Token-bucket rate limiter for outbound TMDB requests
│   └── rateLimit.ts              # Inbound per-client sliding-window rate limiter
├── tests/                        # Vitest test suite
│   ├── apiResilience.test.ts     # Stale-fallback classification tests
│   ├── movieDetailsOutcome.test.ts # Degraded outcome during retry-soon window
│   ├── outboundLimiter.test.ts   # Queue-full and queue-timeout behavior
│   ├── prewarmRoute.test.ts      # Prewarm endpoint metrics and secret enforcement
│   ├── sharedCache.test.ts       # Memory-only fallback + corrupt record handling
│   └── singleFlight.test.ts      # Deduplication: work runs once for N callers
├── public/                       # Static assets
│   ├── favicon.ico               # Application favicon
│   ├── poster-placeholder.svg    # Fallback for missing movie posters
│   └── backdrop-placeholder.svg  # Fallback for missing movie backdrops
├── middleware.ts                  # Edge middleware — same-origin checks, method filtering, rate limiting
├── next.config.ts                # Next.js config — image remote patterns for image.tmdb.org
├── tailwind.config.ts            # Custom colors (canvas, panel, line, highlight, muted), shadows, gradients
├── vitest.config.ts              # Vitest config — node env, path aliases, test includes
├── tsconfig.json                 # TypeScript strict mode, bundler resolution, @/* path alias
├── postcss.config.js             # PostCSS — Tailwind CSS + Autoprefixer plugins
├── .eslintrc.json                # ESLint — extends next/core-web-vitals
├── .env.example                  # Template for required environment variables
├── .gitignore                    # Ignores .next, node_modules, .env*, debug logs, tsbuildinfo
└── package.json                  # Dependencies, scripts, project metadata
```

---

## Getting Started

### Prerequisites

| Requirement | Minimum Version |
|---|---|
| **Node.js** | 18+ |
| **npm** | 9+ (ships with Node 18+) |
| **TMDB API Key** | Free at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) |

### Installation

```bash
git clone <your-repo-url>
cd MovieSuggestion
npm install
```

### Configuration

1. Copy the example environment file:

```bash
cp .env.example .env.local
```

2. Open `.env.local` and add your TMDB API key:

```env
TMDB_API_KEY=your_tmdb_api_key_here
```

> **Without this key, every page will show a "Setup Required" prompt instead of movie data.**

### Running the Development Server

```bash
npm run dev
```

This first removes the `.next` build cache for a clean start, then boots the Next.js dev server. The application will be available at **`http://localhost:3000`**.

### Production Build

```bash
npm run build    # cleans .next, then creates an optimized production build
npm start        # starts the production server on port 3000
```

---

## Environment Variables

### Required

| Variable | Description |
|---|---|
| `TMDB_API_KEY` | Your TMDB v3 API key. Obtain one for free at [themoviedb.org](https://www.themoviedb.org/settings/api). |

---

## NPM Scripts

| Command | Description |
|---|---|
| `npm run dev` | Removes `.next`, then starts the Next.js development server with hot reload. |
| `npm run build` | Removes `.next`, then creates an optimized production build. |
| `npm start` | Starts the production server (requires a prior `npm run build`). |
| `npm run lint` | Runs ESLint with the `next/core-web-vitals` ruleset. |
| `npm run clean` | Deletes the `.next` directory. |
| `npm run test` | Runs the full Vitest test suite once. |
| `npm run test:watch` | Runs Vitest in interactive watch mode. |

---

## Application Pages

### `/` — Home

The landing page displays a cinematic hero section with a radial gradient background. It provides two primary CTAs — **"Explore Trending"** and **"Browse Popular"** — and an embedded `SearchExperience` component for instant movie search. If the `TMDB_API_KEY` is not configured, a setup instruction prompt is shown instead.

### `/trending` — Trending Movies

Server-rendered page that fetches the weekly trending movies and the full genre list from TMDB in parallel via `Promise.all`. Results are displayed in a responsive 5-column grid with an interactive genre filter bar. Selecting a genre triggers a client-side fetch to `/api/discover`. The page includes a dedicated error state for TMDB unavailability.

### `/popular` — Popular Movies

Identical layout to `/trending` but fetches the most popular movies. Shares the same `MovieListContent` client component and genre filtering behavior.

### `/movie/[id]` — Movie Details

Dynamic route with full movie information:

- **Backdrop** — Full-width backdrop image with gradient overlay, loaded via `RetryImage`.
- **Poster** — 320px poster with rounded corners and shadow.
- **Metadata** — Title, tagline, TMDB rating (formatted to 1 decimal), release date (formatted `Month Day, Year`), runtime in minutes, and genre pills.
- **Overview** — Full movie synopsis.
- **Recommendations** — "More like [title]" section loaded inside a `<Suspense>` boundary with a skeleton fallback. Displays up to 10 recommended movies.
- **Degraded State** — If the movie details are temporarily delayed (retry-soon window), a "Loading Delayed" page is shown with a retry link and countdown.
- **Hard Failure** — If the movie is not found (404) or the API key is invalid (401), a permanent error is displayed.

### Error & Not Found Pages

- **`error.tsx`** — Client-side error boundary with a "Try again" button that calls Next.js `reset()`.
- **`not-found.tsx`** — Custom 404 page with a "Back to Home" link.
- **`loading.tsx`** — Root-level loading skeleton showing hero + two movie grid skeletons.

---

## API Routes

All API routes are protected by the Edge middleware in `middleware.ts`.

| Route | Method | Query Parameters | Description |
|---|---|---|---|
| `/api/trending` | `GET` | — | Returns the weekly trending movies from TMDB. Response: `{ results, totalPages }`. |
| `/api/popular` | `GET` | — | Returns popular movies (page 1). Response: `{ results, totalPages }`. |
| `/api/search` | `GET` | `query` (required, max 120 chars), `page` (optional, 1–500) | Searches movies by title. Returns `{ page, results, totalPages }`. Empty query returns an empty result set. On recoverable TMDB errors, returns 200 with `results: []` and a `message` field. |
| `/api/discover` | `GET` | `genreId` (required, positive integer), `page` (optional, 1–500) | Discovers movies by genre sorted by popularity. Same response shape as search. Same recoverable-error behavior. |
| `/api/prewarm` | `POST` | — | Requires `x-prewarm-secret` header matching `PREWARM_SECRET`. Fetches trending + N popular pages, then warms movie details and recommendations caches in batched parallel workers. Response: `{ attempted, requested, warmed, failedCount, failed, skipped, durationMs }`. Returns 401 on wrong secret, 503 if secret is not configured. |

### API Response Headers

All `/api/*` responses include rate-limit headers when processed by the middleware:

| Header | Description |
|---|---|
| `RateLimit-Limit` | Maximum requests allowed in the current window (default: 60). |
| `RateLimit-Remaining` | Remaining requests in the current window. |
| `RateLimit-Reset` | Seconds until the rate-limit window resets. |
| `Retry-After` | Present only on 429 responses; seconds until the client should retry. |

---

## Architecture Deep Dive

### Resilience Pipeline

Every TMDB request flows through a multi-layered resilience pipeline defined in `lib/api.ts`:

```
Request → Cache Check → Single-Flight → Outbound Limiter → fetch() → Retry Loop
                ↓ (fresh)              ↓ (stale + error)
           Return cached          Return stale cache
```

1. **Cache Check** — `readSharedCache` looks up the key first in the in-memory `Map`, then in Redis. If the record is fresh (age ≤ `freshTtlMs`), it is returned immediately without any upstream call.
2. **Stale Revalidation** — If the record exists but is stale (age > `freshTtlMs` but ≤ `maxTtlMs`), the pipeline proceeds to refresh.
3. **Single-Flight** — `withSingleFlight` ensures only one upstream request is in flight per cache key; all concurrent callers receive the same promise.
4. **Outbound Limiter** — `runWithOutboundLimit` acquires a token from the token bucket before the `fetch()` call. If no tokens are available, the request is queued. If the queue is full or times out, an error is thrown.
5. **fetch() with Retry** — `performTmdbRequest` executes the actual HTTP call with configurable timeout via `AbortController`, then retries on transient errors (network errors, 429, 5xx) with exponential backoff + jitter. It respects the `Retry-After` header from TMDB when present.
6. **Stale-on-Error Fallback** — If the upstream fetch fails and the error is classified as recoverable (`isRecoverableForStale`), and a stale cache entry exists, the stale data is returned. This ensures the user sees *something* rather than an error page.

### Caching Strategy

**Dual-layer cache** implemented in `lib/sharedCache.ts`:

| Layer | Storage | Scope | Eviction |
|---|---|---|---|
| **L1** | In-memory `Map<string, CacheRecord>` | Per-process | Entries deleted when age exceeds `maxTtlMs` on read |
| **L2** | Upstash Redis | Cross-instance | TTL set via Redis `EX` parameter (`maxTtlMs / 1000` seconds) |

**Read flow:**
1. Check L1 (memory). If valid and within `maxTtlMs`, return it (marking it fresh or stale based on `freshTtlMs`).
2. If L1 misses, check L2 (Redis). If found and valid, backfill L1 and return.
3. If both miss, return `null` (triggers upstream fetch).

**Write flow:**
1. Write to L1 immediately.
2. Write to L2 asynchronously. Redis write failures are silently ignored to prevent cache write errors from propagating to the user.

**Cache key format:** `tmdb:{scope}:{endpoint}:{normalizedParams}`

Parameters are normalized by sorting keys alphabetically, filtering out empty values, and joining with `&`. This ensures cache key consistency regardless of parameter order.

**Per-endpoint TTL defaults:**

| Scope | Fresh TTL | Max (Stale) TTL |
|---|---|---|
| Trending | 30 min | 2 hours |
| Popular | 30 min | 2 hours |
| Genres | 24 hours | 48 hours |
| Movie Details | 30 min | 24 hours |
| Recommendations | 30 min | 24 hours |
| Search | 20 sec | 60 sec |

Search results are only cached when the query is 3–40 characters long and the page is ≤ 2, to avoid polluting the cache with ephemeral partial-typing queries.

### Single-Flight Deduplication

Implemented in `lib/singleFlight.ts` using an in-memory `Map<string, Promise>`.

When multiple concurrent requests target the same cache key:
1. The **first** caller starts the work and stores the promise in the map.
2. **Subsequent** callers receive the same promise.
3. Once the promise settles, the key is removed from the map via `finally`.

This prevents the "thundering herd" problem where N simultaneous users trigger N identical upstream requests.

### Outbound Token-Bucket Limiter

Implemented in `lib/outboundLimiter.ts` as a `TokenBucketLimiter` class:

- **Token Bucket** — Starts at `outboundBucketSize` tokens (default: 40). Tokens refill at `outboundTokenRatePerSecond` (default: 6/sec).
- **FIFO Queue** — When no tokens are available, requests are queued. The queue is drained on each `acquire()` call and periodically via a background `setInterval` tick.
- **Queue Limit** — If the queue reaches `outboundQueueLimit` (default: 500), new requests are immediately rejected with `"Outbound TMDB queue full"` after a short saturation backoff (60–180 ms with jitter).
- **Queue Timeout** — Queued requests that wait longer than `outboundQueueTimeoutMs` (default: 8 s) are rejected with `"Outbound TMDB queue timeout"`.
- **Metrics** — Tracks `queueFull`, `queueTimeout`, `acquiredImmediately`, and `acquiredFromQueue` counters, accessible via `getOutboundLimiterMetrics()`.
- **Background Tick** — A server-side `setInterval` (with `.unref()` to avoid preventing Node.js exit) periodically calls `drainQueue()` to service queued waiters even when no new `acquire()` calls arrive.

### Inbound Rate Limiting & Middleware

The Edge middleware (`middleware.ts`) intercepts all `/api/*` requests:

1. **Method Filter** — Only `GET`, `HEAD`, and `OPTIONS` are allowed; everything else gets a `405`.
2. **Same-Origin Check** — Validates the `Origin` or `Referer` header against the request's own host. Cross-origin requests receive a `403`. Server-rendered requests (no `Origin` or `Referer`) are allowed through.
3. **Rate Limiting** — A sliding-window counter per `{route}:{clientIP}` bucket. Default: **60 requests per 60 seconds**. Client IP is extracted from `x-forwarded-for` → `x-real-ip` → `"unknown"`. Exceeded limits return `429` with a `Retry-After` header.
4. **Headers** — All responses are decorated with `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset`.

### Movie Details Outcome Model

`getMovieDetailsOutcome()` returns a discriminated union with three possible outcomes:

| Kind | When | User Experience |
|---|---|---|
| `full` | Details fetched successfully (upstream or cache). | Full movie detail page rendered. |
| `degraded` | Movie is in the "retry-soon" window (a recent recoverable failure set a temporary marker). | "Loading Delayed" page with retry link and countdown timer. No upstream fetch is attempted. |
| `hard-failure` | Non-recoverable error (e.g., 401 invalid key, 404 movie not found). | Error page with descriptive message. |

**Retry-soon marker lifecycle:**
1. Primary fetch fails with a recoverable error → quick-fallback single-attempt fetch is tried.
2. If the quick fallback also fails → `markDetailsRetrySoon(movieId, ttlMs)` sets a timer.
3. During the TTL window, all requests for that movie ID return `degraded` instantly.
4. After TTL expires, the marker is cleaned up via `setTimeout` with `.unref()`.

### Retry Logic

`performTmdbRequest()` implements a robust retry loop:

- **Max Attempts** — Default 5 (configurable per-call).
- **Retryable Conditions:**
  - HTTP status codes: `429`, `500`, `502`, `503`, `504`
  - Network error codes: `ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND`, `ECONNREFUSED`, `EAI_AGAIN`
  - Fetch `TypeError` messages containing: `fetch failed`, `network`, `timed out`, `timeout`, `socket`, `econn`, `eai_`, `undici`
  - Outbound limiter queue saturation errors
- **Backoff Strategy** — Exponential: `baseDelayMs * 2^attempt + jitter(0–200ms)`, capped at `maxDelayMs`. If TMDB returns a `Retry-After` header, that value is used instead (minimum 100 ms).
- **Non-Retryable** — `401` (invalid API key) and `404` (movie not found) throw immediately without retry.

### Cache Prewarm System

`POST /api/prewarm` warms the cache proactively:

1. Fetches trending movies + N pages of popular movies in parallel.
2. Deduplicates movie IDs, limits to `prewarmMovieLimit`.
3. Splits IDs into batches of `prewarmBatchSize`.
4. Processes batches with `prewarmConcurrency` parallel workers.
5. Each movie warms both **details** and **recommendations** via `Promise.all`.
6. Uses `Promise.allSettled` per batch so individual failures don't block the rest.
7. Returns detailed metrics: `attempted`, `warmed`, `failed`, `failedCount`, `skipped` (duplicates), `durationMs`.

---

## Component Reference

| Component | File | Type | Description |
|---|---|---|---|
| **`Navbar`** | `components/Navbar.tsx` | Client | Sticky top navbar with glassmorphism blur, logo/brand, and "Trending"/"Popular" tab links. Active tab has a glowing red underline indicator. Uses `usePathname()` for route detection. |
| **`MovieCard`** | `components/MovieCard.tsx` | Server-compatible | Card displaying a movie poster (via `RetryImage`), rating badge overlay, title, year, and truncated overview. Entire card is a link to `/movie/[id]`. Hover effect: slight upward translate + border brightening + poster scale. |
| **`MovieListContent`** | `components/MovieListContent.tsx` | Client | Drives the trending/popular pages. Receives SSR `initialMovies` and `genres`. When a genre is selected, fetches `/api/discover` client-side. Includes abort controller cleanup on unmount/re-render. Shows skeleton during loading and error banner on failure. |
| **`SearchExperience`** | `components/SearchExperience.tsx` | Client | Full search UI with debounced input (450 ms), genre filter, paginated results with "Load more", and "Clear filters" button. Combines search query + genre filter; when both are active, results are additionally filtered client-side by `genre_ids`. |
| **`SearchBar`** | `components/SearchBar.tsx` | Client | Controlled input field with placeholder, focus ring, and a "Ctrl K" keyboard hint badge. |
| **`GenreFilter`** | `components/GenreFilter.tsx` | Client | Horizontal row of pill-style genre buttons with an "All Genres" reset button. Active genre gets a highlight (red) background. |
| **`RetryImage`** | `components/RetryImage.tsx` | Client | Wraps `next/image` with automatic exponential-backoff retry on load error. Shows a fallback placeholder between retries (interim) and permanently after `maxRetries` (default: 4) failures. Retry delay: `baseDelayMs * 2^attempt + jitter(0–200ms)`. |
| **`SectionHeader`** | `components/SectionHeader.tsx` | Server-compatible | Reusable heading block with optional eyebrow (small red uppercase text), title, and description. |
| **`Skeletons`** | `components/Skeletons.tsx` | Server-compatible | Four skeleton variants: `MovieCardSkeleton` (single card), `MovieGridSkeleton` (responsive grid of N cards), `HeroSkeleton` (hero section), `DetailsSkeleton` (movie detail page with poster + text + grid). All use Tailwind `animate-pulse`. |

---

## Library Module Reference

### `lib/api.ts` — TMDB API Client & Resilience Orchestration

The largest module (890 lines). Contains:

- **Type Definitions** — `Genre`, `Movie`, `MovieDetails`, `PaginatedResponse<T>`, `TmdbFetchMetadata`, `MovieDetailsOutcome`, `TmdbFetchResult<T>`, `FetchOptions`, `CachePolicy`.
- **`TmdbFetchError`** — Custom error class with optional `code` and `status` fields.
- **`performTmdbRequest<T>()`** — Low-level fetch with retry loop, timeout, and error classification.
- **`tmdbFetchWithResilience<T>()`** — High-level wrapper adding cache check, single-flight, and stale-on-error fallback.
- **Data Functions:**
  - `getTrendingMovies()` — `/trending/movie/week` (30 min fresh, 2 h stale)
  - `getPopularMovies(page)` — `/movie/popular` (30 min fresh, 2 h stale)
  - `searchMovies(query, page)` — `/search/movie` (20 s fresh, 60 s stale, conditional caching)
  - `getMovieDetails(movieId)` — `/movie/{id}` (throws on non-full outcome)
  - `getMovieDetailsWithMeta(movieId)` — Returns `TmdbFetchResult<MovieDetails>` with metadata
  - `getMovieDetailsOutcome(movieId)` — Returns discriminated union (`full` / `degraded` / `hard-failure`)
  - `getMovieGenres()` — `/genre/movie/list` (24 h fresh, 48 h stale)
  - `discoverMoviesByGenre(genreId, page)` — `/discover/movie` (no cache)
  - `getRecommendedMovies(movieId)` — `/movie/{id}/recommendations` (30 min fresh, 24 h stale)
  - `prewarmMovieCaches(movieIds)` — Batch parallel warm for details + recommendations
- **Helpers** — `getPosterUrl()`, `getBackdropUrl()`, `formatRating()`, `formatDate()`, `hasTmdbApiKey()`.
- **Test Utilities** — `__setDetailsRetrySoonMarkerForTest()`, `__clearDetailsRetrySoonMarkersForTest()`.

### `lib/resilienceConfig.ts` — Configuration

Reads all resilience parameters from environment variables with type-safe parsing and sensible defaults. Uses `parseNumberSetting(raw, { minimum, fallback })` and `parseBoolean(raw, fallback)` helpers that validate against minimum bounds and fall back gracefully.

### `lib/resilienceLogger.ts` — Structured Logging

Logs resilience events (cache hits, retries, queue events, errors) in structured format: `[RESILIENCE] event_name { details }`. Key-containing fields (`key`, `cacheKey`) are automatically redacted to a stable FNV-1a hash to prevent leaking API parameters into logs.

**Supported events:** `cache_mode`, `cache_invalid_record`, `cache_hit`, `cache_miss`, `cache_stale_served`, `stale_served_on_error`, `cache_write`, `singleflight_join`, `singleflight_create`, `outbound_acquired_immediately`, `outbound_acquired_from_queue`, `outbound_queue_full`, `outbound_queue_timeout`, `tmdb_retry`, `tmdb_terminal_error`.

### `lib/sharedCache.ts` — Dual-Layer Cache

In-memory `Map` + optional Upstash Redis. See [Caching Strategy](#caching-strategy) for full details.

### `lib/singleFlight.ts` — Request Deduplication

23-line module. Maintains an in-memory `Map<string, Promise>`. Exports `withSingleFlight<T>(key, work)` and `getSingleFlightSize()`.

### `lib/outboundLimiter.ts` — Token Bucket

`TokenBucketLimiter` class with FIFO queue. See [Outbound Token-Bucket Limiter](#outbound-token-bucket-limiter) for full details. Exports `runWithOutboundLimit<T>(work)`, `getOutboundQueueLength()`, `getOutboundLimiterMetrics()`, `resetOutboundLimiterMetrics()`.

### `lib/rateLimit.ts` — Inbound Rate Limiting

Sliding-window counter using an in-memory `Map<string, Bucket>`. Exports `checkRateLimit(key, config)` returning `{ allowed, limit, remaining, resetAt, retryAfterSeconds }` and `getClientIdentifier(request)` that resolves client IP from proxy headers.

---

## Testing

### Test Suite Overview

| Test File | What It Covers |
|---|---|
| `apiResilience.test.ts` | Verifies `isRecoverableTmdbErrorForStale()` correctly classifies retryable HTTP statuses (429, 503) and transient error codes (`OUTBOUND_QUEUE_FULL`, `ETIMEDOUT`) as stale-recoverable, while rejecting non-transient statuses (404). |
| `movieDetailsOutcome.test.ts` | Confirms that `getMovieDetailsOutcome()` returns a `degraded` outcome instantly during the retry-soon window, **without** calling `fetch`, by using the `__setDetailsRetrySoonMarkerForTest` helper. |
| `outboundLimiter.test.ts` | Tests token-bucket behavior: (1) when the queue is full, new requests are rejected with "queue full"; (2) when requests wait longer than the timeout, they are rejected with "queue timeout". Uses dynamic imports with `vi.resetModules()` to re-instantiate the limiter with custom env settings per test. |
| `prewarmRoute.test.ts` | Mocks `lib/api` and `lib/resilienceConfig`, then calls the `POST` handler directly. Verifies 200 status, correct metrics in response (`attempted`, `requested`, `warmed`, `failedCount`, `durationMs`), and secret enforcement. |
| `sharedCache.test.ts` | (1) Verifies `console.warn` fires exactly once when Redis env vars are missing. (2) Mocks Upstash Redis to return an invalid record (`storedAt: "invalid"`) and verifies `readSharedCache` returns `null` without throwing. |
| `singleFlight.test.ts` | Calls `withSingleFlight` 3 times concurrently with the same key and verifies the work function executes exactly once, all callers get the same result, and the inflight map is cleaned up (size = 0). |

### Running Tests

```bash
# Run all tests once
npm run test

# Run in watch mode (re-runs on file changes)
npm run test:watch
```

Tests run in Node environment with the `@` path alias resolved via Vitest config.

---

## Design & Theming

The application uses a **dark cinematic theme** inspired by streaming platforms:

### Custom Tailwind Colors

| Token | Hex | Usage |
|---|---|---|
| `canvas` | `#09090b` | Page background |
| `panel` | `#11131a` | Card and panel backgrounds |
| `line` | `#232634` | Borders and dividers |
| `highlight` | `#e50914` | Primary accent (Netflix-red), active states, CTAs |
| `muted` | `#9ca3af` | Secondary text |

### Custom Utilities

- **`shadow-glow`** — `0 24px 60px rgba(229, 9, 20, 0.18)` — Subtle red glow for emphasis.
- **`bg-hero-gradient`** — Radial red glow at top + vertical fade for hero sections.

### Typography

The **Outfit** Google Font is loaded via `next/font/google` with the `--font-outfit` CSS variable and applied as the default sans-serif.

### Global Styles

- Dark `color-scheme` for native form controls.
- Smooth scroll behavior.
- Full-viewport body with a multi-stop radial/linear background gradient.
- Custom scrollbar styling (thin, translucent, rounded).
- Subtle `rgba(255, 255, 255, 0.08)` default border color.

### Image Handling

- `next.config.ts` allows remote images from `image.tmdb.org`.
- `RetryImage` provides automatic retry with exponential backoff for failed image loads.
- SVG placeholders (`poster-placeholder.svg`, `backdrop-placeholder.svg`) are used as fallbacks.

---

## Operational Notes

- **API Middleware** — All `/api/*` routes are protected by same-origin validation and per-client rate limiting. This means the API routes are intended for use by the application's own frontend only, not as a public API.
- **Rate-Limit Headers** — Every API response includes `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` headers for client-side awareness.
- **Resilience Logs** — Enable `TMDB_RESILIENCE_LOGS=1` to see structured events for cache hits/misses, retry attempts, queue saturation, and stale fallback activations. Key fields are automatically redacted (FNV-1a hash) to avoid leaking API parameters.
- **Debug Logs** — Enable `TMDB_DEBUG=0` for verbose per-request lifecycle logging (`request_start`, `response_not_ok`, `request_success`). **Disable in production** unless actively troubleshooting.
- **Graceful Shutdown** — Background timers (`setInterval` for limiter tick, `setTimeout` for retry-soon cleanup) use `.unref()` so they don't prevent Node.js from exiting cleanly.
- **Prewarm** — Run `POST /api/prewarm` with the `x-prewarm-secret` header after deployment to eagerly populate caches. This is useful for reducing cold-start latency for the most popular movies.
- **Scaling** — Without Upstash Redis, each server instance maintains its own cache. Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to share cache across instances in multi-server deployments.

---

## License

Educational project.
