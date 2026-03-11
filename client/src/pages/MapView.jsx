import { useState, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl';
import { useAuth } from '../context/AuthContext';
import { getDonors, getRequests } from '../services/api';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export default function MapView() {
  const { user } = useAuth();
  const [donors, setDonors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [popup, setPopup] = useState(null);
  const [viewState, setViewState] = useState({
    longitude: user?.location?.coordinates?.[0] || 77.2090,
    latitude: user?.location?.coordinates?.[1] || 28.6139,
    zoom: 11,
  });

  useEffect(() => {
    if (user?.role === 'hospital') {
      getDonors({ available: 'true' })
        .then((res) => setDonors(res.data.donors))
        .catch(() => {});
    }
    getRequests({ status: 'open' })
      .then((res) => setRequests(res.data.requests))
      .catch(() => getRequests().then((res) => setRequests(res.data.requests)).catch(() => {}));
  }, [user]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="bg-white rounded-xl p-8 text-center">
        <p className="text-gray-500">Map view requires a Mapbox token. Add VITE_MAPBOX_TOKEN to your .env file.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Map View</h1>
      <div className="flex gap-4 mb-4 text-sm">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Donors
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> Requests
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> You
        </span>
      </div>

      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 500 }}>
        <Map
          {...viewState}
          onMove={(e) => setViewState(e.viewState)}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="top-right" />

          {/* Current user location */}
          {user?.location?.coordinates && (
            <Marker
              longitude={user.location.coordinates[0]}
              latitude={user.location.coordinates[1]}
              color="#3b82f6"
            />
          )}

          {/* Donors */}
          {donors.map((donor) => (
            <Marker
              key={donor._id}
              longitude={donor.location?.coordinates?.[0]}
              latitude={donor.location?.coordinates?.[1]}
              color="#22c55e"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopup({
                  type: 'donor',
                  data: donor,
                  lng: donor.location.coordinates[0],
                  lat: donor.location.coordinates[1],
                });
              }}
            />
          ))}

          {/* Requests */}
          {requests.map((req) => (
            <Marker
              key={req._id}
              longitude={req.location?.coordinates?.[0]}
              latitude={req.location?.coordinates?.[1]}
              color="#ef4444"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopup({
                  type: 'request',
                  data: req,
                  lng: req.location.coordinates[0],
                  lat: req.location.coordinates[1],
                });
              }}
            />
          ))}

          {popup && (
            <Popup
              longitude={popup.lng}
              latitude={popup.lat}
              onClose={() => setPopup(null)}
              closeButton
              anchor="bottom"
            >
              {popup.type === 'donor' ? (
                <div className="text-sm">
                  <p className="font-semibold">{popup.data.name}</p>
                  <p>Blood: {popup.data.bloodGroup}</p>
                  <p className={popup.data.isAvailable ? 'text-green-600' : 'text-gray-400'}>
                    {popup.data.isAvailable ? 'Available' : 'Unavailable'}
                  </p>
                </div>
              ) : (
                <div className="text-sm">
                  <p className="font-semibold">Request: {popup.data.bloodGroup}</p>
                  <p>Urgency: {popup.data.urgency}</p>
                  <p>Status: {popup.data.status}</p>
                </div>
              )}
            </Popup>
          )}
        </Map>
      </div>
    </div>
  );
}
