"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Home, UserRound } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./location-map.css";
import { groupMapMarkers, type EmployeeMapMarker } from "@/lib/employee-map";
import { INDIA_MAP_BOUNDS } from "@/lib/map-region";

export interface LeafletMapProps {
  center: [number, number];
  zoom: number;
  highlightedEmployee: Record<string, unknown> | null;
  markers?: EmployeeMapMarker[];
  onMarkerClick?: (marker: EmployeeMapMarker) => void;
  fitMarkers?: boolean;
  viewKey?: string;
  overviewZoom?: number;
  overviewMarkerId?: number | null;
}

const homeSvg = renderToStaticMarkup(<Home size={16} aria-hidden />);
const employeeSvg = renderToStaticMarkup(<UserRound size={16} aria-hidden />);

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));

const markerLabel = (marker: EmployeeMapMarker) =>
  marker.type === "visit"
    ? `Visit ${marker.order ?? ""}: ${marker.name || "Customer"}`
    : marker.type === "house"
      ? marker.name || "Home location"
      : `${marker.name || "Employee"}: last-known location`;

const isInsideIndiaViewport = (marker: EmployeeMapMarker) => {
  const [[south, west], [north, east]] = INDIA_MAP_BOUNDS;
  return marker.lat >= south && marker.lat <= north && marker.lng >= west && marker.lng <= east;
};

function pointIcon(marker: EmployeeMapMarker) {
  const type = marker.type || "live";
  const content = type === "house" ? homeSvg : type === "visit" ? escapeHtml(String(marker.order ?? "V")) : employeeSvg;
  return L.divIcon({
    className: "location-marker",
    html: `<span class="location-marker-face location-marker-${type}" aria-label="${escapeHtml(markerLabel(marker))}">${content}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
  });
}

function LocationDetails({ marker }: { marker: EmployeeMapMarker }) {
  return (
    <div className="location-popup-content">
      <h3>{marker.name || "Employee location"}</h3>
      <p className="location-popup-kind">
        {marker.type === "house"
          ? "Home location"
          : marker.type === "visit"
            ? `Visit ${marker.order ?? ""} · ${marker.subtitle || ""}`
            : "Last-known location"}
      </p>
      {marker.type !== "visit" && marker.subtitle && (
        <p>{marker.type === "live" ? "Updated: " : ""}{marker.subtitle}</p>
      )}
      {marker.tooltipLines?.map((line, index) => {
        const separator = line.indexOf(": ");
        return (
          <div className="location-popup-row" key={index}>
            <span>{separator < 0 ? "" : line.slice(0, separator)}</span>
            <strong>{separator < 0 ? line : line.slice(separator + 2)}</strong>
          </div>
        );
      })}
      <div className="location-popup-coordinate">
        Recorded coordinates: {Number(marker.lat).toFixed(5)}, {Number(marker.lng).toFixed(5)}
      </div>
    </div>
  );
}

function MapViewport({
  markers,
  center,
  zoom,
  fitMarkers,
  viewKey,
  overviewZoom,
  overviewMarkerId,
}: {
  markers: EmployeeMapMarker[];
  center: [number, number];
  zoom: number;
  fitMarkers?: boolean;
  viewKey?: string;
  overviewZoom?: number;
  overviewMarkerId?: number | null;
}) {
  const map = useMap();
  const geometry = markers.map((marker) => `${marker.id}:${marker.lat}:${marker.lng}`).sort().join("|");

  useEffect(() => {
    const fit = () => {
      if (!map.getContainer().isConnected || !map.getPane("mapPane")) return;
      map.invalidateSize({ pan: false });
      map.setMinZoom(0);
      map.setMinZoom(map.getBoundsZoom(INDIA_MAP_BOUNDS));
      if (overviewZoom != null && markers.length) {
        // A multi-state fit hides local streets. Start at the same city-detail
        // scale as German Steel without replacing Gajkesari's real locations.
        const focus = markers.find((marker) => Number(marker.employeeId ?? marker.id) === overviewMarkerId) ?? markers[0];
        map.setView([focus.lat, focus.lng], overviewZoom, { animate: false });
      } else if (fitMarkers && markers.length) {
        map.fitBounds(
          L.latLngBounds(markers.map((marker) => [marker.lat, marker.lng] as [number, number])),
          { padding: [48, 48], maxZoom: 15, animate: false },
        );
      } else {
        map.fitBounds(INDIA_MAP_BOUNDS, { animate: false });
      }
    };
    fit();
    const observer = new ResizeObserver(() => {
      if (map.getContainer().clientWidth > 0) fit();
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map, geometry, viewKey, fitMarkers, center, zoom, overviewZoom, overviewMarkerId]);

  return null;
}

function LocationLayers({
  markers,
  focused,
  onMarkerClick,
}: {
  markers: EmployeeMapMarker[];
  focused: boolean;
  onMarkerClick?: (marker: EmployeeMapMarker) => void;
}) {
  const [revision, setRevision] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const map = useMapEvents({
    zoomend: () => {
      setRevision((value) => value + 1);
      setExpanded(null);
    },
    moveend: () => setRevision((value) => value + 1),
    resize: () => setRevision((value) => value + 1),
  });

  const groups = useMemo(
    () =>
      groupMapMarkers(
        markers.map((marker) => {
          const point = map.latLngToLayerPoint([marker.lat, marker.lng]);
          return { marker, x: point.x, y: point.y };
        }),
      ),
    [markers, map, revision],
  );

  return (
    <>
      {groups.map((group) => {
        const groupKey = group.map((point) => `${point.marker.type || "live"}-${point.marker.id}`).sort().join("|");
        const centerPoint = L.point(
          group.reduce((sum, point) => sum + point.x, 0) / group.length,
          group.reduce((sum, point) => sum + point.y, 0) / group.length,
        );
        const groupPosition = map.layerPointToLatLng(centerPoint);
        const spread = group.length > 1 && (focused || expanded === groupKey);

        if (group.length > 1 && !spread) {
          const label = `${group.length} nearby employee locations. Click to expand.`;
          return (
            <Marker
              key={groupKey}
              position={groupPosition}
              title={label}
              alt={label}
              icon={L.divIcon({
                className: "location-marker",
                html: `<span class="location-cluster">${group.length}<small>people</small></span>`,
                iconSize: [46, 46],
                iconAnchor: [23, 23],
              })}
              eventHandlers={{
                click: () => {
                  const coordinates = new Set(group.map((point) => `${point.marker.lat},${point.marker.lng}`));
                  if (coordinates.size > 1 && map.getZoom() < 17) {
                    map.fitBounds(
                      L.latLngBounds(group.map((point) => [point.marker.lat, point.marker.lng] as [number, number])),
                      { padding: [70, 70], maxZoom: 17, animate: false },
                    );
                  }
                  setExpanded(groupKey);
                },
              }}
            />
          );
        }

        return (
          <Fragment key={groupKey}>
            {group.map(({ marker }, index) => {
              const ring = Math.floor(index / 10);
              const countInRing = Math.min(10, group.length - ring * 10);
              const angle = ((index % 10) / countInRing) * Math.PI * 2 - Math.PI / 2;
              const radius = 48 + ring * 42;
              const display = spread
                ? map.layerPointToLatLng(centerPoint.add(L.point(Math.cos(angle) * radius, Math.sin(angle) * radius)))
                : L.latLng(marker.lat, marker.lng);
              const label = markerLabel(marker);

              return (
                <Fragment key={`${marker.type || "live"}-${marker.id}`}>
                  {spread && (
                    <Polyline
                      positions={[
                        [marker.lat, marker.lng],
                        [display.lat, display.lng],
                      ]}
                      interactive={false}
                      pathOptions={{ color: "#64748b", weight: 1.5, opacity: 0.65, dashArray: "3 3" }}
                    />
                  )}
                  <Marker
                    position={display}
                    icon={pointIcon(marker)}
                    title={label}
                    alt={label}
                    eventHandlers={onMarkerClick ? { click: () => onMarkerClick(marker) } : undefined}
                  >
                    <Popup minWidth={180} maxWidth={280} className="employee-location-popup">
                      <LocationDetails marker={marker} />
                    </Popup>
                  </Marker>
                </Fragment>
              );
            })}
          </Fragment>
        );
      })}
    </>
  );
}

export default function LeafletMap({
  center,
  zoom,
  highlightedEmployee,
  markers = [],
  onMarkerClick,
  fitMarkers = false,
  viewKey,
  overviewZoom,
  overviewMarkerId,
}: LeafletMapProps) {
  const [tileError, setTileError] = useState(false);
  const [tileRetry, setTileRetry] = useState(0);

  const validMarkers = useMemo(
    () =>
      markers
        .filter(
          (marker) =>
            !String(marker.id).startsWith("no-location-") &&
            marker.lat != null &&
            marker.lng != null &&
            !Number.isNaN(Number(marker.lat)) &&
            !Number.isNaN(Number(marker.lng)) &&
            !(Number(marker.lat) === 0 && Number(marker.lng) === 0),
        )
        .map((marker) => ({ ...marker, lat: Number(marker.lat), lng: Number(marker.lng) }))
        .filter(isInsideIndiaViewport),
    [markers],
  );

  return (
    <div className="employee-location-map relative h-full w-full">
      <MapContainer
        bounds={INDIA_MAP_BOUNDS}
        maxBounds={INDIA_MAP_BOUNDS}
        maxBoundsViscosity={1}
        zoomSnap={0.1}
        zoomDelta={0.5}
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        className="german-steel-map relative isolate z-0 rounded-xl"
        scrollWheelZoom
      >
        <MapViewport markers={validMarkers} center={center} zoom={zoom} fitMarkers={fitMarkers} viewKey={viewKey} overviewZoom={overviewZoom} overviewMarkerId={overviewMarkerId} />
        <TileLayer
          key={tileRetry}
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          referrerPolicy="strict-origin-when-cross-origin"
          maxNativeZoom={19}
          maxZoom={20}
          noWrap
          eventHandlers={{ tileerror: () => setTileError(true) }}
        />
        <LocationLayers markers={validMarkers} focused={highlightedEmployee != null} onMarkerClick={onMarkerClick} />
      </MapContainer>
      {tileError && (
        <div
          role="alert"
          className="absolute bottom-8 left-2 right-2 z-[600] flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-xs text-foreground shadow-sm"
        >
          Some map tiles could not load.
          <button
            type="button"
            className="font-medium underline"
            onClick={() => {
              setTileError(false);
              setTileRetry((value) => value + 1);
            }}
          >
            Retry map
          </button>
        </div>
      )}
    </div>
  );
}
