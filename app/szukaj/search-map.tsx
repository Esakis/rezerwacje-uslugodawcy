"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapMarker {
  slug: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

// Mapa wyników (Leaflet + OpenStreetMap). Leaflet dotyka window przy imporcie,
// więc ładujemy go dynamicznie w useEffect — bez SSR.
export function SearchMap({ markers }: { markers: MapMarker[] }) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !elRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(elRef.current, { scrollWheelZoom: false }).setView(
          [52.1, 19.4], // środek Polski, dopóki nie ma wyników
          6
        );
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(mapRef.current);
        layerRef.current = L.layerGroup().addTo(mapRef.current);
      }

      const layer = layerRef.current!;
      layer.clearLayers();

      // Własna pinezka (domyślne ikony Leafleta nie działają z bundlerem Next.js).
      const icon = L.divIcon({
        className: "",
        html: `<div class="flex h-8 w-8 items-center justify-center rounded-full rounded-br-none bg-brand-gradient text-white shadow-glow ring-2 ring-white" style="transform: rotate(45deg)"><span style="transform: rotate(-45deg)" class="text-xs font-bold">B</span></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -30],
      });

      for (const m of markers) {
        L.marker([m.lat, m.lng], { icon })
          .bindPopup(
            `<div style="min-width:160px">
              <div style="font-weight:600">${escapeHtml(m.name)}</div>
              <div style="font-size:12px;color:#64748b">${escapeHtml(m.address)}</div>
              <a href="/${encodeURIComponent(m.slug)}" style="display:inline-block;margin-top:6px;font-weight:600;color:#7c3aed">Zarezerwuj →</a>
            </div>`
          )
          .addTo(layer);
      }

      if (markers.length === 1) {
        mapRef.current.setView([markers[0].lat, markers[0].lng], 14);
      } else if (markers.length > 1) {
        mapRef.current.fitBounds(
          L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number])),
          { padding: [40, 40] }
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [markers]);

  // Sprzątanie instancji mapy przy odmontowaniu.
  useEffect(
    () => () => {
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    },
    []
  );

  return <div ref={elRef} className="h-full w-full" />;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
