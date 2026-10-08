import React, { useEffect, useRef } from 'react';
import type * as LeafletType from 'leaflet';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../../constants/hotspots';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type: 'pickup' | 'dest' | 'vehicle' | 'passenger';
  vehicleType?: 'Bike' | 'Rickshaw';
}

interface LeafletMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  routeCoordinates?: [number, number][];
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
  interactive?: boolean;
}

// Access Leaflet from window global loaded via index.html
function getL(): typeof LeafletType | null {
  if (typeof window !== 'undefined' && (window as any).L) {
    return (window as any).L;
  }
  return null;
}

// Custom DivIcon generator
function createCustomMarker(
  L: typeof LeafletType,
  type: MapMarker['type'],
  title: string,
  vehicleType?: 'Bike' | 'Rickshaw'
): LeafletType.DivIcon {
  let iconHtml = '';
  let iconSize: [number, number] = [36, 36];
  let iconAnchor: [number, number] = [18, 36];

  if (type === 'pickup') {
    iconHtml = `
      <div class="relative flex items-center justify-center">
        <div class="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs">
          A
        </div>
        <div class="absolute -bottom-1 w-2 h-2 bg-emerald-600 rotate-45"></div>
      </div>
    `;
  } else if (type === 'dest') {
    iconHtml = `
      <div class="relative flex items-center justify-center">
        <div class="w-8 h-8 rounded-full bg-amber-500 border-2 border-white shadow-lg flex items-center justify-center text-slate-900 font-bold text-xs">
          B
        </div>
        <div class="absolute -bottom-1 w-2 h-2 bg-amber-600 rotate-45"></div>
      </div>
    `;
  } else if (type === 'vehicle') {
    const isBike = vehicleType === 'Bike';
    iconHtml = `
      <div class="relative flex items-center justify-center animate-bounce">
        <div class="w-9 h-9 rounded-full ${isBike ? 'bg-amber-500 text-slate-900' : 'bg-emerald-600 text-white'} border-2 border-white shadow-xl flex items-center justify-center text-sm font-bold">
          ${isBike ? '🏍️' : '🛺'}
        </div>
      </div>
    `;
    iconSize = [40, 40];
    iconAnchor = [20, 20];
  } else {
    // Passenger
    iconHtml = `
      <div class="relative flex items-center justify-center">
        <div class="w-7 h-7 rounded-full bg-blue-500 border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold">
          👤
        </div>
      </div>
    `;
  }

  return L.divIcon({
    html: iconHtml,
    className: 'custom-leaflet-marker',
    iconSize,
    iconAnchor,
  });
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  center = DEFAULT_MAP_CENTER,
  zoom = DEFAULT_MAP_ZOOM,
  markers = [],
  routeCoordinates = [],
  onMapClick,
  className = 'h-64 w-full',
  interactive = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletType.Map | null>(null);
  const markersLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const routePolylineRef = useRef<LeafletType.Polyline | null>(null);

  // Initialize Map
  useEffect(() => {
    const L = getL();
    if (!L || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center,
        zoom,
        zoomControl: false,
        attributionControl: false,
        dragging: interactive,
        scrollWheelZoom: interactive,
        touchZoom: interactive,
        doubleClickZoom: interactive,
      });

      // CartoDB Voyager tiles - clean, high-contrast, modern map aesthetic
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      // Attribution
      L.control
        .attribution({ position: 'bottomright', prefix: false })
        .addAttribution('&copy; OpenStreetMap & CartoDB')
        .addTo(map);

      // Markers Layer Group
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      // Click listener
      map.on('click', (e: LeafletType.LeafletMouseEvent) => {
        if (onMapClick) {
          onMapClick(e.latlng.lat, e.latlng.lng);
        }
      });

      mapInstanceRef.current = map;

      // Invalidate size after mount to prevent grey tiles
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }

    return () => {
      // Keep instance or cleanup
    };
  }, []);

  // Update onMapClick ref handler
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.off('click');
    if (onMapClick) {
      map.on('click', (e: LeafletType.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }
  }, [onMapClick]);

  // Update Markers
  useEffect(() => {
    const L = getL();
    const markersLayer = markersLayerRef.current;
    if (!L || !markersLayer) return;

    markersLayer.clearLayers();

    markers.forEach((m) => {
      const icon = createCustomMarker(L, m.type, m.title, m.vehicleType);
      const marker = L.marker([m.lat, m.lng], { icon });
      if (m.title) {
        marker.bindPopup(`<div class="text-xs font-semibold text-slate-800">${m.title}</div>`);
      }
      marker.addTo(markersLayer);
    });
  }, [markers]);

  // Update Route Polyline
  useEffect(() => {
    const L = getL();
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    if (routeCoordinates && routeCoordinates.length > 1) {
      // Create polyline
      const polyline = L.polyline(routeCoordinates, {
        color: '#10b981',
        weight: 5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      routePolylineRef.current = polyline;

      // Fit bounds to show entire route with padding
      try {
        map.fitBounds(polyline.getBounds(), {
          padding: [30, 30],
          maxZoom: 16,
        });
      } catch (err) {
        // Safe catch
      }
    } else if (markers.length > 1) {
      // Fit to markers
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
      try {
        map.fitBounds(bounds, {
          padding: [30, 30],
          maxZoom: 16,
        });
      } catch (err) {
        // Safe catch
      }
    } else if (markers.length === 1) {
      map.panTo([markers[0].lat, markers[0].lng]);
    }
  }, [routeCoordinates, markers]);

  // Handle window / frame resize
  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-slate-800 shadow-inner ${className}`}>
      <div ref={mapContainerRef} className="h-full w-full z-0" />
    </div>
  );
};
