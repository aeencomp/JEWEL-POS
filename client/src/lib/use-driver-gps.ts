import { useEffect, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";

/** Share driver GPS while they have active deliveries. */
export function useDriverGps(enabled: boolean) {
  const lastSent = useRef(0);

  useEffect(() => {
    if (!enabled || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSent.current < 8000) return;
        lastSent.current = now;
        void apiRequest("PATCH", "/api/driver/location", {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);
}
