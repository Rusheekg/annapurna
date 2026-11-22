'use client';

import { divIcon } from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const center = [12.935, 77.615];
const pin = divIcon({ className: 'map-marker', iconSize: [14, 14], iconAnchor: [7, 7] });

function ChooseLocation({ onChange }) {
  const map = useMap();
  useMapEvents({ click: ({ latlng }) => onChange({ lat: latlng.lat, lng: latlng.lng }) });
  return (
    <button className="secondary location-map-center" type="button" onClick={(event) => {
      event.stopPropagation();
      const point = map.getCenter();
      onChange({ lat: point.lat, lng: point.lng });
    }}>Use map centre</button>
  );
}

export default function LocationMap({ value, onChange }) {
  return (
    <MapContainer center={value ? [value.lat, value.lng] : center} zoom={14} className="neighbourhood-map location-map">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ChooseLocation onChange={onChange} />
      {value && <Marker position={[value.lat, value.lng]} icon={pin} interactive={false} />}
    </MapContainer>
  );
}
