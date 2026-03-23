"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type RetryImageProps = Omit<ImageProps, "src" | "alt" | "onError"> & {
  src: string;
  alt: string;
  fallbackSrc?: string;
  maxRetries?: number;
  baseDelayMs?: number;
};

function withRetryParam(src: string, attempt: number) {
  if (attempt <= 0) {
    return src;
  }

  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}retry=${attempt}`;
}

export function RetryImage({
  src,
  alt,
  fallbackSrc = "/poster-placeholder.svg",
  maxRetries = 4,
  baseDelayMs = 1000,
  ...imageProps
}: RetryImageProps) {
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [showInterimFallback, setShowInterimFallback] = useState(false);
  const [showPermanentFallback, setShowPermanentFallback] = useState(false);

  useEffect(() => {
    setAttempt(0);
    setShowInterimFallback(false);
    setShowPermanentFallback(false);

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, [src]);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const displaySrc = useMemo(() => {
    if (showPermanentFallback || showInterimFallback) {
      return fallbackSrc;
    }

    return withRetryParam(src, attempt);
  }, [attempt, fallbackSrc, showInterimFallback, showPermanentFallback, src]);

  return (
    <Image
      {...imageProps}
      src={displaySrc}
      alt={alt}
      onError={() => {
        if (displaySrc === fallbackSrc) {
          setShowPermanentFallback(true);
          return;
        }

        if (attempt >= maxRetries) {
          setShowPermanentFallback(true);
          setShowInterimFallback(false);
          return;
        }

        setShowInterimFallback(true);

        const jitterMs = Math.floor(Math.random() * 200);
        const delayMs = baseDelayMs * (2 ** attempt) + jitterMs;

        retryTimeoutRef.current = setTimeout(() => {
          setAttempt((currentAttempt) => currentAttempt + 1);
          setShowInterimFallback(false);
        }, delayMs);
      }}
    />
  );
}
