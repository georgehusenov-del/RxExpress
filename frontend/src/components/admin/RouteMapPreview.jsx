import { useCallback, useState, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { Package, MapPin, Truck, RefreshCw, Radio } from 'lucide-react';
import { adminAPI } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const containerStyle = {
  width: '100%',
  height: '350px',
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

// Driver status colors
const driverStatusColors = {
  available: '#22c55e',
  on_delivery: '#3b82f6',
  busy: '#f59e0b',
  offline: '#64748b',
};

export const RouteMapPreview = ({ stops = [], borough, showDriverTracking = true }) => {
  const [map, setMap] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverLocations, setDriverLocations] = useState([]);
  const [isTrackingLive, setIsTrackingLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const trackingIntervalRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
  });

  // Fetch driver locations
  const fetchDriverLocations = useCallback(async () => {
    try {
      const response = await adminAPI.getDriverLocations(true, borough);
      setDriverLocations(response.data.driver_locations || []);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to fetch driver locations:', err);
    }
  }, [borough]);

  // Initial fetch and setup live tracking
  useEffect(() => {
    if (showDriverTracking) {
      fetchDriverLocations();
    }
    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
    };
  }, [showDriverTracking, fetchDriverLocations]);

  // Toggle live tracking
  const toggleLiveTracking = useCallback(() => {
    if (isTrackingLive) {
      // Stop tracking
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
      }
      setIsTrackingLive(false);
    } else {
      // Start tracking - refresh every 10 seconds
      fetchDriverLocations();
      trackingIntervalRef.current = setInterval(fetchDriverLocations, 10000);
      setIsTrackingLive(true);
    }
  }, [isTrackingLive, fetchDriverLocations]);

  // Calculate bounds to fit all markers
  const onLoad = useCallback((map) => {
    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;

    // Add stop locations
    stops.forEach((stop) => {
      if (stop.latitude && stop.longitude) {
        bounds.extend({ lat: stop.latitude, lng: stop.longitude });
        hasPoints = true;
      }
    });

    // Add driver locations
    driverLocations.forEach((driver) => {
      if (driver.latitude && driver.longitude) {
        bounds.extend({ lat: driver.latitude, lng: driver.longitude });
        hasPoints = true;
      }
    });

    if (hasPoints) {
      map.fitBounds(bounds, { padding: 50 });
    }
    setMap(map);
  }, [stops, driverLocations]);

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

  // Calculate center from stops or drivers or use default
  const center = stops.length > 0 && stops[0].latitude
    ? { lat: stops[0].latitude, lng: stops[0].longitude }
    : driverLocations.length > 0 && driverLocations[0].latitude
    ? { lat: driverLocations[0].latitude, lng: driverLocations[0].longitude }
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
              onClick={() => {
                setSelectedStop(stop);
                setSelectedDriver(null);
              }}
            />
          );
        })}

        {/* Driver Markers */}
        {showDriverTracking && driverLocations.map((driver) => {
          if (!driver.latitude || !driver.longitude) return null;
          
          const statusColor = driverStatusColors[driver.status] || driverStatusColors.offline;
          
          return (
            <Marker
              key={driver.driver_id}
              position={{ lat: driver.latitude, lng: driver.longitude }}
              icon={{
                path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                fillColor: statusColor,
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                scale: 1.8,
                anchor: new window.google.maps.Point(12, 24),
                rotation: driver.heading || 0,
              }}
              onClick={() => {
                setSelectedDriver(driver);
                setSelectedStop(null);
              }}
              zIndex={1000}
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

        {/* Info Window for selected driver */}
        {selectedDriver && selectedDriver.latitude && (
          <InfoWindow
            position={{ lat: selectedDriver.latitude, lng: selectedDriver.longitude }}
            onCloseClick={() => setSelectedDriver(null)}
          >
            <div className="p-2 min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{selectedDriver.name}</p>
                  <p className="text-xs text-gray-500">{selectedDriver.phone || 'No phone'}</p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Status</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    selectedDriver.status === 'on_delivery' ? 'bg-blue-100 text-blue-700' :
                    selectedDriver.status === 'available' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedDriver.status?.replace('_', ' ') || 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Active Orders</span>
                  <span className="text-xs font-medium text-gray-800">{selectedDriver.assigned_orders_count || 0}</span>
                </div>
                {selectedDriver.speed > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Speed</span>
                    <span className="text-xs font-medium text-gray-800">{Math.round(selectedDriver.speed)} mph</span>
                  </div>
                )}
              </div>
              {selectedDriver.assigned_orders?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Assigned Orders:</p>
                  {selectedDriver.assigned_orders.map(order => (
                    <p key={order.id} className="text-xs font-mono text-gray-700">{order.order_number}</p>
                  ))}
                </div>
              )}
              {!selectedDriver.is_recent && (
                <div className="mt-2 pt-2 border-t border-amber-200 bg-amber-50 -mx-2 -mb-2 px-2 pb-2 rounded-b">
                  <p className="text-xs text-amber-700">⚠️ Location may be outdated</p>
                </div>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
      
      {/* Map Legend & Controls */}
      <div className="bg-slate-800 px-3 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span className="text-slate-400">
            <span className="inline-block w-3 h-0.5 bg-teal-500 mr-1 align-middle"></span>
            Route ({stops.length} stops)
          </span>
          {showDriverTracking && (
            <span className="text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1 align-middle"></span>
              Drivers ({driverLocations.length})
            </span>
          )}
        </div>
        
        {showDriverTracking && (
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <span className="text-slate-500">
                Updated {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 px-2 text-xs ${isTrackingLive ? 'text-green-400 bg-green-500/10' : 'text-slate-400'}`}
              onClick={toggleLiveTracking}
            >
              {isTrackingLive ? (
                <>
                  <Radio className="w-3 h-3 mr-1 animate-pulse" />
                  Live
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Track Live
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteMapPreview;
