import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type MapPoint = { lat: number; lng: number; label?: string };

const ORANGE = "#ea580c";
const SKY = "#0284c7";

function makeIcon(color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:14px">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export default function DeliveryMap({
  destination,
  driver,
  restaurant,
  height = 220,
}: {
  destination?: MapPoint | null;
  driver?: MapPoint | null;
  restaurant?: MapPoint | null;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, { zoomControl: true, attributionControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    const points: L.LatLng[] = [];
    if (destination) {
      L.marker([destination.lat, destination.lng], { icon: makeIcon(ORANGE, "🏠") }).addTo(map);
      points.push(L.latLng(destination.lat, destination.lng));
    }
    if (driver) {
      L.marker([driver.lat, driver.lng], { icon: makeIcon(SKY, "🛵") }).addTo(map);
      points.push(L.latLng(driver.lat, driver.lng));
    }
    if (restaurant) {
      L.marker([restaurant.lat, restaurant.lng], { icon: makeIcon("#16a34a", "🍽") }).addTo(map);
      points.push(L.latLng(restaurant.lat, restaurant.lng));
    }

    if (points.length === 0) {
      map.setView([33.3152, 44.3661], 11);
    } else if (points.length === 1) {
      map.setView(points[0], 14);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
    }

    setTimeout(() => map.invalidateSize(), 100);
  }, [destination?.lat, destination?.lng, driver?.lat, driver?.lng, restaurant?.lat, restaurant?.lng]);

  useEffect(() => () => {
    mapRef.current?.remove();
    mapRef.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      className="rounded-xl overflow-hidden border border-border z-0"
      style={{ height, width: "100%" }}
    />
  );
}
