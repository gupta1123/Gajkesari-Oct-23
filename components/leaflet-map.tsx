"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { FC, memo, useEffect, useState } from 'react';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as unknown as Record<string, never>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Color palette for different employees
const colorPalette = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#a855f7', // purple
  '#e11d48', // rose
  '#0ea5e9', // sky
  '#22c55e', // emerald
  '#facc15', // yellow
];

// Function to get color for an employee based on their ID
const getEmployeeColor = (employeeId: number | string): string => {
  const id = typeof employeeId === 'string' ? parseInt(employeeId) : employeeId;
  return colorPalette[id % colorPalette.length];
};

// Custom marker icons for different types with employee-specific colors
const createCustomIcon = (color: string, markerType: string) => {
  // Different shapes for different marker types
  const shape = markerType === 'house' ? 'square' : 'circle';
  // Mobile-friendly sizes - larger for touch interaction
  const size = markerType === 'house' ? '36px' : '40px';
  
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: ${size};
      height: ${size};
      border-radius: ${shape === 'square' ? '8px' : '50%'};
      border: 3px solid white;
      box-shadow: 0 4px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      font-size: 16px;
      cursor: pointer;
      touch-action: manipulation;
    ">
      ${markerType === 'house' ? '🏠' : markerType === 'visit' ? '📍' : '👤'}
    </div>`,
    iconSize: markerType === 'house' ? [36, 36] : [40, 40],
    iconAnchor: markerType === 'house' ? [18, 18] : [20, 20],
  });
};

interface MapMarker {
  id: number | string;
  name?: string;
  lat: number;
  lng: number;
  subtitle?: string;
  type?: "live" | "house" | "visit";
  tooltipLines?: string[];
  employeeId?: number; // Employee ID for color assignment
}

interface LeafletMapProps {
  center: [number, number];
  zoom: number;
  highlightedEmployee: Record<string, unknown> | null;
  markers?: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
}

const getHighlightedId = (employee: Record<string, unknown> | null) => {
  if (!employee) return null;
  if (employee.listId) return employee.listId;
  if (employee.id) return employee.id;
  if (employee.location) return employee.location;
  return String(employee);
};

// Helper component to imperatively update map view when props change
const MapController: FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    try {
      map.flyTo(center, zoom, { duration: 0.8 });
    } catch {
      // no-op
    }
  }, [center[0], center[1], zoom]);
  return null;
};

const LeafletMapComponent: FC<LeafletMapProps> = ({ center, zoom, highlightedEmployee, markers = [], onMarkerClick }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="h-full w-full bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      style={{ height: '100%', width: '100%' }}
      className="rounded-xl"
    >
      {/* Keep map view in sync with incoming props */}
      <MapController center={center} zoom={zoom} />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />
      {/* Dynamic employee markers */}
      {markers.map(m => {
        const markerType = m.type || 'live';
        const employeeId = m.employeeId || m.id;
        const employeeColor = getEmployeeColor(employeeId);
        const icon = createCustomIcon(employeeColor, markerType);
        
        return (
          <Marker 
            key={String(m.id)} 
            position={[m.lat, m.lng]}
            icon={icon}
            eventHandlers={onMarkerClick ? { click: () => onMarkerClick(m) } : undefined}
          >
            <Popup>
              <div className="min-w-[280px] max-w-[320px] sm:min-w-[300px] sm:max-w-[350px]">
                {markerType === 'visit' ? (
                  // Visit Card Layout - Mobile Optimized
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: employeeColor }}
                      />
                      <span className="text-sm sm:text-base font-semibold text-gray-900">
                        {m.name || 'Visit'}
                      </span>
                    </div>
                    
                    {m.tooltipLines && m.tooltipLines.length > 0 && (
                      <div className="space-y-2">
                        {m.tooltipLines.map((line: string, index: number) => {
                          const [label, value] = line.split(': ');
                          return (
                            <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-2">
                              <span className="text-xs sm:text-sm font-medium text-gray-600 sm:min-w-[80px]">
                                {label}:
                              </span>
                              <span className="text-xs sm:text-sm text-gray-800 sm:text-right break-words">
                                {value}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span 
                          className="inline-flex items-center rounded-full px-2 py-1 text-xs sm:text-sm font-medium text-white"
                          style={{ backgroundColor: employeeColor }}
                        >
                          Visit Location
                        </span>
                        {m.subtitle && (
                          <span className="text-xs sm:text-sm text-gray-500 break-words">
                            {m.subtitle}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Default Layout for Live/House locations - Mobile Optimized
                  <div className="space-y-2">
                    <div className="text-sm sm:text-base font-semibold">{m.name || 'Employee'}</div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span 
                        className="inline-flex items-center rounded-full px-2 py-1 text-xs sm:text-sm font-medium text-white"
                        style={{ backgroundColor: employeeColor }}
                      >
                        {markerType === 'live' ? 'Live location' :
                         markerType === 'house' ? 'Home location' :
                         'Location'}
                      </span>
                      {m.subtitle && (
                        <span className="text-xs sm:text-sm text-muted-foreground break-words">
                          {markerType === 'live' ? 'Updated: ' : ''}{m.subtitle}
                        </span>
                      )}
                    </div>
                    {m.tooltipLines && m.tooltipLines.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {m.tooltipLines.map((line: string, index: number) => (
                          <div key={index} className="text-xs sm:text-sm text-muted-foreground break-words">
                            {line}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

const LeafletMap = memo(
  LeafletMapComponent,
  (prev, next) =>
    prev.zoom === next.zoom &&
    prev.center[0] === next.center[0] &&
    prev.center[1] === next.center[1] &&
    getHighlightedId(prev.highlightedEmployee) ===
      getHighlightedId(next.highlightedEmployee)
);

LeafletMap.displayName = 'LeafletMap';

export default LeafletMap;
