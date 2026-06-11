import { useMemo } from "react";
import { useLocation } from "wouter";

export function useQueryParam(key: string): string | null {
  const [location] = useLocation();
  return useMemo(
    () => new URLSearchParams(window.location.search).get(key),
    [location, key],
  );
}
