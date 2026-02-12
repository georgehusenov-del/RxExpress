import { useCallback, useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { Package, MapPin } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '8px',
};

// NYC center as default
const defaultCenter = {
  lat: 40.7128,
  lng: -74.0060,
};

// Custom marker colors for sequence
const markerColors = [
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ef4444', // red
  '#22c55e', // green
  '#3b82f6', // blue
  '#ec4899', // pink
  '#f97316', // orange
];

export const RouteMapPreview = ({ stops = [], borough }) => {
  const [map, setMap] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
  });

  // Calculate bounds to fit all markers
  const onLoad = useCallback((map) => {
    if (stops.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      stops.forEach((stop) => {
        if (stop.latitude && stop.longitude) {
          bounds.extend({ lat: stop.latitude, lng: stop.longitude });
        }
      });
      map.fitBounds(bounds, { padding: 50 });
    }
    setMap(map);
  }, [stops]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Create path coordinates for polyline
  const pathCoordinates = stops
    .filter(stop => stop.latitude && stop.longitude)
    .map(stop => ({
      lat: stop.latitude,
      lng: stop.longitude,
    }));

  // Calculate center from stops or use default
  const center = stops.length > 0 && stops[0].latitude
    ? { lat: stops[0].latitude, lng: stops[0].longitude }
    : defaultCenter;

  if (loadError) {
    return (
      <div className="bg-slate-700/50 rounded-lg p-6 text-center">
        <MapPin className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <p className="text-sm text-slate-400">Failed to load map</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="bg-slate-700/50 rounded-lg p-6 text-center animate-pulse">
        <MapPin className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <p className="text-sm text-slate-400">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden border border-slate-700">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#1e293b' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
            { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#475569' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
            { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
            { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
          ],
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }}
      >
        {/* Route Polyline */}
        {pathCoordinates.length > 1 && (
          <Polyline
            path={pathCoordinates}
            options={{
              strokeColor: '#14b8a6',
              strokeOpacity: 0.8,
              strokeWeight: 4,
              geodesic: true,
            }}
          />
        )}

        {/* Stop Markers */}
        {stops.map((stop, index) => {
          if (!stop.latitude || !stop.longitude) return null;
          
          return (
            <Marker
              key={stop.order_id}
              position={{ lat: stop.latitude, lng: stop.longitude }}
              label={{
                text: String(stop.sequence || index + 1),
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '12px',
              }}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 14,
                fillColor: markerColors[index % markerColors.length],
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              }}
              onClick={() => setSelectedStop(stop)}
            />
          );
        })}

        {/* Info Window for selected stop */}
        {selectedStop && selectedStop.latitude && (
          <InfoWindow
            position={{ lat: selectedStop.latitude, lng: selectedStop.longitude }}
            onCloseClick={() => setSelectedStop(null)}
          >
            <div className="p-2 min-w-[180px]">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-teal-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                  #{selectedStop.sequence}
                </span>
                <span className="font-mono text-sm font-medium">{selectedStop.order_number}</span>
              </div>
              <p className="text-sm font-medium text-gray-800">{selectedStop.recipient_name}</p>
              <p className="text-xs text-gray-600 mt-1">{selectedStop.address}</p>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-xs text-teal-600 font-medium">ETA: {selectedStop.estimated_arrival}</p>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
      
      {/* Map Legend */}
      <div className="bg-slate-800 px-3 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span className="text-slate-400">
            <span className="inline-block w-3 h-0.5 bg-teal-500 mr-1 align-middle"></span>
            Route Path
          </span>
          <span className="text-slate-400">
            {stops.length} stops
          </span>
        </div>
        <span className="text-slate-500">Click markers for details</span>
      </div>
    </div>
  );
};

export default RouteMapPreview;
