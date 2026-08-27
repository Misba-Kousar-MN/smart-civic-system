import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_COORDINATES } from '../utils/locationUtils';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

const InteractiveMap = ({
  height = '320px',
  center = DEFAULT_COORDINATES,
  zoom = 14,
  interactive = true,
  selectedLocation = null,
  onLocationSelect = null,
  markers = []
}) => {
  const mapRef = useRef(null);
  const leafletInstance = useRef(null);
  const selectedMarkerRef = useRef(null);
  const markersGroupRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletInstance.current) {
      const map = L.map(mapRef.current, {
        center: [center.lat, center.lng],
        zoom: zoom,
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      leafletInstance.current = map;
      markersGroupRef.current = L.layerGroup().addTo(map);

      if (interactive && onLocationSelect) {
        map.on('click', (e) => {
          const { lat, lng } = e.latlng;
          onLocationSelect({ lat, lng });
        });
      }
    }

    return () => {
      if (leafletInstance.current) {
        leafletInstance.current.remove();
        leafletInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!leafletInstance.current) return;
    leafletInstance.current.setView([center.lat, center.lng], zoom);
  }, [center.lat, center.lng, zoom]);

  useEffect(() => {
    if (!leafletInstance.current) return;

    if (selectedLocation) {
      if (selectedMarkerRef.current) {
        selectedMarkerRef.current.setLatLng([selectedLocation.lat, selectedLocation.lng]);
      } else {
        selectedMarkerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng]).addTo(leafletInstance.current);
      }
    }
  }, [selectedLocation]);

  useEffect(() => {
    if (!leafletInstance.current || !markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();

    markers.forEach((m) => {
      if (!m.position) return;
      const marker = L.marker([m.position.lat, m.position.lng]);
      
      let popupContent = `<div style="padding:4px; max-width:200px;">
        <strong style="font-size:12px; color:#0F172A;">${m.title}</strong><br/>
        <span style="font-size:10px; color:#475569;">${m.address || ''}</span><br/>
        ${m.status ? `<span style="font-size:10px; font-weight:bold; color:#0B63E5;">${m.status}</span>` : ''}
      </div>`;
      
      marker.bindPopup(popupContent);
      markersGroupRef.current.addLayer(marker);
    });
  }, [markers]);

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%' }}
      className="rounded-xl border border-slate-200 shadow-2xs overflow-hidden"
    />
  );
};

export default InteractiveMap;
