import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit, type RateLimitResult, getClientIdentifier } from "@/lib/rateLimit";

const API_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 60
};

function withRateLimitHeaders(response: NextResponse, result: RateLimitResult) {
  response.headers.set("RateLimit-Limit", String(result.limit));
  response.headers.set("RateLimit-Remaining", String(result.remaining));
  response.headers.set("RateLimit-Reset", String(result.retryAfterSeconds));
  return response;
}

function isSameOriginRequest(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (origin) {
    try {
      const originUrl = new URL(origin);

      return (
        originUrl.protocol === request.nextUrl.protocol &&
        originUrl.host === request.nextUrl.host
      );
    } catch {
      return false;
    }
  }

  const referer = request.headers.get("referer");

  if (referer) {
    try {
      const refererUrl = new URL(referer);

      return (
        refererUrl.protocol === request.nextUrl.protocol &&
        refererUrl.host === request.nextUrl.host
      );
    } catch {
      return false;
    }
  }

  return true;
}

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return NextResponse.json({ message: "Method not allowed." }, { status: 405 });
  }

  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const client = getClientIdentifier(request);
  const bucketKey = `${request.nextUrl.pathname}:${client}`;
  const rateLimit = checkRateLimit(bucketKey, API_RATE_LIMIT);

  if (!rateLimit.allowed) {
    const tooManyRequests = NextResponse.json(
      { message: "Rate limit exceeded. Please try again shortly." },
      { status: 429 }
    );

    tooManyRequests.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return withRateLimitHeaders(tooManyRequests, rateLimit);
  }

  return withRateLimitHeaders(NextResponse.next(), rateLimit);
}

export const config = {
  matcher: ["/api/:path*"]
};