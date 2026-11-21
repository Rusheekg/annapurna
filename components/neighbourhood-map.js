'use client';

import { useEffect, useState } from 'react';
import { divIcon } from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { readMapData } from '@/app/feed-data';
import { handlingGuidance, minutesUntil, safetyNotice, storageLabels } from '@/lib/listings';

const legend = {
  donor: 'Donor',
  receiver: 'Receiver',
  listing: 'Donor with open listings',
};

const icons = Object.fromEntries(Object.keys(legend).map((kind) => [kind, divIcon({
  className: `map-marker map-marker-${kind}`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -9],
})]));
const position = ({ lat, lng }) => [lat, lng];

export default function NeighbourhoodMap({ volunteerId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [routeId, setRouteId] = useState('');

  useEffect(() => {
    let active = true;
    let loading = false;
    async function refresh() {
      if (loading) return;
      loading = true;
      try {
        const result = await readMapData(volunteerId);
        if (active && result) setData(result);
        if (active) setError(!result);
      } catch {
        if (active) setError(true);
      } finally {
        loading = false;
      }
    }
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [volunteerId]);

  const route = data?.routes.find(({ id }) => String(id) === routeId) ?? data?.routes[0];
  const donor = data?.donors.find(({ id }) => id === route?.donor_id);
  const receiver = data?.receivers.find(({ id }) => id === route?.receiver_id);

  return (
    <section className="panel map-panel" aria-labelledby="map-title">
      <h2 id="map-title">Neighbourhood map</h2>
      {error && <p role="alert" className="error mb-2">Could not refresh the neighbourhood map.</p>}
      {!data && !error && <p role="status" className="muted">Loading map…</p>}
      {data && (
        <>
          <ul className="map-legend" aria-label="Map legend">
            {Object.entries(legend).map(([kind, label]) => (
              <li key={kind}><span className={`map-marker map-marker-${kind}`} aria-hidden="true" />{label}</li>
            ))}
            {route && <li><span className="map-route-key" aria-hidden="true" />Pickup route</li>}
          </ul>
          {route && (
            <label className="map-route-picker">Pickup route
              <select value={String(route.id)} onChange={(event) => setRouteId(event.target.value)}>
                {data.routes.map((job) => (
                  <option key={job.id} value={job.id}>{job.food_items} · {job.donor_name} to {job.receiver_name}</option>
                ))}
              </select>
            </label>
          )}
          <MapContainer className="neighbourhood-map"
            center={[12.935, 77.615]} zoom={13}
            bounds={data.donors.length + data.receivers.length > 1
              ? [...data.donors, ...data.receivers].map(position)
              : undefined}
            boundsOptions={{ padding: [25, 25], maxZoom: 15 }}
            scrollWheelZoom={false}>
            <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              maxZoom={19} />
            {data.donors.map((person) => {
              const listings = data.listings.filter(({ donor_id }) => donor_id === person.id);
              const kind = listings.length ? 'listing' : 'donor';
              return (
                <Marker key={`donor-${person.id}`} icon={icons[kind]} position={position(person)}
                  title={person.name} alt={person.name}>
                  <Popup>
                    <strong>{person.name}</strong>
                    {listings.length ? listings.map((listing) => (
                      <div key={listing.id} className="map-listing">
                        <strong>{listing.food_items}</strong>
                        <p>{listing.portions} portions · {listing.veg ? 'Veg' : 'Non-veg'} · {storageLabels[listing.storage]}</p>
                        <p>Allergens: {listing.allergens.join(', ') || 'None listed'}</p>
                        <p>{pickupCountdown(listing.pickup_by)}</p>
                        <p>{handlingGuidance(listing.storage, listing.cooked_at, true)}</p>
                        <p className="safety-banner">{safetyNotice}</p>
                      </div>
                    )) : <p>No open listings.</p>}
                  </Popup>
                </Marker>
              );
            })}
            {data.receivers.map((person) => (
              <Marker key={`receiver-${person.id}`} icon={icons.receiver} position={position(person)}
                title={person.name} alt={person.name}>
                <Popup><strong>{person.name}</strong><p>Receiver</p></Popup>
              </Marker>
            ))}
            {donor && receiver && (
              <Polyline positions={[position(donor), position(receiver)]}
                interactive={false} pathOptions={{ color: '#22392B', weight: 3, dashArray: '6 6' }} />
            )}
          </MapContainer>
        </>
      )}
    </section>
  );
}

function pickupCountdown(pickupBy) {
  const minutes = minutesUntil(pickupBy);
  return minutes ? `Pickup in ${minutes} min` : 'Pickup window closed';
}
