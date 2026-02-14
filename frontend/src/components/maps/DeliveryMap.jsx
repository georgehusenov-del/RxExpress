import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue with Leaflet + Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons
const createNumberedIcon = (number, color = '#0d9488') => {
  return L.divIcon({
    className: 'custom-numbered-marker',
    html: `<div style="
      background: ${color};
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 12px;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    ">${number}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

const createDefaultIcon = (color = '#0d9488') => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: ${color};
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
};

// Component to fit map bounds to markers
const FitBounds = ({ positions }) => {
  const map = useMap();
  
  useEffect(() => {
    if (positions && positions.length > 0) {
      const validPositions = positions.filter(p => p && p[0] && p[1]);
      if (validPositions.length > 0) {
        const bounds = L.latLngBounds(validPositions);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [positions, map]);
  
  return null;
};

/**
 * DeliveryMap Component
 * 
 * @param {Array} markers - Array of marker objects with: { lat, lng, label, popup, stopNumber, color }
 * @param {boolean} showRoute - Whether to draw a polyline connecting markers
 * @param {string} routeColor - Color of the route polyline
 * @param {string} height - CSS height of the map container
 */
export const DeliveryMap = ({ 
  markers = [], 
  showRoute = false, 
  routeColor = '#0d9488',
  height = '400px',
  className = ''
}) => {
  const defaultCenter = [40.7128, -74.0060]; // NYC
  
  // Filter out markers without valid coordinates
  const validMarkers = markers.filter(m => m && m.lat && m.lng && !isNaN(m.lat) && !isNaN(m.lng));
  
  // Calculate center from markers or use default
  const center = validMarkers.length > 0 
    ? [
        validMarkers.reduce((sum, m) => sum + m.lat, 0) / validMarkers.length,
        validMarkers.reduce((sum, m) => sum + m.lng, 0) / validMarkers.length
      ]
    : defaultCenter;
  
  // Create positions array for bounds fitting and route line
  const positions = validMarkers.map(m => [m.lat, m.lng]);
  
  // Sort markers by stopNumber for route display
  const sortedMarkers = [...validMarkers].sort((a, b) => 
    (a.stopNumber || 999) - (b.stopNumber || 999)
  );
  const routePositions = sortedMarkers.map(m => [m.lat, m.lng]);
  
  if (validMarkers.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center bg-slate-800 rounded-lg border border-slate-700 ${className}`}
        style={{ height }}
      >
        <p className="text-slate-400">No delivery locations to display</p>
      </div>
    );
  }
  
  return (
    <div className={`rounded-lg overflow-hidden border border-slate-700 ${className}`} style={{ height }}>
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <FitBounds positions={positions} />
        
        {/* Route polyline */}
        {showRoute && routePositions.length > 1 && (
          <Polyline 
            positions={routePositions} 
            color={routeColor}
            weight={3}
            opacity={0.7}
            dashArray="10, 10"
          />
        )}
        
        {/* Markers */}
        {validMarkers.map((marker, index) => (
          <Marker
            key={marker.id || index}
            position={[marker.lat, marker.lng]}
            icon={marker.stopNumber 
              ? createNumberedIcon(marker.stopNumber, marker.color || routeColor)
              : createDefaultIcon(marker.color || routeColor)
            }
          >
            {marker.popup && (
              <Popup>
                <div className="text-sm">
                  {marker.stopNumber && (
                    <div className="font-bold text-teal-600 mb-1">Stop #{marker.stopNumber}</div>
                  )}
                  {marker.label && <div className="font-semibold">{marker.label}</div>}
                  <div className="text-gray-600">{marker.popup}</div>
                </div>
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

/**
 * Build Google Maps navigation URL for full route
 * @param {Array} stops - Array of stop objects with address info
 * @returns {string} Google Maps URL
 */
export const buildGoogleMapsRouteUrl = (stops) => {
  if (!stops || stops.length === 0) return null;
  
  // Sort stops by sequence/stopNumber
  const sortedStops = [...stops].sort((a, b) => 
    (a.sequence || a.stopNumber || 999) - (b.sequence || b.stopNumber || 999)
  );
  
  // Build addresses from stops
  const addresses = sortedStops.map(stop => {
    const addr = stop.delivery_address || stop.address;
    if (!addr) return null;
    return `${addr.street || addr.addressLineOne || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.postal_code || addr.zip || ''}`;
  }).filter(Boolean);
  
  if (addresses.length === 0) return null;
  
  if (addresses.length === 1) {
    // Single destination
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addresses[0])}`;
  }
  
  // Multiple stops: origin -> waypoints -> destination
  const origin = addresses[0];
  const destination = addresses[addresses.length - 1];
  const waypoints = addresses.slice(1, -1);
  
  let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
  
  if (waypoints.length > 0) {
    url += `&waypoints=${waypoints.map(w => encodeURIComponent(w)).join('|')}`;
  }
  
  return url;
};

/**
 * Build Google Maps navigation URL for a single address
 * @param {Object} address - Address object with street, city, state, postal_code
 * @returns {string} Google Maps URL
 */
export const buildSingleAddressUrl = (address) => {
  if (!address) return null;
  const fullAddress = `${address.street || ''}, ${address.city || ''}, ${address.state || ''} ${address.postal_code || ''}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;
};

export default DeliveryMap;
