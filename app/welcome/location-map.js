'use client';

import { divIcon } from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { LocateFixed, Search } from 'lucide-react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Pending } from '@/components/request-feedback';
import { readJson } from '@/lib/client-requests';
import 'leaflet/dist/leaflet.css';

const center = [12.935, 77.615];
const pin = divIcon({ className: 'map-marker', iconSize: [14, 14], iconAnchor: [7, 7] });

// Lives inside the map so searches and "my location" can fly it. `target` changes only on search or geolocation.
function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 16));
  }, [map, target]);
  return null;
}

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

// Map picker with area search (Enter or the Search button, never as-you-type) and browser geolocation.
export default function LocationMap({ value, onChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [message, setMessage] = useState('');
  const [searching, setSearching] = useState(false);
  const [target, setTarget] = useState(null);
  const busy = useRef(false);

  function choose(place) {
    const point = { lat: place.lat, lng: place.lng };
    onChange(point);
    setTarget({ ...point });
  }

  async function search() {
    const text = query.trim();
    if (busy.current) return;
    if (text.length < 3) {
      setMessage('Enter at least 3 characters to search.');
      setResults(null);
      return;
    }
    busy.current = true;
    setSearching(true);
    setMessage('');
    try {
      const data = await readJson(`/api/geocode?q=${encodeURIComponent(text)}`);
      setResults(data.results);
      if (!data.results.length) setMessage('No places found. Try another name, or drag the pin.');
    } catch (failure) {
      setResults(null);
      setMessage(failure.code === 'RATE_LIMITED' || failure.code === 'INVALID_INPUT' || failure.code === 'GEOCODE_UNAVAILABLE'
        ? failure.message : 'Search isn’t working right now. Drag the pin instead.');
    } finally {
      busy.current = false;
      setSearching(false);
    }
  }

  function locate() {
    if (!navigator.geolocation) {
      setMessage('Your browser can’t share its location. Search or drag the pin instead.');
      return;
    }
    setMessage('Finding your location…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setMessage('');
        setResults(null);
        choose({ lat: coords.latitude, lng: coords.longitude });
      },
      (failure) => setMessage(failure.code === 1
        ? 'Location access is blocked. Allow it in your browser, or search for your area instead.'
        : 'We couldn’t find your location. Search for your area or drag the pin instead.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="grid gap-2">
      <div className="location-search" role="search">
        <label htmlFor="location-search-input" className="sr-only">Search area, street or landmark</label>
        <input id="location-search-input" value={query} placeholder="Search area, street or landmark" maxLength={100}
          autoComplete="off" onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              search();
            }
          }} />
        <button type="button" className="secondary" onClick={search} disabled={searching}>
          {searching ? <Pending>Searching…</Pending> : <><Search size={16} strokeWidth={1.5} aria-hidden="true" />Search</>}
        </button>
        <button type="button" className="secondary" onClick={locate}>
          <LocateFixed size={16} strokeWidth={1.5} aria-hidden="true" />Use my current location
        </button>
      </div>
      {message && <p className="muted text-sm" role="status">{message}</p>}
      {results?.length > 0 && (
        <ul className="location-results" aria-label="Search results">
          {results.map((place, index) => (
            <li key={`${place.lat},${place.lng},${index}`}>
              <button type="button" onClick={() => { choose(place); setResults(null); setMessage(''); }}>{place.name}</button>
            </li>
          ))}
        </ul>
      )}
      <MapContainer center={value ? [value.lat, value.lng] : center} zoom={14} className="neighbourhood-map location-map">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ChooseLocation onChange={onChange} />
        <FlyTo target={target} />
        {value && (
          <Marker position={[value.lat, value.lng]} icon={pin} draggable
            eventHandlers={{ dragend: (event) => { const point = event.target.getLatLng(); onChange({ lat: point.lat, lng: point.lng }); } }} />
        )}
      </MapContainer>
    </div>
  );
}
