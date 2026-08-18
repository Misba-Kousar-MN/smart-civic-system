import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { parseCoordinates } from '../utils/locationUtils';
import { Navigation, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const createCustomIcon = (color = '#1769AA') => {
  const svgHtml = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32" style="filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.3));">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>`;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-leaflet-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

const STATUS_COLORS = {
  OPEN: '#2563EB',
  IN_PROGRESS: '#D97706',
  ESCALATED: '#DC2626',
  RESOLVED: '#16A34A',
  CLOSED: '#64748B'
};

const MapRecenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center?.lat && center?.lng) {
      map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
};

const LocationSelectHandler = ({ onSelect }) => {
  useMapEvents({
    click(e) {
      if (onSelect) {
        onSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    }
  });
  return null;
};

const InteractiveMap = ({
  center,
  zoom = 14,
  height = '320px',
  interactive = false,
  selectedLocation,
  onLocationSelect,
  markers = [],
  showCurrentLocationButton = false,
  className = ''
}) => {
  const currentCenter = parseCoordinates(selectedLocation || center);

  const handleMarkerDrag = (e) => {
    const latLng = e.target.getLatLng();
    if (onLocationSelect) {
      onLocationSelect({ lat: latLng.lat, lng: latLng.lng });
    }
  };

  const handleGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (onLocationSelect) onLocationSelect(coords);
        },
        (err) => {
          console.warn('[MAP] Geolocation error:', err.message);
        }
      );
    }
  };

  return (
    <div className={`map-wrapper relative overflow-hidden rounded-2xl border border-slate-200 shadow-2xs ${className}`} style={{ height }}>
      {showCurrentLocationButton && (
        <button
          type="button"
          className="absolute top-3 right-3 z-[400] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-xs border border-slate-200 shadow-md text-xs font-bold text-[#1769AA] hover:bg-slate-50 transition-all"
          onClick={handleGeolocation}
          title="Use Current Location"
        >
          <Navigation className="w-3.5 h-3.5" /> Locate Me
        </button>
      )}

      <MapContainer
        center={[currentCenter.lat, currentCenter.lng]}
        zoom={zoom}
        style={{ width: '100%', height: '100%', background: '#F8FAFC' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRecenter center={currentCenter} />

        {interactive && (
          <>
            <LocationSelectHandler onSelect={onLocationSelect} />
            <Marker
              position={[currentCenter.lat, currentCenter.lng]}
              icon={createCustomIcon('#1769AA')}
              draggable={true}
              eventHandlers={{ dragend: handleMarkerDrag }}
            >
              <Popup>
                <div className="text-xs space-y-1 font-sans p-1 text-slate-800">
                  <div className="font-bold text-slate-900">Selected Location</div>
                  <div className="text-slate-600 font-mono text-[11px]">
                    {currentCenter.lat.toFixed(6)}, {currentCenter.lng.toFixed(6)}
                  </div>
                  <div className="text-[10px] text-slate-400">Drag marker to adjust location</div>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {!interactive && markers.length > 0 && (
          markers.map((item) => {
            const pos = parseCoordinates(item.position || item.location);
            const pinColor = STATUS_COLORS[item.status] || '#1769AA';
            return (
              <Marker
                key={item.id}
                position={[pos.lat, pos.lng]}
                icon={createCustomIcon(pinColor)}
              >
                <Popup>
                  <div className="text-xs space-y-1.5 font-sans min-w-44 text-slate-800 p-1">
                    <div className="font-bold text-sm text-slate-900">{item.title || item.category || 'Civic Incident'}</div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {item.status || 'OPEN'}
                      </span>
                      {item.priority && (
                        <span className="font-bold text-[10px] uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                          {item.priority}
                        </span>
                      )}
                    </div>
                    {item.address && <p className="text-[11px] text-slate-500 truncate">{item.address}</p>}
                    {item.detailsUrl && (
                      <Link
                        to={item.detailsUrl}
                        className="text-[#1769AA] hover:underline font-bold text-xs flex items-center gap-1 mt-2"
                      >
                        View Details <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })
        )}

        {!interactive && markers.length === 0 && (
          <Marker
            position={[currentCenter.lat, currentCenter.lng]}
            icon={createCustomIcon('#1769AA')}
          >
            <Popup>
              <div className="text-xs font-mono text-slate-800 p-1">
                Location: {currentCenter.lat.toFixed(6)}, {currentCenter.lng.toFixed(6)}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default InteractiveMap;
